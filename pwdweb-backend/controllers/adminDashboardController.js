const {timestampManilaSql,timestampRangeSql,manilaEpochRange}=require('../utils/timestampSql');
const {encodingSeries}=require('../utils/memberAnalytics');
const db=require('../config/db');
exports.overview=async(req,res)=>{
 const now=new Date(Date.now()+8*3600000),today=now.toISOString().slice(0,10),start=new Date(now.getTime()-29*86400000).toISOString().slice(0,10);const warnings=[];
 const endExclusive=new Date(now.getTime()+86400000).toISOString().slice(0,10);
 const sourceValues=manilaEpochRange(start,endExclusive);
 const queries={
 members:["SELECT COUNT(*) AS total,COALESCE(SUM(COALESCE(TRIM(pwd_id),'')<>'' AND expired_date IS NOT NULL AND expired_date>=?),0) AS valid_ids FROM userdata",[today]],
 staff:["SELECT COUNT(DISTINCT sl.id) AS total,COUNT(DISTINCT CASE WHEN sd.account_status='Active' THEN sl.id END) AS active FROM stafflogin sl LEFT JOIN staffdata sd ON BINARY sd.staff_username=BINARY sl.staff_username",[]],
 registrations:["SELECT COUNT(*) AS total,COUNT(*) AS email_verified FROM membership_approval_queue WHERE source='Applicant' AND status='Pending'",[]],
 requests:["SELECT COUNT(*) AS total,COALESCE(SUM(LOWER(TRIM(COALESCE(status,'Pending'))) IN ('pending','under_review','under review')),0) AS awaiting_review,COALESCE(SUM(LOWER(TRIM(status))='approved'),0) AS approved FROM service_request",[]],
 emergencies:["SELECT COUNT(*) AS total,COALESCE(SUM(LOWER(TRIM(COALESCE(status,'')))<>'resolved'),0) AS unresolved FROM emergency_req",[]],
 announcements:['SELECT COUNT(*) AS total FROM announcements',[]],
 trends:[`SELECT ${timestampManilaSql("created_at",'%Y-%m-%d')} AS date,COUNT(*) AS requests FROM service_request WHERE ${timestampRangeSql("created_at")} GROUP BY date ORDER BY date`,sourceValues],
 serviceTypes:[`SELECT COALESCE(NULLIF(service_type,''),'Unspecified') AS type,COUNT(*) AS count FROM service_request WHERE ${timestampRangeSql("created_at")} GROUP BY service_type ORDER BY count DESC LIMIT 8`,sourceValues],
 pending:["SELECT id,CONCAT_WS(' ',JSON_UNQUOTE(JSON_EXTRACT(profile_json,'$.first_name')),JSON_UNQUOTE(JSON_EXTRACT(profile_json,'$.last_name'))) AS username,submitted_by AS email,DATE_FORMAT(created_at,'%Y-%m-%d %H:%i:%s') AS email_verified_at FROM membership_approval_queue WHERE source='Applicant' AND status='Pending' ORDER BY id DESC LIMIT 5",[]],
 activity:['SELECT id,event_type,person_name,category,next_status,details,DATE_FORMAT(occurred_at,"%Y-%m-%d %H:%i:%s") AS occurred_at FROM report_activity ORDER BY id DESC LIMIT 8',[]]
 };
 const names=Object.keys(queries),results=await Promise.allSettled(names.map(name=>db.execute(...queries[name])));const output={};
 results.forEach((result,index)=>{const name=names[index];if(result.status==='fulfilled')output[name]=result.value[0];else{output[name]=null;warnings.push(`${name}: unavailable${result.reason.code==='ER_NO_SUCH_TABLE'?' — source table not installed':''}`);console.error('Admin overview '+name+':',result.reason.code||result.reason.message);}});
 const stats={};for(const key of ['members','staff','registrations','requests','emergencies','announcements'])stats[key]=output[key]?Object.fromEntries(Object.entries(output[key][0]).map(([k,v])=>[k,Number(v)])):null;
 if(!Object.values(stats).some(Boolean))return res.status(503).json({success:false,message:'Dashboard data is unavailable. Check the database connection and source tables.'});
let encoding={available:false,trackingStartedAt:null,monthly:[]};
 try{const [tracking]=await db.execute("SELECT DATE_FORMAT(started_at,'%Y-%m-%d %H:%i:%s') AS started_at FROM report_tracking WHERE id=1");if(tracking.length){const month=new Date(today+'T00:00:00Z');month.setUTCDate(1);month.setUTCMonth(month.getUTCMonth()-11);const encodingStart=month.toISOString().slice(0,10);const [encoded]=await db.execute("SELECT DATE_FORMAT(occurred_at,'%Y-%m') AS date,COUNT(*) AS members FROM report_activity WHERE event_type='member_created' AND occurred_at>=? AND occurred_at<DATE_ADD(?,INTERVAL 1 DAY) GROUP BY DATE_FORMAT(occurred_at,'%Y-%m') ORDER BY date",[encodingStart,today]);encoding={available:true,trackingStartedAt:tracking[0].started_at,monthly:encodingSeries(encodingStart,today,encoded,tracking[0].started_at,'month')};}}catch(e){warnings.push('Member encoding tracking is unavailable');console.error('Admin encoding:',e.code||'unavailable');}
 return res.json({success:true,overview:{stats,encoding,trends:output.trends,serviceTypes:output.serviceTypes,pending:output.pending,activity:output.activity,period:{start,end:today},generatedAt:new Date().toISOString(),warnings}});
};
