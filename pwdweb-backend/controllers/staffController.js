const db=require('../config/db');
const {encodingSeries}=require('../utils/memberAnalytics');
exports.getStaffDashboardData=async(req,res)=>{
 if(req.portalAccount?.kind!=='staff')return res.status(403).json({success:false,message:'Staff access required.'});
 const birthdayPage=Number(req.query.birthday_page||0);if(!Number.isSafeInteger(birthdayPage)||birthdayPage<0||birthdayPage>100000)return res.status(400).json({success:false,message:'Invalid birthday page.'});
 let connection;
 try{
  connection=await db.getConnection();await connection.beginTransaction();
  const [staff]=await connection.execute('SELECT first_name,middle_name,last_name,Staff_id AS staff_id,staff_username FROM staffdata WHERE BINARY staff_username=? LIMIT 1',[req.portalAccount.username]);
  const [totals]=await connection.execute(`SELECT COUNT(*) AS totalMembers,
   COALESCE(SUM(expired_date IS NOT NULL AND DATE(expired_date)>=DATE(DATE_ADD(UTC_TIMESTAMP(),INTERVAL 8 HOUR)) AND COALESCE(TRIM(pwd_id),'')<>''),0) AS validIds,
   COALESCE(SUM(MONTH(birthday)=MONTH(DATE_ADD(UTC_TIMESTAMP(),INTERVAL 8 HOUR))),0) AS birthdaysThisMonth,
   COALESCE(SUM(DATE_FORMAT(birthday,'%m-%d')=DATE_FORMAT(DATE_ADD(UTC_TIMESTAMP(),INTERVAL 8 HOUR),'%m-%d')),0) AS birthdaysToday FROM userdata`);
  const [disabilities]=await connection.execute(`SELECT LOWER(TRIM(disability)) AS filter,MIN(TRIM(disability)) AS label,COUNT(*) AS count FROM userdata WHERE COALESCE(TRIM(disability),'')<>'' GROUP BY LOWER(TRIM(disability)) ORDER BY count DESC,label`);
  const [birthdays]=await connection.execute(`SELECT id,pwd_id,CONCAT_WS(' ',first_name,middle_name,last_name) AS full_name,DATE_FORMAT(birthday,'%Y-%m-%d') AS birthday,
   DATE_FORMAT(birthday,'%m-%d')=DATE_FORMAT(DATE_ADD(UTC_TIMESTAMP(),INTERVAL 8 HOUR),'%m-%d') AS is_today FROM userdata WHERE MONTH(birthday)=MONTH(DATE_ADD(UTC_TIMESTAMP(),INTERVAL 8 HOUR)) ORDER BY is_today DESC,DAY(birthday),last_name,id LIMIT 100 OFFSET ${birthdayPage*100}`);
  const [recentRequests]=await connection.execute('SELECT id,pwd_id,full_name,service_type,status,created_at FROM service_request ORDER BY id DESC LIMIT 5');
  const [recentAnnouncements]=await connection.execute('SELECT id,title,content FROM announcements ORDER BY id DESC LIMIT 5');
  const today=new Date(Date.now()+28800000).toISOString().slice(0,10),month=new Date(today+'T00:00:00Z');month.setUTCDate(1);month.setUTCMonth(month.getUTCMonth()-11);const start=month.toISOString().slice(0,10);
  let tracking=null,monthly=[],analyticsAvailable=true,birthdayProgramAvailable=true,requests=[];
  try{
   const [meta]=await connection.execute(`SELECT DATE_FORMAT(started_at,'%Y-%m-%d %H:%i:%s') AS started_at FROM report_tracking WHERE id=1`);
   if(!meta.length)analyticsAvailable=false;else{tracking=meta[0].started_at;const [rows]=await connection.execute(`SELECT DATE_FORMAT(occurred_at,'%Y-%m') AS date,COUNT(*) AS members FROM report_activity WHERE event_type='member_created' AND occurred_at>=? AND occurred_at<DATE_ADD(?,INTERVAL 1 DAY) GROUP BY DATE_FORMAT(occurred_at,'%Y-%m') ORDER BY date`,[start,today]);monthly=encodingSeries(start,today,rows,tracking,'month');}
  }catch(e){if(e.code!=='ER_NO_SUCH_TABLE')throw e;analyticsAvailable=false;}
  try{[requests]=await connection.execute(`SELECT b.member_id,b.request_id,s.status,d.id AS delivery_id FROM birthday_assistance_requests b LEFT JOIN service_request s ON s.id=b.request_id LEFT JOIN service_assistance_deliveries d ON d.request_id=b.request_id WHERE b.benefit_year=?`,[Number(today.slice(0,4))]);}catch(e){if(e.code!=='ER_NO_SUCH_TABLE')throw e;birthdayProgramAvailable=false;}
  const byMember=new Map(requests.map(r=>[Number(r.member_id),r]));
  await connection.commit();res.json({success:true,staff:staff[0],asOf:today,birthdayPage,summary:Object.fromEntries(Object.entries(totals[0]).map(([k,v])=>[k,Number(v)])),disabilities,birthdays:birthdays.map(r=>({...r,request:byMember.get(Number(r.id))||null})),birthdayProgramAvailable,encoding:{available:analyticsAvailable,trackingStartedAt:tracking,monthly},recentRequests,recentAnnouncements});
 }catch(e){if(connection)try{await connection.rollback();}catch{}console.error('Staff dashboard:',e.code||e.message);res.status(503).json({success:false,message:'Unable to load the staff dashboard. Check backend logs.'});}finally{connection?.release();}
};
