const workflowNotifications=require('../utils/workflowNotifications');
const archiveNotificationVisible="NOT EXISTS (SELECT 1 FROM portal_archived_records ar WHERE ar.active=1 AND ((ar.kind='broadcast' AND portal_notifications.entity_key=CONCAT('alert:',ar.record_id)) OR (ar.kind='announcement' AND portal_notifications.entity_key LIKE CONCAT('announcement:',ar.record_id,':%')) OR (ar.kind='emergency' AND (portal_notifications.entity_key=CONCAT('staff-emergency:',ar.record_id) OR portal_notifications.entity_key=CONCAT('admin-emergency:',ar.record_id) OR portal_notifications.entity_key LIKE CONCAT('user-emergency:',ar.record_id,':%'))) OR (ar.kind='service' AND (portal_notifications.entity_key=CONCAT('staff-service:',ar.record_id) OR portal_notifications.entity_key=CONCAT('admin-service:',ar.record_id) OR portal_notifications.entity_key LIKE CONCAT('user-service:',ar.record_id,':%') OR portal_notifications.entity_key LIKE CONCAT('service-schedule:',ar.record_id,':%') OR portal_notifications.entity_key LIKE CONCAT('service-escalation:',ar.record_id,':%')))))";
const {missingInformation}=require('../utils/profileCompleteness');
const db = require('../config/db');

// Existing APIs are left unchanged. On each notification poll we discover
// the latest source records and INSERT IGNORE by recipient/event key.
// This prevents duplicate notifications and preserves read status.
async function deliveryNotifications(db,prefix,identity,account,pwdId=''){
 try{
  await db.execute(prefix+`SELECT ?,?,'service_request',CONCAT('birthday-delivery:',id),'Birthday cash delivery recorded',LEFT(CONCAT(person_name,' — ',details),1000),?,NOW() FROM (SELECT id,person_name,details,pwd_id FROM report_activity WHERE event_type='birthday_cash_delivered' AND (?='staff' OR pwd_id=?) ORDER BY id DESC LIMIT 100) source`,[...identity,account.kind==='staff'?'/staff-reports':'/requests',account.kind,account.kind==='staff'?'':pwdId]);
 }catch(e){if(e.code!=='ER_NO_SUCH_TABLE')throw e;}
}

async function synchronize(account) {
  const prefix = 'INSERT IGNORE INTO portal_notifications (recipient_kind,recipient_username,notification_type,entity_key,title,body,target_path,created_at) ';
  const identity = [account.kind,account.username];
  if(['admin','staff'].includes(account.kind))await db.execute(prefix+`SELECT ?,?,'service_request',CONCAT('assistance-feedback:',f.resource,':',f.request_id),'Member feedback received',LEFT(CONCAT(COALESCE(NULLIF(CONCAT_WS(' ',u.first_name,u.last_name),''),f.member_username),' · ',f.resource,' #',f.request_id,' · ',f.rating,'/5 · ',COALESCE(f.comment,'')),1000),CASE WHEN ?='staff' THEN CASE WHEN f.resource='service' THEN '/staff-requests?view=completed' ELSE '/staff-emergency' END ELSE '/admin-reports' END,f.created_at FROM assistance_feedback f LEFT JOIN userdata u ON BINARY u.acc_username=BINARY f.member_username`,[...identity,account.kind]);
  if(account.kind==='admin'){
    await db.execute(prefix+`SELECT ?,?,'service_request',CONCAT('admin-service:',id),'New service request',LEFT(CONCAT(COALESCE(full_name,'PWD Member'),': ',service_type),1000),'/admin-dashboard',COALESCE(created_at,NOW()) FROM (SELECT id,full_name,service_type,created_at FROM service_request ORDER BY id DESC LIMIT 100) source`,identity);
    await db.execute(prefix+`SELECT ?,?,'emergency_request',CONCAT('admin-emergency:',id),'Emergency report',LEFT(CONCAT(COALESCE(full_name,'PWD Member'),': ',emergency_type),1000),'/admin-dashboard',COALESCE(created_at,NOW()) FROM (SELECT id,full_name,emergency_type,created_at FROM emergency_req ORDER BY id DESC LIMIT 100) source`,identity);
    return;
  }
  if (account.kind === 'staff') {
    await deliveryNotifications(db,prefix,identity,account);
    await db.execute(prefix + `SELECT ?,?,'service_request',CONCAT('staff-service:',id),'New service request',
      LEFT(CONCAT(COALESCE(full_name,'PWD Member'),': ',service_type),1000),'/staff-requests',COALESCE(created_at,NOW())
      FROM (SELECT id,full_name,service_type,created_at FROM service_request ORDER BY id DESC LIMIT 100) source`, identity);
    await db.execute(prefix + `SELECT ?,?,'emergency_request',CONCAT('staff-emergency:',id),'New emergency report',
      LEFT(CONCAT(COALESCE(full_name,'PWD Member'),': ',emergency_type,' — ',COALESCE(details,'')),1000),'/staff-emergency',COALESCE(created_at,NOW())
      FROM (SELECT id,full_name,emergency_type,details,created_at FROM emergency_req ORDER BY id DESC LIMIT 100) source`, identity);
    return;
  }
  const [users] = await db.execute('SELECT id,pwd_id,first_name,last_name,sex,birthday,contact_numb,email,occupation,province,municipality,baranggay,street,disability,blood_type,civil_status,expired_date,member_since FROM userdata WHERE BINARY acc_username=? LIMIT 1', [account.username]);
  if (!users.length) return;
  const pwdId=users[0].pwd_id;
  const missing=missingInformation(users[0]);
  if(missing.length){const body='Missing: '+missing.map(f=>f.label).join(', ')+'. Update editable fields in Profile; contact LGU staff for identity, address and ID details.';
   await db.execute(`INSERT INTO portal_notifications(recipient_kind,recipient_username,notification_type,entity_key,title,body,target_path,created_at) VALUES(?,?,'profile','profile-incomplete','Complete your profile information',?,'/profile',UTC_TIMESTAMP()) ON DUPLICATE KEY UPDATE read_at=IF(body<>VALUES(body),NULL,read_at),created_at=IF(body<>VALUES(body),UTC_TIMESTAMP(),created_at),body=VALUES(body)`,[...identity,body.slice(0,1000)]);
  }else await db.execute("DELETE FROM portal_notifications WHERE recipient_kind=? AND recipient_username=? AND entity_key='profile-incomplete'",identity);
  await deliveryNotifications(db,prefix,identity,account,pwdId);
  await db.execute(prefix + `SELECT ?,?,'service_request',CONCAT('user-service:',id,':',SHA2(COALESCE(status,'Pending'),256)),
    LEFT(CONCAT('Service request: ',COALESCE(status,'Pending')),255),LEFT(CONCAT(service_type,' — ',COALESCE(description,'')),1000),'/requests',NOW()
    FROM (SELECT id,status,service_type,description FROM service_request WHERE pwd_id=? ORDER BY id DESC LIMIT 100) source`, [...identity,pwdId]);
  await db.execute(prefix + `SELECT ?,?,'emergency_request',CONCAT('user-emergency:',id,':',SHA2(COALESCE(status,'Broadcasted'),256)),
    LEFT(CONCAT('Emergency report: ',COALESCE(status,'Broadcasted')),255),LEFT(CONCAT(emergency_type,' — ',COALESCE(details,'')),1000),'/emergency',NOW()
    FROM (SELECT id,status,emergency_type,details FROM emergency_req WHERE pwd_id=? ORDER BY id DESC LIMIT 100) source`, [...identity,pwdId]);
  await db.execute(prefix + `SELECT ?,?,'announcement',CONCAT('announcement:',id,':',SHA2(CONCAT(title,CHAR(0),content),256)),
    LEFT(CONCAT('Announcement: ',title),255),LEFT(content,1000),'/announcements',NOW()
    FROM (SELECT a.id,a.title,a.content FROM announcements a LEFT JOIN announcement_metadata m ON m.announcement_id=a.id WHERE COALESCE(m.status,'Published')='Published' ORDER BY a.id DESC LIMIT 100) source`, identity);
  await db.execute("DELETE n FROM portal_notifications n JOIN announcement_metadata m ON n.entity_key LIKE CONCAT('announcement:',m.announcement_id,':%') WHERE n.recipient_kind=? AND n.recipient_username=? AND n.notification_type='announcement' AND m.status='Hidden'",identity);
  await db.execute(prefix + `SELECT ?,?,'alert',CONCAT('alert:',id),LEFT(CONCAT('Alert: ',title),255),LEFT(COALESCE(message,''),1000),'/received-alerts',COALESCE(created_at,NOW())
    FROM (SELECT id,title,message,created_at FROM received_alerts ORDER BY id DESC LIMIT 100) source`, identity);
}

function validId(value) {
  if (!/^[1-9]\d*$/.test(String(value))) return null;
  const result=Number(value);
  return Number.isSafeInteger(result) && result <= 4294967295 ? result : null;
}
function failure(res,error) {
  console.error('Notification API error:',error);
  res.status(500).json({success:false,message:'Unable to load notifications. Check the new SQL tables and existing source-table columns.'});
}

exports.getNotifications=async(req,res)=>{
  const account=req.portalAccount;
  const before=req.query.before?validId(req.query.before):null;
  if(req.query.before&&!before)return res.status(400).json({success:false,message:'Invalid notification cursor.'});
  try {
    await synchronize(account);
    await workflowNotifications.synchronize(account);
    const [rows]=await db.execute(`SELECT id,notification_type,title,body,target_path,created_at,read_at
      FROM portal_notifications WHERE recipient_kind=? AND recipient_username=? AND ${archiveNotificationVisible} ${before?'AND id < ?':''} ORDER BY id DESC LIMIT 51`,
      before?[account.kind,account.username,before]:[account.kind,account.username]);
    const [counts]=await db.execute(`SELECT COUNT(*) AS unread_count FROM portal_notifications WHERE recipient_kind=? AND recipient_username=? AND read_at IS NULL AND ${archiveNotificationVisible}`,[account.kind,account.username]);
    res.json({success:true,notifications:rows.slice(0,50),hasMore:rows.length>50,unreadCount:Number(counts[0].unread_count)});
  }catch(error){failure(res,error);}
};

exports.markNotificationRead=async(req,res)=>{
  const notificationId=validId(req.params.id);
  if(!notificationId)return res.status(400).json({success:false,message:'Invalid notification ID.'});
  const account=req.portalAccount;
  try{
    const [rows]=await db.execute('SELECT id FROM portal_notifications WHERE id=? AND recipient_kind=? AND recipient_username=?',[notificationId,account.kind,account.username]);
    if(!rows.length)return res.status(404).json({success:false,message:'Notification not found.'});
    await db.execute('UPDATE portal_notifications SET read_at=COALESCE(read_at,NOW()) WHERE id=? AND recipient_kind=? AND recipient_username=?',[notificationId,account.kind,account.username]);
    res.json({success:true});
  }catch(error){failure(res,error);}
};

exports.markAllRead=async(req,res)=>{
  const upToId=validId(req.body?.up_to_id);
  if(!upToId)return res.status(400).json({success:false,message:'Provide the latest displayed notification ID.'});
  const account=req.portalAccount;
  try{
    await db.execute('UPDATE portal_notifications SET read_at=COALESCE(read_at,NOW()) WHERE recipient_kind=? AND recipient_username=? AND id<=?',[account.kind,account.username,upToId]);
    res.json({success:true});
  }catch(error){failure(res,error);}
};

