const crypto=require('node:crypto');
const db=require('../config/db');
const {hashPassword,checkPassword}=require('../utils/accountPasswords');
function problem(message,status=400){return Object.assign(Error(message),{status});}
async function matches(password,stored){
 if(typeof stored!=='string')return false;
 if(stored.startsWith('scrypt:'))return checkPassword(password,stored);
 // The installed unified login supports legacy plaintext accounts. A successful
 // change upgrades those accounts to the same salted scrypt format as new ones.
 return crypto.timingSafeEqual(crypto.createHash('sha256').update(password).digest(),crypto.createHash('sha256').update(stored).digest());
}
exports.change=async(req,res)=>{
 let c;
 try{
  const identity=req.portalAccount;
  if(!identity||!['user','staff'].includes(identity.kind))throw problem('Sign in as a PWD member or staff member to change your password.',403);
  const {current_password:current,new_password:password,confirm_password:confirm}=req.body||{};
  if(typeof current!=='string'||!current||current.length>128)throw problem('Enter your current password.');
  if(typeof password!=='string'||password.length<12||password.length>128||!password.trim())throw problem('Use a new password of 12–128 characters.');
  if(typeof confirm!=='string'||password!==confirm)throw problem('New password and confirmation must match.');
  const staff=identity.kind==='staff',kind=staff?'staff':'member',profile=staff?'staffdata':'userdata',login=staff?'stafflogin':'userlogin',username=staff?'staff_username':'acc_username',column=staff?'staff_password':'password';
  c=await db.getConnection();await c.beginTransaction();
  // Match the admin account-management lock order, so resets and self-changes
  // serialize on the same profile record. Request body IDs/usernames are ignored.
  const [profiles]=await c.execute(`SELECT id${staff?',account_status':''} FROM ${profile} WHERE BINARY ${username}=? FOR UPDATE`,[identity.username]);
  if(profiles.length!==1||(staff&&profiles[0].account_status!=='Active'))throw problem('Account is unavailable. Sign in again or contact the office.',401);
  const recordId=profiles[0].id;
  const [states]=await c.execute('SELECT account_status,must_change_password,session_version FROM admin_account_controls WHERE account_kind=? AND record_id=? FOR UPDATE',[kind,recordId]);
  const state=states[0]||{account_status:'Active',must_change_password:0,session_version:0};
  if(state.account_status!=='Active'||Number(state.must_change_password)||Number(state.session_version)!==Number(identity.version??0))throw problem('Account access changed. Sign in again before changing your password.',401);
  const [rows]=await c.execute(`SELECT ${column} AS password FROM ${login} WHERE BINARY ${username}=? FOR UPDATE`,[identity.username]);
  if(rows.length!==1)throw problem('Login record is unavailable. Contact the office.',409);
  if(!await matches(current,rows[0].password))throw problem('Current password is incorrect.',401);
  if(await matches(password,rows[0].password))throw problem('Choose a new password different from your current password.');
  const hash=await hashPassword(password);
  await c.execute(`UPDATE ${login} SET ${column}=? WHERE BINARY ${username}=?`,[hash,identity.username]);
  if(!staff)await c.execute('UPDATE pending_accounts SET password_hash=? WHERE BINARY username=? AND approval_status=?',[hash,identity.username,'Approved']);
  // Missing legacy control rows must also acquire a version. NULL changed_by
  // means self-service; no administrator is falsely named as the actor.
  await c.execute(`INSERT INTO admin_account_controls(account_kind,record_id,account_status,must_change_password,session_version,changed_at,changed_by)
   VALUES(?,?,'Active',0,1,UTC_TIMESTAMP(),NULL) ON DUPLICATE KEY UPDATE session_version=session_version+1,changed_at=UTC_TIMESTAMP(),changed_by=NULL`,[kind,recordId]);
  await c.execute(`INSERT INTO account_password_events(account_kind,record_id,username,action,occurred_at) VALUES(?,?,?,'self_password_changed',UTC_TIMESTAMP())`,[kind,recordId,identity.username]);
  await c.commit();
  return res.json({success:true,reauthenticate:true,message:'Password changed successfully. All previous sessions have ended. Sign in again with your new password.'});
 }catch(e){if(c)try{await c.rollback();}catch{}console.error('Account password settings:',e.status?'request rejected':e.code||'database failure');return res.status(e.status||503).json({success:false,message:e.status?e.message:'Unable to change your password. Check the password-settings SQL installation and try again.'});}finally{c?.release();}
};
