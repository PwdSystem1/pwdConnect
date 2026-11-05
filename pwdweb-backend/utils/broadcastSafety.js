const {problem}=require('./membershipValidation');
const {BARANGAYS,barangay,key}=require('./localProfileRules');
function expectedTime(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))throw problem('Enter the expected calamity date and time in Manila.');
 const instant=Date.parse(value+':00+08:00');
 if(!Number.isFinite(instant)||new Date(instant+28800000).toISOString().slice(0,16)!==value)throw problem('Choose a valid expected date and time.');
 return new Date(instant).toISOString().slice(0,19).replace('T',' ');
}
function audience(body){
 const mode=body.audience_mode||'All';if(!['All','Barangays'].includes(mode))throw problem('Choose all members or selected barangays.');
 if(body.target_barangays!==undefined&&!Array.isArray(body.target_barangays))throw problem('Choose valid target barangays.');
 const targets=[...new Set((body.target_barangays||[]).map(barangay))];
 if(mode==='Barangays'&&!targets.length)throw problem('Select at least one target barangay.');
 return {mode,targets:mode==='All'?[]:targets,expected:expectedTime(body.expected_at)};
}
async function snapshot(c,alertId,staff,config){
 const [members]=await c.execute("SELECT u.id,u.acc_username,u.baranggay FROM userdata u JOIN userlogin l ON BINARY l.acc_username=BINARY u.acc_username LEFT JOIN admin_account_controls ac ON ac.account_kind='member' AND ac.record_id=u.id WHERE u.acc_username IS NOT NULL AND TRIM(u.acc_username)<>'' AND COALESCE(ac.account_status,'Active')='Active' AND COALESCE(ac.must_change_password,0)=0");
 const wanted=new Set(config.targets.map(key));const unique=new Map();
 for(const m of members)if(config.mode==='All'||wanted.has(key(m.baranggay)))unique.set(Number(m.id),m);
 const recipients=[...unique.values()];if(!recipients.length)throw problem('No active PWD login accounts match the selected audience.');
 await c.execute('INSERT INTO broadcast_alert_details(alert_id,expected_at,audience_mode,created_by,created_at) VALUES(?,?,?,?,UTC_TIMESTAMP())',[alertId,config.expected,config.mode,staff]);
 for(const target of config.targets)await c.execute('INSERT INTO broadcast_alert_barangays(alert_id,barangay) VALUES(?,?)',[alertId,target]);
 for(let i=0;i<recipients.length;i+=200){const batch=recipients.slice(i,i+200);await c.execute('INSERT INTO broadcast_alert_recipients(alert_id,member_id,member_username,barangay) VALUES '+batch.map(()=>'(?,?,?,?)').join(','),batch.flatMap(m=>[alertId,m.id,m.acc_username,BARANGAYS.find(b=>key(b)===key(m.baranggay))||m.baranggay||'Not recorded']));}
 return recipients.length;
}
function visibleFor(alias,memberExpression){return `(NOT EXISTS (SELECT 1 FROM broadcast_alert_details bd WHERE bd.alert_id=${alias}.id) OR EXISTS (SELECT 1 FROM broadcast_alert_recipients br WHERE br.alert_id=${alias}.id AND br.member_id=${memberExpression}))`;}
module.exports={expectedTime,audience,snapshot,visibleFor};
