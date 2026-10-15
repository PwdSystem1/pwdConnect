const registration=require('../utils/staffMemberRegistration');
const {validUsername}=require('../utils/usernamePolicy');
const db=require('../config/db');
const {ageOf,manilaToday}=require('../utils/staffProfileValidation');
const FIELDS={first_name:50,middle_name:50,last_name:50,sex:40,contact_numb:255,email:255,occupation:50,province:50,municipality:50,baranggay:50,street:50,house_number:30,disability:100,blood_type:50,pwd_id:50,civil_status:50,acc_username:60};
const SELECT=`SELECT id,first_name,middle_name,last_name,sex,DATE_FORMAT(birthday,'%Y-%m-%d') AS birthday,age,
 contact_numb,email,occupation,province,municipality,baranggay,street,house_number,disability,blood_type,pwd_id,
 civil_status,acc_username,DATE_FORMAT(expired_date,'%Y-%m-%d') AS expired_date,DATE_FORMAT(member_since,'%Y-%m-%d') AS member_since FROM userdata`;
function date(value,label,required=false){if(!value){if(required)throw new Error(`${label} is required.`);return null;}if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))throw new Error(`${label} must be a valid date.`);const d=new Date(value+'T00:00:00Z');if(Number.isNaN(d.getTime())||d.toISOString().slice(0,10)!==value||value<'1900-01-01')throw new Error(`${label} must be a real date.`);return value;}
function fields(body,existing){
 if(!body||typeof body!=='object'||Array.isArray(body))throw new Error('Invalid member information.');
 const allowed=[...Object.keys(FIELDS),'birthday','age','expired_date','member_since'];if(Object.keys(body).some(key=>!allowed.includes(key)))throw new Error('Unsupported member field.');
 const out={};for(const [key,max]of Object.entries(FIELDS)){const value=body[key]??existing?.[key]??'';if(typeof value!=='string'||Array.from(value.trim()).length>max)throw new Error(`${key} must be text with at most ${max} characters.`);out[key]=value.trim();}
 if(!out.first_name||!out.last_name||!out.pwd_id)throw new Error('First name, last name, and PWD ID are required.');
 if(existing&&out.acc_username!==existing.acc_username)throw new Error('Account username cannot be changed here because it is linked to login records.');
 if(!existing&&out.acc_username&&!validUsername(out.acc_username))throw new Error('Username must be 3–50 characters; letters, numbers, spaces and symbols are allowed (no control characters).');
 if(out.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(out.email))throw new Error('Enter a valid email address.');
 out.birthday=date(body.birthday??existing?.birthday,'Birthday',true);if(out.birthday>manilaToday())throw new Error('Birthday cannot be in the future.');out.age=ageOf(out.birthday);
 out.expired_date=date(Object.hasOwn(body,'expired_date')?body.expired_date:existing?.expired_date,'Expiry date');
 out.member_since=date(Object.hasOwn(body,'member_since')?body.member_since:existing?.member_since,'Member since');if(out.member_since&&out.member_since>manilaToday())throw new Error('Member since cannot be in the future.');
 return out;
}
function failure(res,error){console.error('Masterlist:',error);res.status(error.status||(['ER_DUP_ENTRY','ER_SIGNAL_EXCEPTION'].includes(error.code)?409:500)).json({success:false,message:error.status?error.message:['ER_DUP_ENTRY','ER_SIGNAL_EXCEPTION'].includes(error.code)?'Username or official ID is already reserved. Use a unique username.':'Unable to save or load member records. Check the database migration and backend logs.'});}
async function saveMember(req,res,isNew){
 let connection;
 try{
  const id=Number(req.params.id);if(!isNew&&(!Number.isSafeInteger(id)||id<=0)){const e=new Error('Invalid member ID.');e.status=400;throw e;}
  connection=await db.getConnection();await connection.beginTransaction();let existing;
  if(!isNew){const [rows]=await connection.execute(SELECT+' WHERE id=? FOR UPDATE',[id]);if(!rows.length){const e=new Error('Member not found.');e.status=404;throw e;}existing=rows[0];}
  let values;try{values=fields(isNew?Object.fromEntries(Object.entries(req.body||{}).filter(([key])=>key!=='office_record_confirmed')):req.body,existing);}catch(error){error.status=400;throw error;}
  const [duplicates]=await connection.execute('SELECT id FROM userdata WHERE (pwd_id=? OR (?<>"" AND BINARY acc_username=?)) AND id<>? LIMIT 1',[values.pwd_id,values.acc_username,values.acc_username,isNew?0:id]);if(duplicates.length){const e=new Error('PWD ID or account username already belongs to another member.');e.status=409;throw e;}
  // New rows with no provided member_since are dated by the SQL BEFORE INSERT trigger.
  const keys=Object.keys(values);let result;
  if(isNew){if(req.body.office_record_confirmed!==true)throw Object.assign(Error('Confirm that the official LGU record/physician documentation was checked.'),{status:400});const memberId=await registration.register(connection,values,req.portalAccount.username);await connection.commit();return res.status(201).json({success:true,id:memberId,message:'Official member saved to the masterlist and User Management without login access. Admin can create a login, or the member can register online and request staff verification.'});}
  [result]=await connection.execute(`UPDATE userdata SET ${keys.map(key=>`${key}=?`).join(',')} WHERE id=?`,[...keys.map(key=>values[key]),id]);
  await connection.commit();res.status(200).json({success:true,message:'Member updated successfully.',id});
 }catch(error){if(connection){try{await connection.rollback();}catch(rollbackError){console.error(rollbackError);}}failure(res,error);}finally{connection?.release();}
}
const getAllMembers=async(req,res)=>{try{const [rows]=await db.execute(SELECT+' ORDER BY id DESC');res.json({success:true,data:rows.map(row=>({...row,age:ageOf(row.birthday)}))});}catch(error){failure(res,error);}};
const addMember=(req,res)=>saveMember(req,res,true);
const updateMember=(req,res)=>saveMember(req,res,false);
const deleteMember=async(req,res)=>{const id=Number(req.params.id);if(!Number.isSafeInteger(id)||id<=0)return res.status(400).json({success:false,message:'Invalid member ID.'});try{const [result]=await db.execute('DELETE FROM userdata WHERE id=?',[id]);if(!result.affectedRows)return res.status(404).json({success:false,message:'Member not found.'});res.json({success:true,message:'Member deleted successfully.'});}catch(error){failure(res,error);}};
module.exports={getAllMembers,addMember,updateMember,deleteMember,fields};
