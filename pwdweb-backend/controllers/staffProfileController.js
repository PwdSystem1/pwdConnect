const db=require('../config/db');
const {validate,ageOf}=require('../utils/staffProfileValidation');
const SELECT=`SELECT id,first_name,middle_name,last_name,DATE_FORMAT(birthday,'%Y-%m-%d') AS birthday,
 Staff_id AS staff_id,staff_username,account_status,is_pwd,pwd_id,DATE_FORMAT(staff_since,'%Y-%m-%d') AS staff_since,
 profile_pic,profile_pic_mime,DATE_FORMAT(profile_updated_at,'%Y-%m-%d %H:%i:%s') AS profile_updated_at
 FROM staffdata WHERE BINARY staff_username=? LIMIT 2`;
function format(row){return {id:row.id,first_name:row.first_name,middle_name:row.middle_name,last_name:row.last_name,birthday:row.birthday,age:ageOf(row.birthday),staff_id:row.staff_id,staff_username:row.staff_username,account_status:row.account_status,is_pwd:Boolean(Number(row.is_pwd)),pwd_id:row.pwd_id||null,staff_since:row.staff_since,profile_updated_at:row.profile_updated_at,profile_pic:Buffer.isBuffer(row.profile_pic)&&row.profile_pic.length&&['image/png','image/jpeg','image/webp'].includes(row.profile_pic_mime)?`data:${row.profile_pic_mime};base64,${row.profile_pic.toString('base64')}`:null};}
function record(rows){if(rows.length===0){const e=new Error('Staff profile not found. Please contact the LGU administrator.');e.status=404;throw e;}if(rows.length!==1){const e=new Error('Duplicate staff profiles were found for this username. Please contact the LGU administrator.');e.status=409;throw e;}if(rows[0].account_status!=='Active'){const e=new Error('This staff account is inactive. Please contact the LGU administrator.');e.status=403;throw e;}return rows[0];}
function failure(res,error){console.error('Staff profile:',error);return res.status(error.status||500).json({success:false,message:error.status?error.message:error.code==='ER_BAD_FIELD_ERROR'?'Import database/staff-profile.sql before using the staff profile.':'Unable to save or load your staff profile. Please try again.'});}
exports.getMyProfile=async(req,res)=>{try{const [rows]=await db.execute(SELECT,[req.portalAccount.username]);res.json({success:true,profile:format(record(rows))});}catch(error){failure(res,error);}};
exports.updateMyProfile=async(req,res)=>{
 let fields;try{fields=validate(req.body);}catch(error){return res.status(400).json({success:false,message:error.message});}
 let connection;
 try{
  connection=await db.getConnection();await connection.beginTransaction();
  const [rows]=await connection.execute(SELECT+' FOR UPDATE',[req.portalAccount.username]);const existing=record(rows);
  const updates=['first_name=?','middle_name=?','last_name=?','birthday=?','age=?','is_pwd=?','pwd_id=?','profile_updated_at=DATE_ADD(UTC_TIMESTAMP(),INTERVAL 8 HOUR)'];
  const values=[fields.first_name,fields.middle_name,fields.last_name,fields.birthday,fields.age,fields.is_pwd,fields.pwd_id];
  if(fields.picture){updates.push('profile_pic=?','profile_pic_mime=?');values.push(fields.picture.buffer,fields.picture.mime);}
  await connection.execute(`UPDATE staffdata SET ${updates.join(',')} WHERE id=? AND BINARY staff_username=?`,[...values,existing.id,req.portalAccount.username]);
  const [saved]=await connection.execute(SELECT,[req.portalAccount.username]);const profile=format(record(saved));
  await connection.commit();res.json({success:true,message:'Staff profile updated successfully.',profile});
 }catch(error){if(connection){try{await connection.rollback();}catch(rollbackError){console.error('Staff profile rollback:',rollbackError);}}failure(res,error);}finally{connection?.release();}
};
