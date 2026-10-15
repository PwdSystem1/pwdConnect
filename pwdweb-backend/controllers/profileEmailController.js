const db=require('../config/db'),email=require('../utils/profileEmail');
function fail(res,e){console.error('Profile email:',e.status?'request rejected':e.code||'failure');return res.status(e.status||(e.code==='ER_DUP_ENTRY'?409:503)).json({success:false,message:e.status?e.message:e.code==='ER_DUP_ENTRY'?'This email is already linked to another account.':'Unable to link your email. Check the profile-email migration and try again.'});}
async function rollback(c){if(c)try{await c.rollback();}catch{}}
exports.request=async(req,res)=>{let c;try{
 c=await db.getConnection();await c.beginTransaction();const [members]=await c.execute('SELECT id,acc_username,email FROM userdata WHERE BINARY acc_username=? FOR UPDATE',[req.portalAccount.username]);if(members.length!==1)throw email.problem('Member record unavailable.',409);
 const packet=await email.stage(c,members[0],req.body?.email);await c.commit();c.release();c=null;
 const sent=await email.send(packet);return res.json({success:true,sent,message:sent?'Verification link sent. Your recorded email changes only after confirmation.':'Verification is pending, but the email could not be sent. Check SMTP and use Resend verification.'});
 }catch(e){await rollback(c);return fail(res,e);}finally{c?.release();}};
exports.cancel=async(req,res)=>{let c;try{c=await db.getConnection();await c.beginTransaction();const [members]=await c.execute('SELECT id FROM userdata WHERE BINARY acc_username=? FOR UPDATE',[req.portalAccount.username]);if(members.length!==1)throw email.problem('Member record unavailable.',409);await c.execute('DELETE FROM profile_email_requests WHERE member_id=?',[members[0].id]);await c.commit();return res.json({success:true,message:'Pending email change cancelled. Your recorded email is unchanged.'});}catch(e){await rollback(c);return fail(res,e);}finally{c?.release();}};
exports.verify=async(req,res)=>{let c;try{
 const token=req.body?.token;if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token))throw email.problem('Open a valid email verification link.');
 // Find member before locking; all operations then lock profile → control → request.
 const [lookup]=await db.execute('SELECT member_id FROM profile_email_requests WHERE token_hash=?',[email.digest(token)]);if(lookup.length!==1)throw email.problem('This link is expired, replaced, cancelled, or already used. Request a new link from your Profile.');
 c=await db.getConnection();await c.beginTransaction();const [members]=await c.execute('SELECT id,acc_username,email FROM userdata WHERE id=? FOR UPDATE',[lookup[0].member_id]);if(members.length!==1)throw email.problem('Member account no longer exists.',404);const member=members[0];
 const [controls]=await c.execute('SELECT account_status FROM admin_account_controls WHERE account_kind=\'member\' AND record_id=? FOR UPDATE',[member.id]);if(controls.length&&controls[0].account_status!=='Active')throw email.problem('Account is inactive. Contact the office before linking email.',403);
 const [logins]=await c.execute(`SELECT ul.acc_username FROM userlogin ul LEFT JOIN pending_accounts pa ON pa.username=ul.acc_username WHERE BINARY ul.acc_username=? AND (pa.id IS NULL OR (pa.approval_status='Approved' AND pa.email_verified_at IS NOT NULL AND EXISTS(SELECT 1 FROM membership_applications ma WHERE ma.account_id=pa.id AND ma.member_id=? AND ma.status='Approved'))) `,[member.acc_username,member.id]);if(logins.length!==1)throw email.problem('Account login is unavailable.',409);
 const [requests]=await c.execute('SELECT pending_email,username FROM profile_email_requests WHERE member_id=? AND token_hash=? AND expires_at>UTC_TIMESTAMP() FOR UPDATE',[member.id,email.digest(token)]);if(requests.length!==1||requests[0].username!==member.acc_username)throw email.problem('This link is expired, replaced, cancelled, or already used. Request another from Profile.');
 const address=requests[0].pending_email;await email.available(c,address,member);
 // Scope updates to this member. A concurrent claim on the unique email must
 // fail, never update the other member through an ON DUPLICATE KEY clause.
 await c.execute('DELETE FROM profile_email_links WHERE member_id=?',[member.id]);
 await c.execute('INSERT INTO profile_email_links(member_id,email,verified_at) VALUES(?,?,UTC_TIMESTAMP())',[member.id,address]);
 await c.execute('UPDATE userdata SET email=? WHERE id=?',[address,member.id]);await c.execute('UPDATE pending_accounts SET email=? WHERE BINARY username=? AND approval_status=\'Approved\'',[address,member.acc_username]);
 await c.execute('DELETE FROM profile_email_requests WHERE member_id=?',[member.id]);await c.commit();res.locals.auditActor={kind:'user',id:member.id,username:member.acc_username};return res.json({success:true,message:'Email confirmed and linked to your existing account. Return to your Profile or sign in to see the updated email.'});
 }catch(e){await rollback(c);return fail(res,e);}finally{c?.release();}};
