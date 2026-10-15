const db=require('../config/db');
const {verifyPortalToken}=require('./portalToken');
const {verifyApplicant}=require('./applicantToken');
const {verifyAdmin}=require('./adminAccessToken');
const {verifyChange}=require('./passwordChangeToken');
const clean=(value,length)=>typeof value==='string'?value.replace(/[\u0000-\u001f\u007f]/g,' ').slice(0,length):null;
async function initialize(){
 const [rows]=await db.execute('SELECT id FROM portal_audit_tracking WHERE id=1');if(!rows.length)throw Error('Audit migration is not installed.');
 await db.execute('SELECT id,actor_kind,actor_id,actor_username,actor_name,category,action,target_type,target_ref,outcome,http_status,details,occurred_at FROM portal_audit_events LIMIT 0');
 // Start at the next whole second; old event tables have second precision.
 await db.execute('UPDATE portal_audit_tracking SET started_at=COALESCE(started_at,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 1 SECOND)) WHERE id=1');
 await new Promise(resolve=>setTimeout(resolve,2000));
}
function identity(req,res,payload){
 if(res.locals.auditActor)return res.locals.auditActor;
 if(req.portalAccount)return req.portalAccount;
 if(req.applicant)return {kind:'applicant',id:req.applicant.id,username:req.applicant.username};
 if(payload?.success&&payload.token){try{
  if(payload.accountType==='admin')return {...verifyAdmin(payload.token),kind:'admin',username:payload.admin?.username};
  if(payload.accountType==='applicant')return {...verifyApplicant(payload.token),kind:'applicant',username:payload.user?.username};
  if(payload.accountType==='password_change')return verifyChange(payload.token);
  if(['member','staff'].includes(payload.accountType))return verifyPortalToken(payload.token);
 }catch{}}
 return {kind:'anonymous'};
}
async function actor(identity){
 const kind=identity.kind==='user'?'member':identity.kind;
 if(kind==='anonymous'||!['admin','staff','member','applicant'].includes(kind))return {kind:'anonymous',id:null,username:null,name:'Anonymous'};
 const config={admin:['adminlogin','username'],applicant:['pending_accounts','username'],staff:['staffdata','staff_username'],member:['userdata','acc_username']}[kind];
 const byId=['admin','applicant'].includes(kind)&&Number.isSafeInteger(Number(identity.id))&&Number(identity.id)>0;
 const full=['admin','applicant'].includes(kind)?config[1]:"TRIM(CONCAT_WS(' ',first_name,middle_name,last_name))";
 const [rows]=await db.execute(`SELECT id,${config[1]} AS username,${full} AS name FROM ${config[0]} WHERE ${byId?'id=?':`BINARY ${config[1]}=?`} LIMIT 1`,[byId?identity.id:identity.username]);
 const row=rows[0];return {kind,id:row?.id||(byId?Number(identity.id):null),username:clean(row?.username||identity.username,60),name:clean(row?.name||row?.username||identity.username||'Not recorded',255)};
}
async function record(req,res,payload,event){
 const who=await actor(identity(req,res,payload));
 const ids=Object.entries(req.params||{}).filter(([key,value])=>/id$/i.test(key)&&/^[1-9]\d{0,17}$/.test(String(value))).map(([key,value])=>key+':'+value);
 for(const key of ['id','requestId','request_id','applicationId','alertId','eventId']){const value=payload?.[key];if(/^[1-9]\d{0,17}$/.test(String(value))&&!ids.includes(key+':'+value))ids.push(key+':'+value);}
 for(const key of ['announcement','conversation']){const value=payload?.[key]?.id;if(/^[1-9]\d{0,17}$/.test(String(value)))ids.push(key+'_id:'+value);}
 if(!ids.length&&who.id&&['Account','Applicant account','Profile','Member email'].includes(event.target))ids.push(who.kind+':'+who.id);
 if(ids.length&&['member','staff'].includes(req.params?.kind))ids.unshift(req.params.kind);
 const fields=['first_name','middle_name','last_name','birthday','sex','age','contact_numb','email','occupation','province','municipality','baranggay','street','house_number','disability','blood_type','civil_status','pwd_id','expired_date','profile_pic','is_pwd','staff_since','account_status','managed_status','status'];
 const changed=fields.filter(key=>Object.hasOwn(req.body||{},key)||Object.hasOwn(req.body?.profile||{},key));
 const status=['Pending','Under Review','Approved','Rejected','Resolved','Active','Inactive','Archived','ChangesRequested','Published','Hidden'].includes(req.body?.status||req.body?.decision)?(req.body.status||req.body.decision):null;
 const controlAction=['activate','deactivate','archive','restore'].includes(req.body?.action)?req.body.action:null;
 const detail=[req.method+' request',event.category==='Settings'&&Number.isSafeInteger(payload?.count)&&payload.count>=0&&payload.count<=500?'Records: '+payload.count:null,changed.length?'Fields: '+changed.join(', '):null,status?'Requested status/decision: '+status:null,controlAction?'Requested access action: '+controlAction:null,res.locals.auditCommitted?'Account created before email delivery':null,res.locals.auditAborted?'Response stream interrupted':null].filter(Boolean).join(' · ').slice(0,500);
 const outcome=res.statusCode>=200&&res.statusCode<400&&payload?.success!==false?'Success':res.locals.auditCommitted?'Partial':'Failed';
 const action=res.locals.auditCommitted?'account_created':event.action==='login'&&payload?.accountType==='password_change'?'login_password_change_required':event.action;
 await db.execute('INSERT INTO portal_audit_events(actor_kind,actor_id,actor_username,actor_name,category,action,target_type,target_ref,outcome,http_status,details,occurred_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP())',[who.kind,who.id,who.username,who.name,event.category,action,event.target,ids.join(' · ').slice(0,128)||'—',outcome,res.statusCode,detail]);
}
module.exports={initialize,identity,record};
