const {validUsername}=require('../utils/usernamePolicy');
const {pendingControl}=require('../utils/pendingAccountControl');
const crypto=require('node:crypto');
const db=require('../config/db');
const {hashPassword}=require('../utils/accountPasswords');
const {emailSettings,sendVerification}=require('../utils/registrationEmail');
const digest=token=>crypto.createHash('sha256').update(token).digest('hex');
function fields(body){const username=typeof body?.username==='string'?body.username.trim():'';const email=typeof body?.email==='string'?body.email.trim().toLowerCase():'';const password=body?.password;if(!validUsername(username)||email.length>254||! /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/.test(email)||typeof password!=='string'||password.length<12||password.length>128)throw Error('VALIDATION');return{username,email,password};}
function failure(res,error){if(error.message==='EMAIL_CONFIG')return res.status(503).json({success:false,message:'Email verification is not configured yet. Please contact the office or try again later.'});if(['ER_DUP_ENTRY','ER_SIGNAL_EXCEPTION'].includes(error.code))return res.status(409).json({success:false,message:'This username or email is already registered. Use Resend verification if needed.'});console.error('Account registration:',error.code||error.message);return res.status(503).json({success:false,message:'Unable to complete the request. If your account was created, use Resend verification to try again.'});}
exports.register=async(req,res)=>{let value;try{value=fields(req.body);}catch{return res.status(400).json({success:false,message:'Use a username of 3–50 characters; letters, numbers, spaces and symbols are allowed (no control characters), a valid email, and a password of 12–128 characters.'});}try{
 emailSettings();const [existing]=await db.execute('SELECT acc_username AS username FROM userlogin WHERE LOWER(TRIM(acc_username))=LOWER(?) UNION ALL SELECT staff_username FROM stafflogin WHERE LOWER(TRIM(staff_username))=LOWER(?) UNION ALL SELECT username FROM adminlogin WHERE LOWER(TRIM(username))=LOWER(?) UNION ALL SELECT acc_username FROM userdata WHERE LOWER(TRIM(acc_username))=LOWER(?) UNION ALL SELECT staff_username FROM staffdata WHERE LOWER(TRIM(staff_username))=LOWER(?) UNION ALL SELECT username FROM pending_accounts WHERE LOWER(TRIM(username))=LOWER(?)',Array(6).fill(value.username));if(existing.length)return res.status(409).json({success:false,message:'This username is already registered.'});
 const passwordHash=await hashPassword(value.password),token=crypto.randomBytes(32).toString('hex'),tokenHash=digest(token);
 const [created]=await db.execute("INSERT INTO pending_accounts(username,email,password_hash,verification_token_hash,verification_expires_at,last_verification_sent_at,created_at) VALUES(?,?,?,?,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 1 HOUR),UTC_TIMESTAMP(),UTC_TIMESTAMP())",[value.username,value.email,passwordHash,tokenHash]);
 res.locals.auditActor={kind:'applicant',id:created.insertId,username:value.username};res.locals.auditCommitted=true;
 try{await sendVerification(value.email,token);}catch(error){await db.execute('UPDATE pending_accounts SET last_verification_sent_at=NULL WHERE verification_token_hash=?',[tokenHash]);throw error;}
 return res.status(201).json({success:true,message:'Account created. Check your email to verify your address. Membership approval is still pending.'});
 }catch(error){return failure(res,error);}};
exports.resend=async(req,res)=>{const email=typeof req.body?.email==='string'?req.body.email.trim().toLowerCase():'';if(email.length>254||! /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/.test(email))return res.status(400).json({success:false,message:'Enter a valid email address.'});try{
 emailSettings();const token=crypto.randomBytes(32).toString('hex'),hash=digest(token);
 const [update]=await db.execute('UPDATE pending_accounts SET verification_token_hash=?,verification_expires_at=DATE_ADD(UTC_TIMESTAMP(),INTERVAL 1 HOUR),last_verification_sent_at=UTC_TIMESTAMP() WHERE email=? AND email_verified_at IS NULL AND NOT EXISTS(SELECT 1 FROM pending_account_controls pc WHERE pc.account_id=pending_accounts.id AND pc.access_status<>\'Active\') AND (last_verification_sent_at IS NULL OR last_verification_sent_at<DATE_SUB(UTC_TIMESTAMP(),INTERVAL 60 SECOND))',[hash,email]);
 if(update.affectedRows){try{await sendVerification(email,token);}catch(error){await db.execute('UPDATE pending_accounts SET last_verification_sent_at=NULL WHERE verification_token_hash=?',[hash]);throw error;}}
 return res.json({success:true,message:'If an unverified account uses this email, a new link has been sent. Please wait at least one minute between requests.'});
 }catch(error){return failure(res,error);}};
exports.verify=async(req,res)=>{
 const token=req.body?.token;
 if(typeof token!=='string'||! /^[a-f0-9]{64}$/.test(token))return res.status(400).json({success:false,message:'Invalid verification link.'});
 let connection;
 try{
  connection=await db.getConnection();await connection.beginTransaction();
  const [rows]=await connection.execute('SELECT id,username,email FROM pending_accounts WHERE verification_token_hash=? AND email_verified_at IS NULL AND verification_expires_at>UTC_TIMESTAMP() FOR UPDATE',[digest(token)]);
  if(rows.length!==1){await connection.rollback();return res.status(400).json({success:false,message:'This link has expired or was already used. If your email is verified, sign in using your username and password. Otherwise request a new link.'});}
  const {signApplicant}=require('../utils/applicantToken');
  const access=await pendingControl(rows[0].id,connection);if(access.access_status!=='Active'){await connection.rollback();return res.status(403).json({success:false,message:'Account access is inactive or archived. Contact the office.'});}
  const session=signApplicant(rows[0].id,Number(access.session_version)); // Validate signing configuration before consuming the link.
  await connection.execute('UPDATE pending_accounts SET email_verified_at=UTC_TIMESTAMP(),verification_token_hash=NULL,verification_expires_at=NULL WHERE id=?',[rows[0].id]);
  await connection.commit();
  return res.json({success:true,accountType:'applicant',token:session,user:{username:rows[0].username,email:rows[0].email},message:'Email verified. Complete your personal information, then choose existing-record verification or a new ID application.'});
 }catch(error){if(connection)try{await connection.rollback();}catch{}return failure(res,error);}finally{connection?.release();}
};
