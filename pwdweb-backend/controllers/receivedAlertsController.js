import timestampSql from '../utils/timestampSql.js';
import archive from '../utils/operationalArchive.js';
import db from '../config/db.js';
import membershipValidation from '../utils/membershipValidation.js';
const {timestampUtcSql}=timestampSql,{visible,assertVisible}=archive,{id,problem}=membershipValidation;
const manila=value=>value?new Date(value).toLocaleString('en-PH',{timeZone:'Asia/Manila'}):'';
async function member(c,account){
 if(account?.kind!=='user')throw problem('PWD member access required.',403);
 const [rows]=await c.execute('SELECT id,pwd_id,acc_username,baranggay FROM userdata WHERE BINARY acc_username=? LIMIT 2',[account.username]);
 if(rows.length!==1)throw problem('A unique member record is required.',403);return rows[0];
}
export async function getReceivedAlerts(req,res){try{
 const m=await member(db,req.portalAccount);
 const [received]=await db.execute(`SELECT a.*,${timestampUtcSql('a.created_at')} AS created_at,DATE_FORMAT(d.expected_at,'%Y-%m-%dT%H:%i:%sZ') AS expected_at,d.audience_mode,
 DATE_FORMAT(r.seen_at,'%Y-%m-%dT%H:%i:%sZ') AS my_seen_at,DATE_FORMAT(r.safe_at,'%Y-%m-%dT%H:%i:%sZ') AS my_safe_at
 FROM received_alerts a LEFT JOIN broadcast_alert_details d ON d.alert_id=a.id LEFT JOIN broadcast_alert_recipients r ON r.alert_id=a.id AND r.member_id=?
 WHERE ${visible('broadcast','a.id')} AND (d.alert_id IS NULL OR r.member_id IS NOT NULL) ORDER BY a.id DESC`,[m.id]);
 const [sent]=await db.execute(`SELECT e.*,${timestampUtcSql('e.created_at')} AS created_at FROM emergency_req e WHERE pwd_id=? AND ${visible('emergency','e.id')} ORDER BY e.id DESC`,[m.pwd_id]);
 res.json({success:true,alerts:received.map(a=>({id:a.id,title:a.title,category:a.category||'Announcement',message:a.message||a.details,sender:a.sender||'LGU Staff',priority:a.priority||'GENERAL',created_at:a.created_at,date:manila(a.created_at),expected_at:a.expected_at,my_seen_at:a.my_seen_at,my_safe_at:a.my_safe_at,popup_eligible:Number.isFinite(Date.parse(a.created_at))&&Date.parse(a.created_at)<=Date.now()&&Date.now()-Date.parse(a.created_at)<86400000,type:'Received'})),sentAlerts:sent.map(e=>({id:e.id,title:e.emergency_type,category:e.emergency_type,message:e.details||e.message,sender:e.full_name||'PWD User',priority:'HIGH',status:e.status,created_at:e.created_at,date:manila(e.created_at),type:'Sent'})),sentCount:sent.length});
}catch(e){console.error('Received alerts:',e.code||'validation');res.status(e.status||503).json({success:false,message:e.status?e.message:'Unable to load alert history. Check the update migration.'});}}
export async function recordBroadcastResponse(req,res){let c;try{
 const alertId=id(req.params.id),status=req.body?.status;if(!['seen','safe'].includes(status))throw problem('Choose a valid alert response.');
 c=await db.getConnection();await c.beginTransaction();const m=await member(c,req.portalAccount);
 const [alerts]=await c.execute('SELECT id FROM received_alerts WHERE id=? FOR UPDATE',[alertId]);if(!alerts.length)throw problem('Broadcast not found.',404);await assertVisible(c,'broadcast',alertId);
 const [details]=await c.execute('SELECT alert_id FROM broadcast_alert_details WHERE alert_id=?',[alertId]);
 const [recipients]=await c.execute('SELECT member_id FROM broadcast_alert_recipients WHERE alert_id=? AND member_id=? FOR UPDATE',[alertId,m.id]);
 if(details.length&&!recipients.length)throw problem('This broadcast was not addressed to your account.',403);
 if(!details.length&&!recipients.length)await c.execute('INSERT INTO broadcast_alert_recipients(alert_id,member_id,member_username,barangay) VALUES(?,?,?,?)',[alertId,m.id,m.acc_username,m.baranggay||'Not recorded']);
 await c.execute('UPDATE broadcast_alert_recipients SET seen_at=COALESCE(seen_at,UTC_TIMESTAMP()),safe_at=IF(?=1,COALESCE(safe_at,UTC_TIMESTAMP()),safe_at) WHERE alert_id=? AND member_id=?',[status==='safe'?1:0,alertId,m.id]);
 const [rows]=await c.execute("SELECT DATE_FORMAT(seen_at,'%Y-%m-%dT%H:%i:%sZ') AS my_seen_at,DATE_FORMAT(safe_at,'%Y-%m-%dT%H:%i:%sZ') AS my_safe_at FROM broadcast_alert_recipients WHERE alert_id=? AND member_id=?",[alertId,m.id]);
 await c.commit();res.json({success:true,...rows[0],message:status==='safe'?'Your safe response has been recorded.':'Alert view recorded.'});
}catch(e){if(c)try{await c.rollback();}catch{}res.status(e.status||503).json({success:false,message:e.status?e.message:'Unable to record your alert response.'});}finally{c?.release();}}
