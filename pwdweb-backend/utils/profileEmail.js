const crypto=require('node:crypto'),db=require('../config/db');
const nodemailer=require('./emailTransport');
const {emailSettings}=require('./registrationEmail');
const normalize=value=>String(value||'').trim().toLowerCase();
const digest=token=>crypto.createHash('sha256').update(token).digest('hex');
function problem(message,status=400){return Object.assign(Error(message),{status});}
async function status(connection,member){
 const [links]=await connection.execute(`SELECT email,DATE_FORMAT(verified_at,'%Y-%m-%d %H:%i:%s') AS verified_at FROM profile_email_links WHERE member_id=?`,[member.id]);
 const [requests]=await connection.execute(`SELECT pending_email,DATE_FORMAT(expires_at,'%Y-%m-%d %H:%i:%s') AS expires_at,(expires_at>UTC_TIMESTAMP()) AS valid,last_sent_at IS NOT NULL AS sent FROM profile_email_requests WHERE member_id=?`,[member.id]);
 const linked=links[0]&&links[0].email===normalize(member.email);
 return {linked:Boolean(linked),verified_email:linked?links[0].email:null,verified_at:linked?links[0].verified_at:null,pending:requests[0]||null};
}
async function available(connection,email,member){
 const [used]=await connection.execute(`SELECT id FROM userdata WHERE LOWER(TRIM(email))=? AND id<>? UNION ALL SELECT member_id FROM profile_email_links WHERE email=? AND member_id<>? UNION ALL SELECT id FROM pending_accounts WHERE LOWER(TRIM(email))=? AND BINARY username<>?`,[email,member.id,email,member.id,email,member.acc_username]);
 if(used.length)throw problem('This email is recorded for another account. Use a different email or ask the LGU to review the record.',409);
}
async function stage(connection,member,value){
 const email=normalize(value);
 if(email.length>254||! /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/.test(email))throw problem('Enter a valid email address.');
 const [pending]=await connection.execute('SELECT member_id FROM profile_email_requests WHERE member_id=? AND last_sent_at>DATE_SUB(UTC_TIMESTAMP(),INTERVAL 60 SECOND)',[member.id]);
 if(pending.length)throw problem('Wait at least one minute before requesting another verification email.',429);
 try{emailSettings();}catch{throw problem('Email verification is not configured. Ask the office to configure email delivery before linking your email.',503);}
 await available(connection,email,member);
 const token=crypto.randomBytes(32).toString('hex'),hash=digest(token);
 await connection.execute(`INSERT INTO profile_email_requests(member_id,username,pending_email,token_hash,expires_at,last_sent_at,created_at) VALUES(?,?,?,?,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 1 HOUR),UTC_TIMESTAMP(),UTC_TIMESTAMP()) ON DUPLICATE KEY UPDATE username=VALUES(username),pending_email=VALUES(pending_email),token_hash=VALUES(token_hash),expires_at=VALUES(expires_at),last_sent_at=VALUES(last_sent_at),created_at=VALUES(created_at)`,[member.id,member.acc_username,email,hash]);
 return {memberId:member.id,email,token,hash};
}
async function send(packet){
 try{const settings=emailSettings(),link=settings.base+'/link-email#token='+packet.token,transport=nodemailer.createTransport(settings.options);const result=await transport.sendMail({from:settings.from,to:packet.email,subject:'Link your email to PWDConnect',text:`Confirm this email for your existing PWDConnect account:\n${link}\n\nSelect Confirm email on the page. This link expires in one hour and is used once. It does not create an account, approve membership, or change your password. If you did not request this, ignore it.`});if(!result.accepted?.length)throw Error('EMAIL_SEND');return true;}
 catch{await db.execute('UPDATE profile_email_requests SET last_sent_at=NULL WHERE member_id=? AND token_hash=?',[packet.memberId,packet.hash]);return false;}
}
module.exports={normalize,digest,problem,status,available,stage,send};
