const {encodingSeries}=require('../utils/memberAnalytics');
const db=require('../config/db');
const {period,positive,snapshot,csvCell}=require('../utils/reportPeriod');
// Resolve publication authors only; other names describe the affected member/sender.
const SELECT_ACTIVITY=`SELECT id,event_type,source_table,source_id,pwd_id,
 CASE WHEN event_type='announcement_created' AND source_table='announcements' THEN
 COALESCE((SELECT COALESCE(NULLIF(TRIM(CONCAT_WS(' ',sd.first_name,sd.middle_name,sd.last_name)),''),NULLIF(m.author_username,'')) FROM announcement_metadata m LEFT JOIN staffdata sd ON BINARY sd.staff_username=BINARY m.author_username WHERE m.announcement_id=report_activity.source_id LIMIT 1),NULLIF(person_name,'')) ELSE person_name END AS person_name,
 CASE WHEN event_type='announcement_created' AND source_table='announcements' AND EXISTS(SELECT 1 FROM announcement_metadata m WHERE m.announcement_id=report_activity.source_id AND NULLIF(TRIM(m.author_username),'') IS NOT NULL) THEN 'LGU Staff'
 WHEN source_table IN ('userdata','service_request','emergency_req','request_tracking_events') AND (NULLIF(TRIM(person_name),'') IS NOT NULL OR NULLIF(TRIM(pwd_id),'') IS NOT NULL) THEN 'PWD Member' WHEN source_table='membership_workflow_events' THEN 'Membership applicant' ELSE NULL END AS person_role,
 CASE WHEN event_type='announcement_created' THEN 'Author' WHEN source_table IN ('userdata','service_request','emergency_req','request_tracking_events') THEN 'Affected member' WHEN source_table='membership_workflow_events' THEN 'Membership subject' ELSE 'Name / sender' END AS person_context,
 category,previous_status,next_status,details,DATE_FORMAT(occurred_at,"%Y-%m-%d %H:%i:%s") AS occurred_at FROM report_activity`;

function fail(res,error){console.error('Staff reports:',error);return res.status(500).json({success:false,message:error.code==='ER_NO_SUCH_TABLE'?'Import database/staff-reports.sql before using Reports.':'Unable to generate the report. Check backend logs and the reporting SQL installation.'});}
function parameters(req){const range=period(req.query);return {range,values:[range.start,range.endExclusive]};}
exports.getReport=async(req,res)=>{
 let parsed;try{parsed=parameters(req);}catch(error){return res.status(400).json({success:false,message:error.message});}
 const {range,values}=parsed;let connection;
 try{
  connection=await db.getConnection();await connection.beginTransaction();
  const [metadata]=await connection.execute('SELECT DATE_FORMAT(started_at,"%Y-%m-%d %H:%i:%s") AS started_at,baseline_members FROM report_tracking WHERE id=1');
  if(!metadata.length)throw new Error('Reporting tracking metadata not installed.');
  const [maxRows]=await connection.execute('SELECT COALESCE(MAX(id),0) AS max_id,DATE_FORMAT(MIN(occurred_at),"%Y-%m-%d") AS earliest FROM report_activity');const through=Number(maxRows[0].max_id);
  if(range.mode==='all'&&!req.query.start){range.start=maxRows[0].earliest||metadata[0].started_at.slice(0,10);if(range.start>range.end)range.start=range.end;values[0]=range.start;}
  const bucket=range.mode==='all'?'month':'day';const datePattern=bucket==='month'?'%Y-%m':'%Y-%m-%d';
  const where=' WHERE occurred_at>=? AND occurred_at<? AND id<=?';const bind=[...values,through];
  const [totals]=await connection.execute(`SELECT
   COALESCE(SUM(event_type='member_created'),0) AS newMembers,
   COALESCE(SUM(event_type='member_deleted'),0) AS removedMembers,
   COALESCE(SUM(event_type='service_created' AND category='Birthday Cash Assistance'),0) AS birthdayRequests,
   COUNT(DISTINCT CASE WHEN event_type='service_status_changed' AND category='Birthday Cash Assistance' AND LOWER(TRIM(next_status))='approved' THEN source_id END) AS birthdayApprovals,
   COALESCE(SUM(event_type='birthday_cash_delivered'),0) AS birthdayDelivered,
   COUNT(DISTINCT CASE WHEN event_type='id_validated' THEN source_id END) AS validIdChanges,
   COALESCE(SUM(event_type='service_created'),0) AS receivedRequests,
   COUNT(DISTINCT CASE WHEN event_type='service_status_changed' AND LOWER(TRIM(next_status))='approved' THEN source_id END) AS approvedRequests,
   COUNT(DISTINCT CASE WHEN event_type='service_status_changed' AND LOWER(TRIM(next_status))='approved' THEN NULLIF(TRIM(pwd_id),'') END) AS usersApproved,
   COALESCE(SUM(event_type='broadcast_created'),0) AS broadcasts,
   COALESCE(SUM(event_type='emergency_created'),0) AS emergencyReports,
   COUNT(DISTINCT CASE WHEN event_type='emergency_status_changed' AND LOWER(TRIM(next_status))='resolved' THEN source_id END) AS resolvedEmergencies,
   COALESCE(SUM(event_type='announcement_created'),0) AS announcements,
   COUNT(*) AS activities FROM report_activity ${where}`,bind);
  const [current]=await connection.execute(`SELECT COUNT(*) AS totalMembers,COALESCE(MAX(id),0) AS memberThrough,
   COALESCE(SUM(COALESCE(TRIM(pwd_id),'')<>'' AND expired_date IS NOT NULL AND DATE(expired_date)>=DATE(DATE_ADD(UTC_TIMESTAMP(),INTERVAL 8 HOUR))),0) AS currentValidIds,
   COALESCE(SUM(expired_date IS NOT NULL AND DATE(expired_date)<DATE(DATE_ADD(UTC_TIMESTAMP(),INTERVAL 8 HOUR))),0) AS expiredIds
   FROM userdata`);
  const [daily]=await connection.execute(`SELECT DATE_FORMAT(occurred_at,'${datePattern}') AS date,
   SUM(event_type='member_created') AS members,SUM(event_type='service_created') AS requests,
   COUNT(DISTINCT CASE WHEN event_type='service_status_changed' AND LOWER(TRIM(next_status))='approved' THEN source_id END) AS approvals
   FROM report_activity ${where} GROUP BY DATE_FORMAT(occurred_at,'${datePattern}') ORDER BY date`,bind);
  const [services]=await connection.execute(`SELECT COALESCE(NULLIF(category,''),'Unspecified') AS type,COUNT(DISTINCT source_id) AS count FROM report_activity ${where} AND event_type='service_status_changed' AND LOWER(TRIM(next_status))='approved' GROUP BY category ORDER BY count DESC,category`,bind);
  const [statuses]=await connection.execute('SELECT COALESCE(status,"Pending") AS status,COUNT(*) AS count FROM service_request WHERE created_at>=? AND created_at<? GROUP BY status',values);
  const [requests]=await connection.execute('SELECT id,pwd_id,full_name,service_type,COALESCE(status,"Pending") AS status,DATE_FORMAT(created_at,"%Y-%m-%d %H:%i:%s") AS created_at FROM service_request WHERE created_at>=? AND created_at<? ORDER BY created_at DESC,id DESC LIMIT 50',values);
  const [activity]=await connection.execute(`${SELECT_ACTIVITY} ${where} ORDER BY id DESC LIMIT 51`,bind);
  await connection.commit();
  const summary=Object.fromEntries(Object.entries(totals[0]).map(([key,value])=>[key,Number(value)]));
  const today=new Date(Date.now()+8*60*60*1000).toISOString().slice(0,10);
  res.json({success:true,report:{period:range,generatedAt:new Date().toISOString(),through,tracking:metadata[0],partialHistory:range.start<metadata[0].started_at.slice(0,10)||range.start===metadata[0].started_at.slice(0,10),bucket,encoding:encodingSeries(range.start,range.end,daily,metadata[0].started_at,bucket),summary,current:{...Object.fromEntries(Object.entries(current[0]).map(([key,value])=>[key,Number(value)])),asOf:today},daily,services,statuses,requests,activity:activity.slice(0,50),hasMoreActivity:activity.length>50}});
 }catch(error){if(connection)await connection.rollback();fail(res,error);}finally{connection?.release();}
};
exports.getActivity=async(req,res)=>{
 let range,before,through,limit;try{range=period(req.query);before=positive(req.query.before);through=snapshot(req.query.through);limit=positive(req.query.limit,50);if(limit>200)throw new Error('Page size cannot exceed 200.');}catch(error){return res.status(400).json({success:false,message:error.message});}
 try{
  const clauses=['occurred_at>=?','occurred_at<?'];const values=[range.start,range.endExclusive];
  if(before){clauses.push('id<?');values.push(before);}if(through!==null){clauses.push('id<=?');values.push(through);}
  const [rows]=await db.execute(`${SELECT_ACTIVITY} WHERE ${clauses.join(' AND ')} ORDER BY id DESC LIMIT ${limit+1}`,values);
  res.json({success:true,activity:rows.slice(0,limit),hasMore:rows.length>limit});
 }catch(error){fail(res,error);}
};
exports.exportCsv=async(req,res)=>{
 let range,through;try{range=period(req.query);through=snapshot(req.query.through);}catch(error){return res.status(400).json({success:false,message:error.message});}
 try{
  if(through===null){const [rows]=await db.execute('SELECT COALESCE(MAX(id),0) AS max_id FROM report_activity');through=Number(rows[0].max_id);}
  // First query happens before headers, so missing-table errors remain JSON.
  const first=await db.execute(`${SELECT_ACTIVITY} WHERE occurred_at>=? AND occurred_at<? AND id<=? ORDER BY id DESC LIMIT 500`,[range.start,range.endExclusive,through]);
  res.setHeader('Content-Type','text/csv; charset=utf-8');res.setHeader('Content-Disposition',`attachment; filename="PWDConnect-activity-${range.start}-to-${range.end}.csv"`);
  const write=async text=>{if(res.destroyed)throw new Error('Download disconnected.');if(!res.write(text))await new Promise((resolve,reject)=>{const done=()=>{cleanup();resolve();};const closed=()=>{cleanup();reject(new Error('Download disconnected.'));};const cleanup=()=>{res.off('drain',done);res.off('close',closed);};res.once('drain',done);res.once('close',closed);});};
  await write('\uFEFF'+['Date (Asia/Manila)','Activity','Source','Record ID','PWD ID','Name / sender','Role','Name context','Category','Previous status','New status','Details'].map(csvCell).join(',')+'\r\n');
  let rows=first[0];
  while(rows.length){for(const row of rows)await write([row.occurred_at,row.event_type,row.source_table,row.source_id,row.pwd_id,row.person_name,row.person_role,row.person_context,row.category,row.previous_status,row.next_status,row.details].map(csvCell).join(',')+'\r\n');if(rows.length<500)break;const before=rows.at(-1).id;[rows]=await db.execute(`${SELECT_ACTIVITY} WHERE occurred_at>=? AND occurred_at<? AND id<=? AND id<? ORDER BY id DESC LIMIT 500`,[range.start,range.endExclusive,through,before]);}
  res.end();
 }catch(error){if(res.headersSent){console.error('Report CSV error:',error);res.destroy();}else fail(res,error);}
};
