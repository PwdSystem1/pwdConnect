const db=require('../config/db');
exports.createRequest=async(req,res)=>{
 if(req.portalAccount?.kind!=='staff')return res.status(403).json({success:false,message:'Staff access required.'});
 const memberId=Number(req.body?.member_id);
 if(!Number.isSafeInteger(memberId)||memberId<1)return res.status(400).json({success:false,message:'Choose a valid member.'});
 let c;
 try{
  c=await db.getConnection();await c.beginTransaction();
  const [members]=await c.execute(`SELECT id,pwd_id,first_name,middle_name,last_name,baranggay,DATE_FORMAT(birthday,'%Y-%m-%d') AS birthday,YEAR(DATE_ADD(UTC_TIMESTAMP(),INTERVAL 8 HOUR)) AS benefit_year FROM userdata WHERE id=? FOR UPDATE`,[memberId]);
  const m=members[0];if(!m)throw Object.assign(Error('Member not found.'),{status:404});
  if(!m.birthday||!String(m.pwd_id||'').trim())throw Object.assign(Error('A recorded birthday and PWD ID are required before creating a request.'),{status:409});
  const [existing]=await c.execute('SELECT request_id FROM birthday_assistance_requests WHERE member_id=? AND benefit_year=?',[memberId,m.benefit_year]);
  if(existing.length)throw Object.assign(Error('This member already has a birthday program request for this year. Review the existing request.'),{status:409});
  const name=[m.first_name,m.middle_name,m.last_name].filter(Boolean).join(' ');
  const description=`Birthday Cash Assistance ${m.benefit_year}. Recorded birthday: ${m.birthday}. Created by staff for eligibility review; cash has not been delivered.`;
  const [request]=await c.execute(`INSERT INTO service_request(pwd_id,full_name,baranggay,service_type,description,status,created_at) VALUES(?,?,?,'Birthday Cash Assistance',?,'Pending',DATE_ADD(UTC_TIMESTAMP(),INTERVAL 8 HOUR))`,[m.pwd_id,name,m.baranggay||'',description]);
  await c.execute('INSERT INTO birthday_assistance_requests(member_id,benefit_year,request_id,created_by,created_at) VALUES(?,?,?,?,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 8 HOUR))',[memberId,m.benefit_year,request.insertId,req.portalAccount.username]);
  await c.commit();return res.status(201).json({success:true,request_id:request.insertId,message:'Pending birthday assistance request created. Review it in Service Requests. Record delivery only after cash is handed over.'});
 }catch(e){if(c)try{await c.rollback();}catch{}const status=e.status||(e.code==='ER_DUP_ENTRY'?409:503);console.error('Birthday request:',e.code||e.message);return res.status(status).json({success:false,message:e.status?e.message:e.code==='ER_DUP_ENTRY'?'A birthday request already exists for this member and year.':'Unable to create the request. Check the birthday SQL installation and backend logs.'});}finally{c?.release();}
};
