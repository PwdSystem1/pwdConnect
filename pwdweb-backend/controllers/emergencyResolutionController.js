const {db,problem,id,context,rollback,fail}=require('../utils/qrWorkflow');
const {text}=require('../utils/workflowValidation');
const {timestampUtcSql}=require('../utils/timestampSql');
const {visible,assertVisible}=require('../utils/operationalArchive');
const tracking=require('../utils/requestTracking');
function staff(req){if(req.portalAccount?.kind!=='staff')throw problem('Active Staff access is required.',403);}
exports.requests=async(req,res)=>{try{
 staff(req);const e=await context(db,req.params.eventId,req.portalAccount.username);
 const [rows]=await db.execute(`SELECT r.id,r.pwd_id,r.emergency_type,r.location,r.details,r.status,${timestampUtcSql('r.created_at')} AS created_at,x.id AS resolution_id,x.responder_name,x.responder_office,x.notes AS resolution_notes,x.staff_username AS resolved_by,DATE_FORMAT(x.resolved_at,'%Y-%m-%dT%H:%i:%sZ') AS resolved_at FROM emergency_req r JOIN userdata u ON u.pwd_id=r.pwd_id LEFT JOIN emergency_resolution_records x ON x.emergency_id=r.id WHERE u.id=? AND ${visible('emergency','r.id')} ORDER BY r.id DESC`,[e.member_id]);
 res.json({success:true,requests:rows});
}catch(error){fail(res,error);}};
exports.resolve=async(req,res)=>{let c;try{
 staff(req);if(req.body?.identity_checked!==true||req.body?.response_completed!==true)throw problem('Confirm the member identity and that the actual emergency response has been completed.');
 const requestId=id(req.body.emergency_id),name=text(req.body.responder_name,'Responding official / representative',150,true),office=text(req.body.responder_office,'Responding office / organization',150,true),notes=text(req.body.notes,'Actual response and outcome',2000,true);
 c=await db.getConnection();await c.beginTransaction();const e=await context(c,req.params.eventId,req.portalAccount.username);
 const [rows]=await c.execute('SELECT r.* FROM emergency_req r JOIN userdata u ON u.pwd_id=r.pwd_id WHERE r.id=? AND u.id=? FOR UPDATE',[requestId,e.member_id]);
 if(rows.length!==1)throw problem('This emergency does not belong to the scanned or searched member.',404);
 const r=rows[0];await assertVisible(c,'emergency',r.id);
 if(!['Broadcasted','In Progress'].includes(r.status))throw problem('Only an unresolved emergency can be validated.',409);
 const [saved]=await c.execute('SELECT id FROM emergency_resolution_records WHERE emergency_id=?',[r.id]);if(saved.length)throw problem('This emergency already has a recorded resolution.',409);
 await c.execute('INSERT INTO emergency_resolution_records(emergency_id,member_id,verification_event_id,staff_username,responder_name,responder_office,notes,resolved_at) VALUES(?,?,?,?,?,?,?,UTC_TIMESTAMP())',[r.id,e.member_id,e.id,req.portalAccount.username,name,office,notes]);
 await c.execute("UPDATE emergency_req SET status='Resolved' WHERE id=?",[r.id]);
 await tracking.event(c,'emergency',r,req.portalAccount,'EmergencyResponseValidated',`QR / PWD ID lookup #${e.id}. Responding official: ${name}. Office: ${office}. Actual response: ${notes}`,'Resolved');
 await c.commit();res.status(201).json({success:true,requestId:r.id,message:'Member identity and completed emergency response recorded. This report is now Resolved.'});
}catch(error){await rollback(c);fail(res,error);}finally{c?.release();}};
