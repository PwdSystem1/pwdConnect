const db=require('../config/db');
let cache=null,loading=null;
async function read(){
 const [rows]=await db.execute(`SELECT COUNT(*) AS registeredMembers,
 COUNT(DISTINCT NULLIF(LOWER(TRIM(u.baranggay)),'')) AS barangaysRepresented,
 COALESCE(SUM(u.member_since>=DATE_FORMAT(DATE_ADD(UTC_TIMESTAMP(),INTERVAL 8 HOUR),'%Y-%m-01') AND u.member_since<DATE_ADD(LAST_DAY(DATE_ADD(UTC_TIMESTAMP(),INTERVAL 8 HOUR)),INTERVAL 1 DAY)),0) AS newMembersThisMonth,
 DATE_FORMAT(DATE_ADD(UTC_TIMESTAMP(),INTERVAL 8 HOUR),'%Y-%m-%d') AS asOf
 FROM userdata u LEFT JOIN admin_account_controls c ON c.account_kind='member' AND c.record_id=u.id
 WHERE COALESCE(TRIM(u.pwd_id),'')<>'' AND COALESCE(c.account_status,'Active')<>'Archived'`);
 const row=rows[0];if(!row||!/^\d{4}-\d{2}-\d{2}$/.test(row.asOf))throw Error('OVERVIEW_DATA');
 const data={registeredMembers:Number(row.registeredMembers),barangaysRepresented:Number(row.barangaysRepresented),newMembersThisMonth:Number(row.newMembersThisMonth),asOf:row.asOf};
 if(![data.registeredMembers,data.barangaysRepresented,data.newMembersThisMonth].every(n=>Number.isSafeInteger(n)&&n>=0))throw Error('OVERVIEW_DATA');
 cache={data,until:Date.now()+60000};return data;
}
exports.overview=async(req,res)=>{try{res.set('Cache-Control','public, max-age=60');if(cache&&cache.until>Date.now())return res.json({success:true,overview:cache.data});if(!loading)loading=read().finally(()=>{loading=null;});return res.json({success:true,overview:await loading});}catch(e){console.error('Public overview:',e.code||'unavailable');res.set('Cache-Control','no-store');return res.status(503).json({success:false,message:'Community overview is temporarily unavailable.'});}};
