const db=require('../config/db');
const crypto=require('node:crypto');
const {CORE:MEMBER,summary:memberInfo}=require('../utils/qrWorkflow');
function fail(res,error){console.error('QR verification:',error);return res.status(error.status||500).json({success:false,message:error.status?error.message:error.code==='ER_NO_SUCH_TABLE'?'Import database/qr-codes.sql before using QR verification.':'Unable to load or verify the QR code. Check backend logs and database migrations.'});}
function problem(message,status){const error=new Error(message);error.status=status;return error;}
async function ownQr(req,res,regenerate){
 let connection;
 try{
  connection=await db.getConnection();await connection.beginTransaction();
  const [members]=await connection.execute(MEMBER+' WHERE BINARY u.acc_username=? LIMIT 2 FOR UPDATE',[req.portalAccount.username]);
  if(members.length!==1)throw problem(members.length?'Duplicate member profiles found. Contact LGU staff.':'Member profile not found.',members.length?409:404);
  const member=members[0];if(!member.pwd_id?.trim())throw problem('Your PWD ID is not recorded yet. Please contact LGU staff.',409);
  const [codes]=await connection.execute('SELECT qr_token FROM member_qr_codes WHERE member_id=?',[member.id]);let token=codes[0]?.qr_token;
  if(!token||regenerate){token=crypto.randomBytes(32).toString('hex');
   if(codes.length)await connection.execute('UPDATE member_qr_codes SET qr_token=?,regenerated_at=DATE_ADD(UTC_TIMESTAMP(),INTERVAL 8 HOUR) WHERE member_id=?',[token,member.id]);
   else await connection.execute('INSERT INTO member_qr_codes(member_id,qr_token,created_at) VALUES(?,?,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 8 HOUR))',[member.id,token]);
  }
  await connection.commit();res.json({success:true,qrPayload:`PWDCONNECT:v1:${token}`,member:memberInfo(member),message:regenerate?'New QR generated. Previous printed or downloaded codes no longer work.':'Your QR code is ready.'});
 }catch(error){if(connection){try{await connection.rollback();}catch(rollbackError){console.error('QR rollback:',rollbackError);}}fail(res,error);}finally{connection?.release();}
}
exports.getOrCreateMyQr=(req,res)=>ownQr(req,res,false);
exports.regenerateMyQr=(req,res)=>ownQr(req,res,true);
const workflow=require('./qrWorkflowController');
exports.verifyQr=workflow.lookupQr;
