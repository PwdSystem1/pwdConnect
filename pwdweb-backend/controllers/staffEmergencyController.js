const safety=require('../utils/broadcastSafety');
const {problem,id}=require('../utils/membershipValidation');
const {text}=require('../utils/workflowValidation');
const {timestampUtcSql}=require('../utils/timestampSql');
const tracking=require('../utils/requestTracking');
const {visible,assertVisible}=require('../utils/operationalArchive');
const db = require('../config/db');
const alertMail=require('../utils/alertEmailQueue');

// 1. Kunin ang lahat ng Emergency Requests mula sa mga user
exports.getEmergencyRequests = async (req, res) => {
  try {
    const [rows] = await db.query(`SELECT emergency_req.*,${timestampUtcSql("created_at")} AS created_at FROM emergency_req WHERE ${visible('emergency','id')} ORDER BY id DESC`);
    res.json({ success: true, requests: rows });
  } catch (err) {
    console.error("Error fetching emergency requests:", err);
    res.status(500).json({ success: false, message: "Database error" });
  }
};

// 2. I-update ang status ng Emergency Request
exports.updateEmergencyStatus=async(req,res)=>{let c;try{const id=Number(req.params.id),status=req.body?.status;if(!Number.isSafeInteger(id)||id<1||!['Broadcasted','In Progress','Resolved'].includes(status))return res.status(400).json({success:false,message:'Invalid emergency ID or status.'});c=await db.getConnection();await c.beginTransaction();const [rows]=await c.execute(`SELECT emergency_req.*,${timestampUtcSql("created_at")} AS created_at FROM emergency_req WHERE id=? FOR UPDATE`,[id]);if(!rows.length)throw Object.assign(Error('Emergency report not found.'),{status:404});await assertVisible(c,'emergency',id);await c.execute('UPDATE emergency_req SET status=? WHERE id=?',[status,id]);await tracking.event(c,'emergency',rows[0],req.portalAccount,'EmergencyStatusChanged','',status);await c.commit();return res.json({success:true,message:'Emergency status updated.'});}catch(e){if(c)try{await c.rollback();}catch{}return res.status(e.status||503).json({success:false,message:e.status?e.message:'Unable to update emergency status.'});}finally{c?.release();}};

// 3. Kunin ang Broadcast Alert history
exports.getBroadcastAlerts=async(req,res)=>{try{
 const [rows]=await db.execute(`SELECT a.*,${timestampUtcSql('a.created_at')} AS created_at,DATE_FORMAT(d.expected_at,'%Y-%m-%dT%H:%i:%sZ') AS expected_at,d.audience_mode,
 (SELECT GROUP_CONCAT(b.barangay ORDER BY b.barangay SEPARATOR ', ') FROM broadcast_alert_barangays b WHERE b.alert_id=a.id) AS target_barangays,
 (SELECT COUNT(*) FROM broadcast_alert_recipients r WHERE r.alert_id=a.id) AS recipient_count,
 (SELECT COUNT(*) FROM broadcast_alert_recipients r WHERE r.alert_id=a.id AND r.seen_at IS NOT NULL) AS viewed_count,
 (SELECT COUNT(*) FROM broadcast_alert_recipients r WHERE r.alert_id=a.id AND r.safe_at IS NOT NULL) AS safe_count
 FROM received_alerts a LEFT JOIN broadcast_alert_details d ON d.alert_id=a.id WHERE ${visible('broadcast','a.id')} ORDER BY a.id DESC`);
 res.json({success:true,broadcasts:rows});
}catch(e){console.error('Broadcast history:',e.code||'unavailable');res.status(503).json({success:false,message:'Unable to load broadcast history. Install the profile/verification/alert update SQL.'});}};

exports.broadcastResponses=async(req,res)=>{try{
 const alertId=id(req.params.id),page=id(req.query.page||1);if(page>100000)throw problem('Invalid page.');
 await assertVisible(db,'broadcast',alertId);
 const [alerts]=await db.execute('SELECT id FROM received_alerts WHERE id=?',[alertId]);if(!alerts.length)throw problem('Broadcast not found.',404);
 const [summary]=await db.execute('SELECT COUNT(*) AS recipients,COALESCE(SUM(seen_at IS NOT NULL),0) AS viewed,COALESCE(SUM(safe_at IS NOT NULL),0) AS safe FROM broadcast_alert_recipients WHERE alert_id=?',[alertId]);
 const [rows]=await db.execute(`SELECT r.member_id,COALESCE(NULLIF(CONCAT_WS(' ',u.first_name,u.middle_name,u.last_name),''),r.member_username) AS name,r.barangay,DATE_FORMAT(r.seen_at,'%Y-%m-%dT%H:%i:%sZ') AS seen_at,DATE_FORMAT(r.safe_at,'%Y-%m-%dT%H:%i:%sZ') AS safe_at FROM broadcast_alert_recipients r LEFT JOIN userdata u ON u.id=r.member_id WHERE r.alert_id=? ORDER BY r.safe_at IS NULL DESC,r.seen_at IS NULL DESC,r.member_id LIMIT 50 OFFSET ${(page-1)*50}`,[alertId]);
 res.json({success:true,summary:summary[0],rows,page});
}catch(e){res.status(e.status||503).json({success:false,message:e.status?e.message:'Unable to load member responses.'});}};

// 4. Mag-broadcast ng bagong Alert mula sa staff patungong received_alerts
exports.createBroadcastAlert=async(req,res)=>{let c;try{
 const title=text(req.body?.title,'Alert title',255,true),message=text(req.body?.message,'Alert message',10000,true),category=text(req.body?.alert_type||'Announcement','Alert category',100,true),priority=req.body?.priority||'GENERAL';
 if(!['GENERAL','MEDIUM','HIGH','URGENT','LOW'].includes(priority))throw problem('Choose a valid priority.');
 const config=safety.audience(req.body);
 c=await db.getConnection();await c.beginTransaction();
 const [authors]=await c.execute("SELECT CONCAT_WS(' ',first_name,middle_name,last_name) AS name FROM staffdata WHERE BINARY staff_username=? LIMIT 1",[req.portalAccount.username]);
 const sender=authors[0]?.name||req.portalAccount.username;
 const [created]=await c.execute('INSERT INTO received_alerts(title,category,message,sender,priority,created_at) VALUES(?,?,?,?,?,NOW())',[title,category,message,sender,priority]);
 const count=await safety.snapshot(c,created.insertId,req.portalAccount.username,config);
 await alertMail.enqueue(c,created.insertId);await c.commit();
 res.json({success:true,id:created.insertId,recipientCount:count,message:`Broadcast sent to ${count} selected member account(s).`});
}catch(e){if(c)try{await c.rollback();}catch{}console.error('Broadcast create:',e.code||'validation');res.status(e.status||503).json({success:false,message:e.status?e.message:'Unable to send the broadcast. Check the update migration.'});}finally{c?.release();}};
