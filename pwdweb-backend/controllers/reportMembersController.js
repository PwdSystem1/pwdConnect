const db=require('../config/db');
const {period,snapshot}=require('../utils/reportPeriod');
exports.getMembers=async(req,res)=>{try{
 const mode=req.query.member_mode||'current';if(!['current','encoded'].includes(mode))return res.status(400).json({success:false,message:'Choose current or encoded member list.'});
 let range;try{range=period(req.query);}catch{return res.status(400).json({success:false,message:'Choose a valid reporting period.'});}let rows;
 if(mode==='current'){
  const through=snapshot(req.query.member_through);if(through===null)return res.status(400).json({success:false,message:'Generate the report before loading its member register.'});
  [rows]=await db.execute(`SELECT id,first_name,middle_name,last_name,pwd_id,DATE_FORMAT(birthday,'%Y-%m-%d') AS birthday,sex,contact_numb,baranggay,disability,DATE_FORMAT(member_since,'%Y-%m-%d') AS member_since FROM userdata WHERE id<=? ORDER BY last_name,first_name,middle_name,id`,[through]);
 }else{
  const through=snapshot(req.query.through);if(through===null)return res.status(400).json({success:false,message:'Generate the report before loading its encoded members.'});
  [rows]=await db.execute(`SELECT a.id AS event_id,a.source_id AS id,COALESCE(NULLIF(a.person_name,''),CONCAT_WS(' ',u.first_name,u.middle_name,u.last_name)) AS full_name,a.pwd_id,COALESCE(NULLIF(a.category,''),u.disability) AS disability,DATE_FORMAT(u.birthday,'%Y-%m-%d') AS birthday,u.sex,u.contact_numb,u.baranggay,DATE_FORMAT(u.member_since,'%Y-%m-%d') AS member_since,DATE_FORMAT(a.occurred_at,'%Y-%m-%d %H:%i:%s') AS encoded_at,(u.id IS NULL) AS record_missing FROM report_activity a LEFT JOIN userdata u ON a.source_table='userdata' AND CAST(u.id AS CHAR)=a.source_id WHERE a.event_type='member_created' AND a.occurred_at>=? AND a.occurred_at<? AND a.id<=? ORDER BY a.person_name,a.id`,[range.start,range.endExclusive,through]);
 }
 res.set('Cache-Control','no-store');return res.json({success:true,memberList:{mode,rows,count:rows.length,fetchedAt:new Date().toISOString(),note:mode==='current'?'Current profile data, bounded to member IDs present when the report was generated. This is not a historical membership snapshot.':'Encoding name, PWD ID and disability are taken from the activity event; birthday, sex, contact, barangay and member-since reflect the current profile when available.'}});
 }catch(e){console.error('Report member list:',e.code||'unavailable');return res.status(e.message?.startsWith('Invalid')||e.message?.startsWith('Choose')||e.message?.startsWith('Use')?400:503).json({success:false,message:'Unable to load the member list. Regenerate the report or check report-tracking installation.'});}};
