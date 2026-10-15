const resetGate=require('./resetGate');
const audit=require('../utils/systemAudit');
// Route metadata is fixed here: never store raw URLs, bodies, tokens or messages.
function event(method,path){
 const write=['POST','PUT','PATCH','DELETE'].includes(method),operation={POST:'created',PUT:'updated',PATCH:'updated',DELETE:'deleted'}[method];
 if(method==='POST'&&path==='/api/admin-settings/full-reset/apply')return {category:'Settings',action:'full_system_reset',target:'System reset'};
 if(/^\/api\/admin-settings(?:\/|$)/.test(path)){if(method==='POST'&&path.endsWith('/archive'))return {category:'Settings',action:'operational_records_archived',target:'Cleanup batch'};if(method==='POST'&&path.endsWith('/restore'))return {category:'Settings',action:'operational_records_restored',target:'Cleanup batch'};return null;}
 if(path==='/api/login'&&method==='POST')return {category:'Authentication',action:'login',target:'Account'};
 if(path==='/api/logout'&&method==='POST')return {category:'Authentication',action:'logout',target:'Account'};
 if(!write){
  if(method==='GET'&&/^\/api\/(staff|admin)-reports(?:\/export\.csv)?$/.test(path))return {category:'Reports',action:path.endsWith('.csv')?'report_exported':'report_generated',target:'Activity report'};
  if(method==='GET'&&/^\/api\/users\/pwd-members$/.test(path))return {category:'Members',action:'masterlist_viewed',target:'Member register'};
  if(method==='GET'&&/^\/api\/admin-users\/(member|staff|unverified)\/\d+$/.test(path))return {category:'Accounts',action:'details_viewed',target:'Account record'};
  if(method==='GET'&&/^\/api\/admin-approvals\/\d+$/.test(path))return {category:'Membership',action:'application_viewed',target:'Membership application'};
  if(method==='GET'&&/^\/api\/qr\/events\/\d+\/details$/.test(path))return {category:'QR',action:'member_details_viewed',target:'QR verification record'};
  return null;
 }
 if(/^\/api\/(speech|notifications)(\/|$)/.test(path)||/^\/api\/messages\/.*\/read$/.test(path)||/^\/api\/announcements\/\d+\/view$/.test(path)||path==='/api/qr/my')return null;
 if(/^\/api\/registration(?:\/|$)/.test(path))return {category:'Verification',action:path.endsWith('/verify')?'email_verified':path.endsWith('/resend')?'verification_email_requested':'account_registration_requested',target:'Applicant account'};
 if(/^\/api\/password-recovery(?:\/|$)/.test(path))return {category:'Passwords',action:path.endsWith('/reset')?'password_reset':'password_reset_requested',target:'Account'};
 if(/^\/api\/password-change(?:\/|$)/.test(path))return {category:'Passwords',action:path.endsWith('/self')?'password_changed':'initial_password_changed',target:'Account'};
 if(/^\/api\/profile-email(?:\/|$)/.test(path))return {category:'Verification',action:'profile_email_'+(path.endsWith('/verify')?'confirmed':path.endsWith('/cancel')?'cancelled':'requested'),target:'Member email'};
 if(/^\/api\/admin-users(?:\/|$)/.test(path))return {category:'Accounts',action:/(reset|password)/.test(path)?'admin_password_reset':path.endsWith('/create-login')?'login_access_created':path.endsWith('/restore')?'account_restored':method==='DELETE'?'account_archived':'account_'+operation,target:'Account record'};
 if(/^\/api\/admin-approvals(?:\/|$)/.test(path))return {category:'Membership',action:'application_reviewed',target:'Membership application'};
 if(/^\/api\/admin-announcements(?:\/|$)/.test(path))return {category:'Announcements',action:'announcement_visibility_updated',target:'Announcement'};
 if(/^\/api\/staff-membership(?:\/|$)/.test(path))return {category:'Membership',action:path.endsWith('/register')?'member_created':path.endsWith('/action')?'staff_application_reviewed':'staff_membership_updated',target:'Staff membership review'};
 if(/^\/api\/request-tracking(?:\/|$)/.test(path))return {category:'Services',action:path.endsWith('/feedback')?'assistance_feedback_submitted':path.endsWith('/schedule')?'service_scheduled':path.endsWith('/delay')?'service_delay_recorded':'service_request_updated',target:'Request tracking'};
 if(/^\/api\/applicant(?:\/|$)/.test(path))return {category:'Membership',action:path.endsWith('/profile')?'applicant_profile_updated':path.endsWith('/application')?'application_submitted':'member_portal_entered',target:path.endsWith('/application')?'Membership application':'Applicant account'};
 if(/^\/api\/users\/pwd-members(?:\/|$)/.test(path))return {category:'Members',action:'member_'+operation,target:'Member record'};
 if(/^\/api\/(staff-profile|users\/profile)(?:\/|$)/.test(path))return {category:'Profiles',action:'profile_updated',target:'Profile'};
 if(/^\/api\/service-requests(?:\/|$)/.test(path))return {category:'Services',action:method==='POST'?'service_request_submitted':'service_request_updated',target:'Service request'};
 if(/^\/api\/staff-birthday-requests(?:\/|$)/.test(path))return {category:'Services',action:'birthday_request_created',target:'Service request'};
 if(/^\/api\/emergency(?:\/|$)/.test(path))return {category:'Emergencies',action:'emergency_report_submitted',target:'Emergency report'};
 if(/^\/api\/emergency-requests(?:\/|$)/.test(path))return {category:'Emergencies',action:'emergency_status_updated',target:'Emergency report'};
 if(/^\/api\/broadcast-alerts(?:\/|$)/.test(path))return {category:'Emergencies',action:'alert_broadcast',target:'Broadcast alert'};
 if(/^\/api\/announcements(?:\/|$)/.test(path))return {category:'Announcements',action:'announcement_'+operation,target:'Announcement'};
 if(/^\/api\/messages(?:\/|$)/.test(path))return {category:'Communications',action:path.endsWith('/messages')?'message_sent':'conversation_created',target:'Conversation'};
 if(/^\/api\/qr(?:\/|$)/.test(path))return {category:'QR',action:path.endsWith('/deliveries')?'assistance_delivered':path.endsWith('/regenerate')?'qr_regenerated':'member_lookup',target:path.endsWith('/deliveries')?'Service delivery':'QR identification'};
 return {category:'Other',action:'record_'+operation,target:'System action'};
}
module.exports=function systemAudit(req,res,next){
 const entry=event(req.method,(req.originalUrl||req.url).split('?')[0]);if(!entry)return next();
 const json=res.json.bind(res);let handled=false;
 res.json=function(payload){if(handled)return json(payload);handled=true;return audit.record(req,res,payload,entry).catch(e=>{console.error('Audit write failed:',e.code||'unavailable');res.setHeader('X-Audit-Status','unavailable');}).then(()=>json(payload));};
 res.once('finish',()=>{if(!handled){handled=true;resetGate.trackWork(()=>audit.record(req,res,null,entry)).catch(e=>console.error('Audit stream write failed:',e.code||'unavailable'));}});
 res.once('close',()=>{if(!handled&&!res.writableEnded){handled=true;res.locals.auditAborted=true;resetGate.trackWork(()=>audit.record(req,res,{success:false},entry)).catch(e=>console.error('Audit interrupted stream write failed:',e.code||'unavailable'));}});
 next();
};
module.exports.event=event;
