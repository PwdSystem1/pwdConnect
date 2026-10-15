const db=require('../config/db');
const {visible}=require('../utils/operationalArchive');
const labels={emergency:'Resolved emergency reports',broadcast:'Staff broadcasts',service:'Completed service requests',announcement:'Announcements'};
const sources={
 emergency:{from:'emergency_req r',when:'r.created_at',title:"COALESCE(r.full_name,'PWD member')",status:'r.status',eligible:"r.status='Resolved'"},
 broadcast:{from:'received_alerts r',when:'r.created_at',title:'r.title',status:"'Broadcast'",eligible:'1=1'},
 service:{from:'service_request r',when:'r.created_at',title:"CONCAT(COALESCE(r.full_name,'PWD member'),' — ',r.service_type)",status:"IF(r.status='Rejected','Rejected','Delivered')",eligible:"(r.status='Rejected' OR (r.status='Approved' AND EXISTS (SELECT 1 FROM service_assistance_deliveries d WHERE d.request_id=r.id)))"},
 announcement:{from:'announcements r JOIN announcement_metadata m ON m.announcement_id=r.id',when:'m.updated_at',title:'r.title',status:"COALESCE(m.status,'Published')",eligible:'m.updated_at IS NOT NULL'}
};
const invalid=(message,status=400)=>Object.assign(Error(message),{status});
function id(value){if(!/^[1-9]\d*$/.test(String(value)))throw invalid('Invalid cleanup ID.');const n=Number(value);if(!Number.isSafeInteger(n))throw invalid('Invalid cleanup ID.');return n;}
function filter(body){
 const kind=body?.kind,date=body?.beforeDate,reason=typeof body?.reason==='string'?body.reason.trim():'';
 if(!Object.hasOwn(sources,kind))throw invalid('Choose a cleanup category.');
 if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date+'T00:00:00Z'))||new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date)throw invalid('Choose a valid cutoff date.');
 const boundary=Date.parse(date+'T00:00:00+08:00'),now=Date.now();
 const today=new Date(now+8*3600000).toISOString().slice(0,10);
 if(date>today||date<'2000-01-01')throw invalid('Choose a cutoff between 2000 and today.');
 if(reason.length<5||reason.length>300)throw invalid('Enter a cleanup reason (5–300 characters).');
 // Emergency/service/broadcast timestamps are recorded in the DB session time zone.
 // Announcement metadata explicitly stores UTC.
 return {kind,date,reason,cutoff:new Date(boundary).toISOString().slice(0,19).replace('T',' ')};
}
function where(f){const s=sources[f.kind],boundary=f.kind==='announcement'?'?':"DATE_ADD(?,INTERVAL TIMESTAMPDIFF(SECOND,UTC_TIMESTAMP(),NOW()) SECOND)";return `${s.when}<${boundary} AND ${s.eligible} AND ${visible(f.kind,'r.id')}`;}
function select(f){const s=sources[f.kind];return `SELECT r.id,LEFT(${s.title},180) AS title,${s.status} AS status,DATE_FORMAT(${s.when},'%Y-%m-%d %H:%i:%s') AS source_date FROM ${s.from} WHERE ${where(f)}`;}
function fail(res,e){console.error('System settings:',e.status?'request rejected':e.code||'unavailable');return res.status(e.status||503).json({success:false,message:e.status?e.message:'System Settings is unavailable. Import database/system-settings.sql and check the backend logs.'});}
async function transaction(fn){const c=await db.getConnection();try{await c.beginTransaction();const result=await fn(c);await c.commit();return result;}catch(e){try{await c.rollback();}catch{}throw e;}finally{c.release();}}
async function lock(c){await c.execute('SELECT id FROM portal_cleanup_lock WHERE id=1 FOR UPDATE');}
async function storage(c,kind){
 const tables=['portal_cleanup_lock','portal_cleanup_batches','portal_archived_records',...({emergency:['emergency_req'],broadcast:['received_alerts'],service:['service_request','service_assistance_deliveries'],announcement:['announcements','announcement_metadata']}[kind]||[])];
 const [rows]=await c.execute(`SELECT TABLE_NAME AS name,ENGINE AS engine FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN (${tables.map(()=>'?').join(',')})`,tables);
 const unsupported=tables.filter(name=>!rows.some(r=>r.name===name&&String(r.engine).toUpperCase()==='INNODB'));
 if(unsupported.length)throw invalid('Transactional cleanup requires installed InnoDB tables: '+unsupported.join(', ')+'. Check the installation guide.',503);
}
function records(batch){const rows=JSON.parse(batch.records_json);if(!Array.isArray(rows)||!rows.length||rows.length>500||rows.some(r=>!Number.isSafeInteger(Number(r.id))||Number(r.id)<1))throw invalid('Cleanup preview is invalid. Create a fresh preview.',409);return rows;}
exports.summary=async(req,res)=>{try{const [rows]=await db.execute('SELECT kind,COUNT(*) AS total FROM portal_archived_records WHERE active=1 GROUP BY kind');return res.json({success:true,archived:Object.fromEntries(Object.keys(labels).map(k=>[k,Number(rows.find(r=>r.kind===k)?.total||0)]))});}catch(e){return fail(res,e);}};
exports.preview=async(req,res)=>{try{const f=filter(req.body);const data=await transaction(async c=>{
 await storage(c,f.kind);
 const [counts]=await c.execute(`SELECT COUNT(*) AS total FROM ${sources[f.kind].from} WHERE ${where(f)}`,[f.cutoff]);
 const [rows]=await c.execute(select(f)+` ORDER BY ${sources[f.kind].when},r.id LIMIT 500`,[f.cutoff]);
 if(!rows.length)return {batchId:null,total:0,count:0,records:[],message:'No eligible records match this filter.'};
 const [created]=await c.execute("INSERT INTO portal_cleanup_batches(admin_id,admin_username,kind,before_date,reason,records_json,record_count,state,created_at,expires_at) VALUES(?,?,?,?,?,?,?,'Preview',UTC_TIMESTAMP(),DATE_ADD(UTC_TIMESTAMP(),INTERVAL 10 MINUTE))",[req.portalAccount.id,req.portalAccount.username,f.kind,f.date,f.reason,JSON.stringify(rows),rows.length]);
 return {batchId:created.insertId,total:Number(counts[0].total),count:rows.length,records:rows,expiresInSeconds:600};
 });return res.json({success:true,...data});}catch(e){return fail(res,e);}};
exports.archive=async(req,res)=>{try{const batchId=id(req.params.id);if(req.body?.confirm!==true)throw invalid('Confirm the preview before archiving.');const count=await transaction(async c=>{
 await lock(c);
 const [batches]=await c.execute("SELECT *,DATE_FORMAT(before_date,'%Y-%m-%d') AS cutoff_date,expires_at>UTC_TIMESTAMP() AS valid FROM portal_cleanup_batches WHERE id=? FOR UPDATE",[batchId]);const b=batches[0];
 if(!b||Number(b.admin_id)!==Number(req.portalAccount.id))throw invalid('Cleanup preview not found.',404);
 await storage(c,b.kind);
 if(b.state!=='Preview'||!b.valid)throw invalid('This preview expired or was already applied. Create a fresh preview.',409);
 const original=records(b),f=filter({kind:b.kind,beforeDate:b.cutoff_date,reason:b.reason});
 const ids=original.map(r=>Number(r.id));
 const [current]=await c.execute(select(f)+` AND r.id IN (${ids.map(()=>'?').join(',')}) FOR UPDATE`,[f.cutoff,...ids]);
 if(current.length!==ids.length||current.some(r=>{const prior=original.find(p=>Number(p.id)===Number(r.id));return prior.title!==r.title||prior.status!==r.status||prior.source_date!==r.source_date;}))throw invalid('Records changed after your preview. Nothing was archived; create a fresh preview.',409);
 for(const recordId of ids)await c.execute('INSERT INTO portal_archived_records(kind,record_id,batch_id,active) VALUES(?,?,?,1) ON DUPLICATE KEY UPDATE batch_id=VALUES(batch_id),active=1',[b.kind,recordId,batchId]);
 await c.execute("UPDATE portal_cleanup_batches SET state='Archived',archived_at=UTC_TIMESTAMP() WHERE id=?",[batchId]);return ids.length;
 });return res.json({success:true,id:batchId,count,message:`${count} records archived. Report and audit history are retained.`});}catch(e){return fail(res,e);}};
exports.restore=async(req,res)=>{try{const batchId=id(req.params.id);if(req.body?.confirm!==true)throw invalid('Confirm restoration first.');const count=await transaction(async c=>{
 await lock(c);const [rows]=await c.execute('SELECT * FROM portal_cleanup_batches WHERE id=? FOR UPDATE',[batchId]);const b=rows[0];if(!b||b.state!=='Archived')throw invalid('This archived batch is unavailable or already restored.',409);
 await storage(c,b.kind);
 const [result]=await c.execute('UPDATE portal_archived_records SET active=0 WHERE batch_id=? AND active=1',[batchId]);
 await c.execute("UPDATE portal_cleanup_batches SET state='Restored',restored_at=UTC_TIMESTAMP(),restored_by=? WHERE id=?",[req.portalAccount.username,batchId]);return result.affectedRows;
 });return res.json({success:true,id:batchId,count,message:`${count} records restored to their previous visibility and status.`});}catch(e){return fail(res,e);}};
exports.history=async(req,res)=>{try{const page=Number(req.query.page||1);if(!Number.isSafeInteger(page)||page<1||page>100000)throw invalid('Invalid page.');const [counts]=await db.execute("SELECT COUNT(*) AS total FROM portal_cleanup_batches WHERE state<>'Preview'");const [rows]=await db.execute(`SELECT id,kind,before_date,reason,record_count,state,admin_username,DATE_FORMAT(archived_at,'%Y-%m-%dT%H:%i:%sZ') AS archived_at,DATE_FORMAT(restored_at,'%Y-%m-%dT%H:%i:%sZ') AS restored_at,restored_by FROM portal_cleanup_batches WHERE state<>'Preview' ORDER BY id DESC LIMIT 20 OFFSET ${(page-1)*20}`);return res.json({success:true,rows,total:Number(counts[0].total),page});}catch(e){return fail(res,e);}};
exports.detail=async(req,res)=>{try{const batchId=id(req.params.id);const [rows]=await db.execute('SELECT records_json,state,record_count FROM portal_cleanup_batches WHERE id=?',[batchId]);if(!rows.length)throw invalid('Cleanup batch not found.',404);return res.json({success:true,records:records(rows[0]),state:rows[0].state,count:rows[0].record_count});}catch(e){return fail(res,e);}};
exports.filter=filter;
