const tracking=require('../utils/requestTracking');
const {visible,assertVisible}=require('../utils/operationalArchive');
const db = require('../config/db');
const alertMail=require('../utils/alertEmailQueue');

// 1. Kunin ang lahat ng Emergency Requests mula sa mga user
exports.getEmergencyRequests = async (req, res) => {
  try {
    const [rows] = await db.query(`SELECT * FROM emergency_req WHERE ${visible('emergency','id')} ORDER BY id DESC`);
    res.json({ success: true, requests: rows });
  } catch (err) {
    console.error("Error fetching emergency requests:", err);
    res.status(500).json({ success: false, message: "Database error" });
  }
};

// 2. I-update ang status ng Emergency Request
exports.updateEmergencyStatus=async(req,res)=>{let c;try{const id=Number(req.params.id),status=req.body?.status;if(!Number.isSafeInteger(id)||id<1||!['Broadcasted','In Progress','Resolved'].includes(status))return res.status(400).json({success:false,message:'Invalid emergency ID or status.'});c=await db.getConnection();await c.beginTransaction();const [rows]=await c.execute('SELECT * FROM emergency_req WHERE id=? FOR UPDATE',[id]);if(!rows.length)throw Object.assign(Error('Emergency report not found.'),{status:404});await assertVisible(c,'emergency',id);await c.execute('UPDATE emergency_req SET status=? WHERE id=?',[status,id]);await tracking.event(c,'emergency',rows[0],req.portalAccount,'EmergencyStatusChanged','',status);await c.commit();return res.json({success:true,message:'Emergency status updated.'});}catch(e){if(c)try{await c.rollback();}catch{}return res.status(e.status||503).json({success:false,message:e.status?e.message:'Unable to update emergency status.'});}finally{c?.release();}};

// 3. Kunin ang Broadcast Alert history
exports.getBroadcastAlerts = async (req, res) => {
  try {
    const [rows] = await db.query(`SELECT * FROM received_alerts WHERE ${visible('broadcast','id')} ORDER BY id DESC`);
    res.json({ success: true, broadcasts: rows });
  } catch (err) {
    console.error("Error fetching broadcast alerts:", err);
    res.status(500).json({ success: false, message: "Database error" });
  }
};

// 4. Mag-broadcast ng bagong Alert mula sa staff patungong received_alerts
exports.createBroadcastAlert = async (req, res) => {
  try {
    const { title, alert_type, priority, message, staff_name } = req.body;
    
    const category = alert_type || "Announcement";
    const [authors]=await db.execute("SELECT CONCAT_WS(' ',first_name,middle_name,last_name) AS name FROM staffdata WHERE BINARY staff_username=? LIMIT 1",[req.portalAccount.username]);
    const sender=authors[0]?.name||req.portalAccount.username;

    const query = "INSERT INTO received_alerts (title, category, message, sender, priority, created_at) VALUES (?, ?, ?, ?, ?, NOW())";
    
    let result;const c=await db.getConnection();try{await c.beginTransaction();[result]=await c.query(query,[title,category,message,sender,priority||'MEDIUM']);await alertMail.enqueue(c,result.insertId);await c.commit();}catch(e){await c.rollback();throw e;}finally{c.release();}
    
    res.json({ success: true, message: "Broadcast alert sent successfully", id: result.insertId });
  } catch (err) {
    console.error("Error inserting broadcast alert:", err);
    res.status(500).json({ success: false, message: "Database error" });
  }
};