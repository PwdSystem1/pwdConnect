const crypto=require('node:crypto'),nodemailer=require('../utils/emailTransport'),db=require('../config/db');
const {emailSettings}=require('../utils/registrationEmail');
const {hashPassword}=require('../utils/accountPasswords');
const digest=value=>crypto.createHash('sha256').update(value).digest('hex');
const generic='If an eligible account uses this verified email, a password reset link will be sent. Check your inbox and spam folder. Wait one minute before trying again.';
const invalid=()=>Object.assign(Error('This reset link is expired, replaced, or unavailable. Request a new link.'),{status:400});
async function rollback(c){if(c)try{await c.rollback();}catch{}}
// Lock in the same order used by account management and profile password changes.
async function identity(c,kind,id,address){
 if(kind==='member'){
  const [profiles]=await c.execute('SELECT id,acc_username,email FROM userdata WHERE id=? FOR UPDATE',[id]);const p=profiles[0];if(!p||String(p.email||'').trim().toLowerCase()!==address)throw invalid();
  const [controls]=await c.execute("SELECT account_status,session_version FROM admin_account_controls WHERE account_kind='member' AND record_id=? FOR UPDATE",[id]);const state=controls[0]||{account_status:'Active',session_version:0};if(state.account_status!=='Active')throw invalid();
  const [linked]=await c.execute('SELECT email FROM profile_email_links WHERE member_id=? AND email=?',[id,address]);if(linked.length!==1)throw invalid();
  const [login]=await c.execute('SELECT password FROM userlogin WHERE BINARY acc_username=? FOR UPDATE',[p.acc_username]);if(login.length!==1)throw invalid();
  const [pending]=await c.execute('SELECT id,approval_status,email_verified_at FROM pending_accounts WHERE LOWER(TRIM(username))=LOWER(?)',[p.acc_username]);if(pending.length>1)throw invalid();if(pending.length){if(pending[0].approval_status!=='Approved'||!pending[0].email_verified_at)throw invalid();const [approved]=await c.execute("SELECT id FROM membership_applications WHERE account_id=? AND member_id=? AND status='Approved'",[pending[0].id,id]);if(!approved.length)throw invalid();}
  return {username:p.acc_username,version:Number(state.session_version),credential:login[0].password};
 }
 const [accounts]=await c.execute('SELECT id,username,email,password_hash,approval_status,email_verified_at FROM pending_accounts WHERE id=? FOR UPDATE',[id]);const p=accounts[0];if(!p||p.approval_status==='Approved'||!p.email_verified_at||String(p.email).trim().toLowerCase()!==address)throw invalid();
 const [controls]=await c.execute('SELECT access_status,session_version FROM pending_account_controls WHERE account_id=? FOR UPDATE',[id]);const state=controls[0]||{access_status:'Active',session_version:0};if(state.access_status!=='Active')throw invalid();
 const [members]=await c.execute('SELECT id FROM userlogin WHERE LOWER(TRIM(acc_username))=LOWER(?)',[p.username]);if(members.length)throw invalid();
 return {username:p.username,version:Number(state.session_version),credential:p.password_hash};
}
async function unambiguous(c,username){const [other]=await c.execute('SELECT id FROM stafflogin WHERE LOWER(TRIM(staff_username))=LOWER(?) UNION ALL SELECT id FROM adminlogin WHERE LOWER(TRIM(username))=LOWER(?)',[username,username]);if(other.length)throw invalid();}
exports.request=async(req,res)=>{let c,packet;try{
 const address=typeof req.body?.email==='string'?req.body.email.trim().toLowerCase():'';if(address.length>254||! /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/.test(address))return res.status(400).json({success:false,message:'Enter a valid email address.'});
 const settings=emailSettings();
 const [candidates]=await db.execute("SELECT 'member' AS kind,u.id FROM profile_email_links l JOIN userdata u ON u.id=l.member_id WHERE l.email=? AND LOWER(TRIM(u.email))=? UNION ALL SELECT 'applicant' AS kind,id FROM pending_accounts WHERE LOWER(TRIM(email))=? AND email_verified_at IS NOT NULL AND approval_status<>'Approved'",[address,address,address]);
 if(candidates.length!==1)return res.json({success:true,message:generic});
 const account=candidates[0];c=await db.getConnection();await c.beginTransaction();const owner=await identity(c,account.kind,account.id,address);await unambiguous(c,owner.username);
 const [recent]=await c.execute('SELECT record_id FROM account_password_resets WHERE account_kind=? AND record_id=? AND created_at>DATE_SUB(UTC_TIMESTAMP(),INTERVAL 60 SECOND)',[account.kind,account.id]);if(recent.length){await c.rollback();return res.json({success:true,message:generic});}
 const token=crypto.randomBytes(32).toString('hex'),hash=digest(token);
 await c.execute('INSERT INTO account_password_resets(account_kind,record_id,username,email,session_version,credential_hash,token_hash,expires_at,created_at) VALUES(?,?,?,?,?,?,?,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 30 MINUTE),UTC_TIMESTAMP()) ON DUPLICATE KEY UPDATE username=VALUES(username),email=VALUES(email),session_version=VALUES(session_version),credential_hash=VALUES(credential_hash),token_hash=VALUES(token_hash),expires_at=VALUES(expires_at),created_at=VALUES(created_at)',[account.kind,account.id,owner.username,address,owner.version,digest(owner.credential),hash]);
 await c.commit();c.release();c=null;packet={kind:account.kind,id:account.id,hash};
 const link=settings.base+'/reset-password#token='+token;
 const sent=await nodemailer.createTransport(settings.options).sendMail({from:settings.from,to:address,subject:'Reset your PWDConnect password',text:`A password reset was requested for your PWDConnect account.\n\n${link}\n\nOpen this link and enter your new password. The link expires in 30 minutes and is used once. If you did not request this, ignore this email. Your password stays unchanged until you complete the reset.`});if(!sent.accepted?.length)throw Error('EMAIL_SEND');
 return res.json({success:true,message:generic});
 }catch(e){await rollback(c);if(packet)try{await db.execute('DELETE FROM account_password_resets WHERE account_kind=? AND record_id=? AND token_hash=?',[packet.kind,packet.id,packet.hash]);}catch{}console.error('Password recovery request:',e.status?'ineligible account':e.code||'delivery/configuration failure');if(e.status)return res.json({success:true,message:generic});return res.status(503).json({success:false,message:'Password recovery is temporarily unavailable. Try again later or contact the office.'});}finally{c?.release();}};
exports.reset=async(req,res)=>{let c;try{
 const {token,new_password:password,confirm_password:confirm}=req.body||{};if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token))throw invalid();if(typeof password!=='string'||password.length<12||password.length>128||!password.trim())return res.status(400).json({success:false,message:'Use a password of 12–128 characters.'});if(password!==confirm)return res.status(400).json({success:false,message:'New password and confirmation must match.'});
 const hash=digest(token);const [found]=await db.execute('SELECT account_kind,record_id,email FROM account_password_resets WHERE token_hash=?',[hash]);if(found.length!==1)throw invalid();const reset=found[0];
 c=await db.getConnection();await c.beginTransaction();const owner=await identity(c,reset.account_kind,reset.record_id,reset.email);await unambiguous(c,owner.username);
 const [requests]=await c.execute('SELECT username,session_version,credential_hash FROM account_password_resets WHERE account_kind=? AND record_id=? AND token_hash=? AND expires_at>UTC_TIMESTAMP() FOR UPDATE',[reset.account_kind,reset.record_id,hash]);const request=requests[0];if(!request||request.username!==owner.username||Number(request.session_version)!==owner.version||request.credential_hash!==digest(owner.credential))throw invalid();
 const passwordHash=await hashPassword(password);
 if(reset.account_kind==='member'){
  await c.execute('UPDATE userlogin SET password=? WHERE BINARY acc_username=?',[passwordHash,owner.username]);await c.execute("UPDATE pending_accounts SET password_hash=? WHERE BINARY username=? AND approval_status='Approved'",[passwordHash,owner.username]);
  await c.execute("INSERT INTO admin_account_controls(account_kind,record_id,account_status,must_change_password,session_version,changed_at,changed_by) VALUES('member',?,'Active',0,1,UTC_TIMESTAMP(),NULL) ON DUPLICATE KEY UPDATE must_change_password=0,session_version=session_version+1,changed_at=UTC_TIMESTAMP(),changed_by=NULL",[reset.record_id]);
 }else{
  await c.execute('UPDATE pending_accounts SET password_hash=? WHERE id=?',[passwordHash,reset.record_id]);await c.execute("INSERT INTO pending_account_controls(account_id,access_status,session_version,changed_at,changed_by) VALUES(?,'Active',1,UTC_TIMESTAMP(),NULL) ON DUPLICATE KEY UPDATE session_version=session_version+1,changed_at=UTC_TIMESTAMP(),changed_by=NULL",[reset.record_id]);
 }
 await c.execute("INSERT INTO account_password_events(account_kind,record_id,username,action,occurred_at) VALUES(?,?,?,'email_password_reset',UTC_TIMESTAMP())",[reset.account_kind,reset.record_id,owner.username]);
 await c.execute('DELETE FROM account_password_resets WHERE account_kind=? AND record_id=?',[reset.account_kind,reset.record_id]);await c.commit();res.locals.auditActor={kind:reset.account_kind,id:reset.record_id,username:owner.username};return res.json({success:true,message:'Password reset successfully. Sign in with your new password. Previous sessions have ended.'});
 }catch(e){await rollback(c);console.error('Password recovery reset:',e.status?'invalid reset link':e.code||'database failure');return res.status(e.status||503).json({success:false,message:e.status?e.message:'Unable to reset your password. Try again later.'});}finally{c?.release();}};
