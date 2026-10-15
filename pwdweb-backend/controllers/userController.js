const profileEmail=require('../utils/profileEmail');
const {missingInformation}=require('../utils/profileCompleteness');
const db=require('../config/db');
const {statusFromExpiry,validate,ageOf}=require('../utils/userProfileValidation');
const SELECT=`SELECT id,first_name,middle_name,last_name,sex,DATE_FORMAT(birthday,'%Y-%m-%d') AS birthday,
 contact_numb,email,occupation,province,municipality,baranggay,street,house_number,disability,blood_type,
 pwd_id,civil_status,acc_username,DATE_FORMAT(expired_date,'%Y-%m-%d') AS expired_date,
 DATE_FORMAT(member_since,'%Y-%m-%d') AS member_since,profile_pic,profile_pic_mime
 FROM userdata WHERE BINARY acc_username=? LIMIT 2`;
function record(rows){if(rows.length!==1){const e=new Error(rows.length?'Duplicate member profiles found. Contact the LGU staff.':'User profile not found.');e.status=rows.length?409:404;throw e;}return rows[0];}
function format(row){const result={...row,age:ageOf(row.birthday),...statusFromExpiry(row.expired_date),profile_pic:Buffer.isBuffer(row.profile_pic)&&row.profile_pic.length&&['image/png','image/jpeg','image/webp'].includes(row.profile_pic_mime)?`data:${row.profile_pic_mime};base64,${row.profile_pic.toString('base64')}`:null};delete result.profile_pic_mime;return result;}
async function decorate(connection,row){return {...format(row),missing_information:missingInformation(row),email_verification:await profileEmail.status(connection,row)};}
function failure(res,error){console.error('User profile:',error.code||error.status||'failure');return res.status(error.status||503).json({success:false,message:error.status?error.message:error.code==='ER_BAD_FIELD_ERROR'?'Import database/user-profile.sql before using the updated user profile.':'Unable to load or update your profile. Import profile-email.sql and check backend logs.'});}
function target(req){const account=req.portalAccount;const username=req.params.acc_username||account.username;if(account.kind==='user'&&username!==account.username){const e=new Error('You can only access your own profile.');e.status=403;throw e;}return username;}
const getUserProfile=async(req,res)=>{try{const username=target(req);const [rows]=await db.execute(SELECT,[username]);res.json({success:true,data:await decorate(db,record(rows))});}catch(error){failure(res,error);}};
const updateUserProfile=async(req,res)=>{
 if(req.portalAccount.kind!=='user')return res.status(403).json({success:false,message:'Staff must edit member records through the PWD Masterlist.'});
 let fields,username;try{username=target(req);fields=validate(req.body);}catch(error){return res.status(error.status||400).json({success:false,message:error.message});}
 let connection,packet;
 try{
  connection=await db.getConnection();await connection.beginTransaction();
  const [rows]=await connection.execute(SELECT+' FOR UPDATE',[username]);const existing=record(rows);
  if(!fields.email&&existing.email)throw profileEmail.problem('To replace your recorded email, enter a new email and verify it. Contact staff if the old record needs correction.');
  if(fields.email&&profileEmail.normalize(fields.email)!==profileEmail.normalize(existing.email))packet=await profileEmail.stage(connection,existing,fields.email);
  const updates=['contact_numb=?','occupation=?'];const values=[fields.contact_numb,fields.occupation];
  if(fields.picture){updates.push('profile_pic=?','profile_pic_mime=?');values.push(fields.picture.buffer,fields.picture.mime);}
  await connection.execute(`UPDATE userdata SET ${updates.join(',')} WHERE id=? AND BINARY acc_username=?`,[...values,existing.id,username]);
  const [saved]=await connection.execute(SELECT,[username]);const data=await decorate(connection,record(saved));await connection.commit();connection.release();connection=null;
  const sent=packet?await profileEmail.send(packet):null;
  if(packet)data.email_verification=await profileEmail.status(db,data);
  res.json({success:true,message:packet?(sent?'Profile saved. Verify the link sent to your new email before it becomes linked.':'Profile saved. Email verification is pending, but delivery failed. Check SMTP and resend from Profile.'):'Profile updated successfully.',data});
 }catch(error){if(connection){try{await connection.rollback();}catch(rollbackError){console.error('User profile rollback:',rollbackError);}}failure(res,error);}finally{connection?.release();}
};
module.exports={getUserProfile,updateUserProfile};
