const v=require('./workflowValidation');
async function register(c,values,username,exceptQueue=0){
 if(values.acc_username)throw v.problem('Staff register official personal records only. Admin assigns login access through User Management.');
 const expiry=v.date(values.expired_date,'Official ID expiry');if(expiry<v.manilaToday())throw v.problem('Use a valid government-issued ID expiry for this official record.');
 const [existing]=await c.execute('SELECT id FROM userdata WHERE pwd_id=? FOR UPDATE',[values.pwd_id]);
 if(existing.length)throw v.problem('This PWD ID already exists in the masterlist. Edit the existing record instead of adding a duplicate.',409);
 const [pending]=await c.execute("SELECT id FROM membership_approval_queue WHERE pwd_id=? AND id<>? AND status IN ('Pending','ChangesRequested') FOR UPDATE",[values.pwd_id,exceptQueue]);
 if(pending.length)throw v.problem('This PWD ID has a pending online approval or earlier staff submission. Process that entry first.',409);
 const keys=Object.keys(values);const [r]=await c.execute(`INSERT INTO userdata(${keys.join(',')}) VALUES(${keys.map(()=>'?').join(',')})`,keys.map(k=>values[k]));
 await c.execute("INSERT INTO report_activity(event_key,event_type,source_table,source_id,pwd_id,person_name,category,previous_status,next_status,details,occurred_at) VALUES(?,'MemberRegisteredByStaff','userdata',?,?,?,?,'','Registered',?,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 8 HOUR))",['staff-registration:'+r.insertId,r.insertId,values.pwd_id,[values.first_name,values.middle_name,values.last_name].filter(Boolean).join(' '),values.disability||'',`LGU Staff: ${username} · Official member registered; no login account created.`]);
 return r.insertId;
}
module.exports={register};
