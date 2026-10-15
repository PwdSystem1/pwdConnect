const queue=require('../utils/membershipQueue');
const formValidation=require('../utils/workflowValidation');
const {pendingControl}=require('../utils/pendingAccountControl');
const {control}=require('../utils/accountControl');
const db=require('../config/db');
const v=require('../utils/membershipValidation');
const {ACCOUNT_SELECT,APPLICATION_SELECT,serialize}=require('../utils/verificationWorkflow');
const {signPortalToken}=require('../utils/portalToken');
function failure(res,error){console.error('Verification center:',error.code||error.message);return res.status(error.status||(error.code==='ER_DUP_ENTRY'?409:503)).json({success:false,message:error.status?error.message:'Unable to complete the request. Refresh and check the workflow migration if this continues.'});}
async function rollback(connection){if(connection)try{await connection.rollback();}catch(error){console.error('Verification rollback:',error.code);}}
exports.session=async(req,res)=>{try{
 const [accounts]=await db.execute(ACCOUNT_SELECT+' WHERE id=?',[req.applicant.id]);
 const [applications]=await db.execute(APPLICATION_SELECT+' WHERE account_id=?',[req.applicant.id]);
 const [history]=await db.execute(`SELECT action,notes,application_kind,DATE_FORMAT(created_at,'%Y-%m-%d %H:%i:%s') AS created_at FROM membership_application_events WHERE account_id=? ORDER BY id DESC LIMIT 30`,[req.applicant.id]);
 const [reviews]=await db.execute("SELECT stage,revision,notes,DATE_FORMAT(appointment_at,'%Y-%m-%dT%H:%i:%sZ') AS appointment_at,appointment_venue,email_status,official_pwd_id,DATE_FORMAT(official_expiry,'%Y-%m-%d') AS official_expiry,id_form_json FROM staff_application_reviews WHERE application_id=?",[applications[0]?.id||0]);
 const [events]=await db.execute("SELECT actor_kind,actor_username,action,notes,DATE_FORMAT(occurred_at,'%Y-%m-%dT%H:%i:%sZ') AS occurred_at FROM membership_workflow_events WHERE application_id=? ORDER BY id DESC LIMIT 100",[applications[0]?.id||0]);const review=reviews[0];return res.json({success:true,account:serialize(accounts[0]),application:serialize(applications[0]),history,workflowHistory:events,staffReview:review?{...review,idForm:review.id_form_json?JSON.parse(review.id_form_json):null,id_form_json:undefined}:null});
}catch(error){return failure(res,error);}};
exports.saveProfile=async(req,res)=>{let connection;try{
 const version=v.revision(req.body?.revision),profile=v.profile(req.body?.profile,true);
 connection=await db.getConnection();await connection.beginTransaction();
 const [accounts]=await connection.execute(ACCOUNT_SELECT+' WHERE id=? FOR UPDATE',[req.applicant.id]);const account=accounts[0];const access=await pendingControl(req.applicant.id,connection);if(access.access_status!=='Active')throw v.problem('Your account access is inactive or archived.',403);
 if(!account?.email_verified_at||account.approval_status!=='Pending')throw v.problem('This profile is no longer editable in the verification center.',409);
 if(account.profile_revision!==version)throw v.problem('Your profile changed in another tab. Reload before saving.',409);
 const [applications]=await connection.execute(APPLICATION_SELECT+' WHERE account_id=? FOR UPDATE',[account.id]);
 if(applications[0]?.status==='Submitted')throw v.problem('Personal information is locked while the request is under review. Wait for a decision or request for changes.',409);
 await connection.execute('UPDATE pending_accounts SET profile_json=?,profile_revision=profile_revision+1,profile_completed_at=COALESCE(profile_completed_at,UTC_TIMESTAMP()) WHERE id=?',[JSON.stringify(profile),account.id]);
 await connection.commit();return res.json({success:true,message:'Personal information saved. Your account is complete but remains unverified.'});
}catch(error){await rollback(connection);return failure(res,error);}finally{connection?.release();}};
exports.submitApplication=async(req,res)=>{let connection;try{
 const version=v.revision(req.body?.revision),profileVersion=v.revision(req.body?.profile_revision),kind=req.body?.application_kind;
 if(!['ExistingPWD','NewID'].includes(kind))throw v.problem('Select existing-record verification or a new ID application.');
 const claimed=kind==='ExistingPWD'&&typeof req.body.claimed_pwd_id==='string'?req.body.claimed_pwd_id.trim():'';
 if(kind==='ExistingPWD'&&(!claimed||Array.from(claimed).length>50))throw v.problem('Enter your PWD ID number, up to 50 characters.');
 connection=await db.getConnection();await connection.beginTransaction();
 const [accounts]=await connection.execute(ACCOUNT_SELECT+' WHERE id=? FOR UPDATE',[req.applicant.id]);const account=accounts[0];const access=await pendingControl(req.applicant.id,connection);if(access.access_status!=='Active')throw v.problem('Your account access is inactive or archived.',403);
 if(!account?.email_verified_at||!account.profile_completed_at||account.approval_status!=='Pending')throw v.problem('Complete your personal information before submitting a verification or ID application.',409);
 if(account.profile_revision!==profileVersion)throw v.problem('Your profile changed. Reload and review it before submitting.',409);
 const profile=v.profile(JSON.parse(account.profile_json),true);
 const idForm=kind==='NewID'?formValidation.idForm(req.body?.id_form,profile):null;
 const [rows]=await connection.execute(APPLICATION_SELECT+' WHERE account_id=? FOR UPDATE',[account.id]);const current=rows[0];
 if(version!==(current?.revision||0))throw v.problem('Your request changed in another tab. Refresh before submitting.',409);
 if(current&&!['Draft','ChangesRequested'].includes(current.status))throw v.problem('A request is already under review or finalized. You cannot submit another request.',409);
 let applicationId;
 if(!current){const [result]=await connection.execute("INSERT INTO membership_applications(account_id,status,revision,application_kind,claimed_pwd_id,profile_json,review_notes,submitted_at,created_at,updated_at) VALUES(?,'Submitted',1,?,?,?,'',UTC_TIMESTAMP(),UTC_TIMESTAMP(),UTC_TIMESTAMP())",[account.id,kind,claimed||null,JSON.stringify(profile)]);applicationId=result.insertId;}
 else{applicationId=current.id;await connection.execute("UPDATE membership_applications SET status='Submitted',revision=revision+1,application_kind=?,claimed_pwd_id=?,profile_json=?,submitted_at=UTC_TIMESTAMP(),updated_at=UTC_TIMESTAMP() WHERE id=?",[kind,claimed||null,JSON.stringify(profile),current.id]);}
 await connection.execute("INSERT INTO staff_application_reviews(application_id,stage,revision,id_form_json,updated_at) VALUES(?,'Submitted',1,?,UTC_TIMESTAMP()) ON DUPLICATE KEY UPDATE stage='Submitted',revision=revision+1,id_form_json=VALUES(id_form_json),notes='',appointment_at=NULL,appointment_venue=NULL,assessment_at=NULL,physician_name=NULL,physician_license=NULL,assessment_outcome=NULL,official_disability=NULL,official_pwd_id=NULL,official_expiry=NULL,email_status='NotSent',updated_at=UTC_TIMESTAMP()",[applicationId,idForm?JSON.stringify(idForm):null]);
 await queue.event(connection,{applicationId,kind:'applicant',username:req.applicant.username,action:'ApplicationSubmitted',notes:kind==='ExistingPWD'?'Existing-record verification sent to staff.':'ID form submitted for staff review and municipal physician scheduling.'});
 const notes=kind==='ExistingPWD'?'Existing PWD record verification requested. Staff review required before administrator membership approval.':'New PWD ID application submitted. Staff review required before administrator membership approval.';
 await connection.execute("INSERT INTO membership_application_events(application_id,account_id,action,notes,application_kind,claimed_pwd_id,profile_snapshot,created_at) VALUES(?,?,'Submitted',?,?,?,?,UTC_TIMESTAMP())",[applicationId,account.id,notes,kind,claimed||null,JSON.stringify(profile)]);
 await connection.commit();return res.json({success:true,applicationId,message:notes});
}catch(error){await rollback(connection);return failure(res,error);}finally{connection?.release();}};
exports.enterMemberPortal=async(req,res)=>{try{
 const [rows]=await db.execute(`SELECT ud.acc_username,ud.first_name,ud.middle_name,ud.last_name,ud.pwd_id FROM pending_accounts pa JOIN membership_applications ma ON ma.account_id=pa.id AND ma.status='Approved' JOIN userdata ud ON ud.id=ma.member_id AND ud.acc_username=pa.username JOIN userlogin ul ON ul.acc_username=ud.acc_username WHERE pa.id=? AND pa.approval_status='Approved' LIMIT 2`,[req.applicant.id]);
 if(rows.length!==1)throw v.problem('Administrator verification is required before entering the user dashboard.',403);
 const state=await control('user',rows[0].acc_username);if(!state||state.managed_status!=='Active'||Number(state.must_change_password))throw v.problem('Account access changed. Sign in through Portal access to continue.',403);
 return res.json({success:true,user:rows[0],token:signPortalToken('user',rows[0].acc_username,Number(state.session_version))});
}catch(error){return failure(res,error);}};
