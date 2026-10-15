const v=require('./membershipValidation');
const ACCOUNT_SELECT=`SELECT id,username,email,approval_status,profile_json,profile_revision,DATE_FORMAT(profile_completed_at,'%Y-%m-%d %H:%i:%s') AS profile_completed_at,DATE_FORMAT(email_verified_at,'%Y-%m-%d %H:%i:%s') AS email_verified_at,DATE_FORMAT(created_at,'%Y-%m-%d %H:%i:%s') AS created_at FROM pending_accounts`;
const APPLICATION_SELECT=`SELECT id,account_id,status,revision,application_kind,claimed_pwd_id,profile_json,review_notes,pwd_id,member_id,DATE_FORMAT(expired_date,'%Y-%m-%d') AS expired_date,DATE_FORMAT(submitted_at,'%Y-%m-%d %H:%i:%s') AS submitted_at,DATE_FORMAT(reviewed_at,'%Y-%m-%d %H:%i:%s') AS reviewed_at FROM membership_applications`;
const RECORD_SELECT=`SELECT id,first_name,middle_name,last_name,acc_username,pwd_id,email,disability,DATE_FORMAT(birthday,'%Y-%m-%d') AS birthday,DATE_FORMAT(expired_date,'%Y-%m-%d') AS expired_date,DATE_FORMAT(member_since,'%Y-%m-%d') AS member_since FROM userdata`;
function serialize(row){if(!row)return null;const {profile_json,...value}=row;return {...value,profile:profile_json?JSON.parse(profile_json):null};}
const normal=value=>String(value||'').normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('en-PH');
function samePerson(profile,record){return profile.birthday===record.birthday&&normal(profile.first_name)===normal(record.first_name)&&normal(profile.last_name)===normal(record.last_name);}
async function approveMember(connection,account,application,body){
 if(!/^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/.test(account.password_hash))throw v.problem('The account password is unavailable. Contact the system administrator.',409);
 const profile=v.profile(JSON.parse(application.profile_json),true);
 let memberId,pwdId,expiry;
 if(application.application_kind==='ExistingPWD'){
  if(body.identity_confirmed!==true)throw v.problem('Confirm that identity was checked against the LGU record.');
  pwdId=application.claimed_pwd_id;
  const [records]=await connection.execute(RECORD_SELECT+' WHERE pwd_id=? FOR UPDATE',[pwdId]);
  if(records.length!==1)throw v.problem('No unique LGU record matches the claimed ID. Request changes or reject; do not create a duplicate record.',409);
  const record=records[0];
  if(!samePerson(profile,record))throw v.problem('The submitted name or birthday does not match the LGU record. Request corrections before approval.',409);
  if(!record.expired_date||record.expired_date<v.manilaToday())throw v.problem('The existing ID has no valid expiry or is expired. The office must update/renew the official record before verification.',409);
  const [linked]=await connection.execute("SELECT id FROM membership_applications WHERE member_id=? AND status='Approved' LIMIT 1",[record.id]);
  const [logins]=await connection.execute('SELECT acc_username FROM userlogin WHERE acc_username=? OR (?<>"" AND acc_username=?) LIMIT 1',[account.username,record.acc_username,record.acc_username]);
  const [reserved]=await connection.execute('SELECT id FROM pending_accounts WHERE username=? AND id<>? LIMIT 1',[record.acc_username,account.id]);
  if(linked.length||logins.length||reserved.length)throw v.problem('This record is already linked to an account. Use the existing account; this page cannot replace another account or its password.',409);
  // Link the existing government record; preserve its official personal data, ID and membership date.
  await connection.execute('UPDATE userdata SET acc_username=? WHERE id=?',[account.username,record.id]);
  memberId=record.id;expiry=record.expired_date;
 }else{
  pwdId=typeof body.pwd_id==='string'?body.pwd_id.trim():'';
  if(!pwdId||Array.from(pwdId).length>50)throw v.problem('Enter the actual government-issued PWD ID, up to 50 characters.');
  expiry=v.date(body.expired_date,'PWD ID expiry');
  if(expiry<v.manilaToday())throw v.problem('PWD ID expiry cannot be in the past.');
  const [duplicates]=await connection.execute('SELECT id FROM userdata WHERE pwd_id=? OR acc_username=? LIMIT 1',[pwdId,account.username]);
  const [logins]=await connection.execute('SELECT acc_username FROM userlogin WHERE acc_username=? LIMIT 1',[account.username]);
  if(duplicates.length||logins.length)throw v.problem('The ID or username already exists. Use existing-record verification instead of creating another record.',409);
  const member={...profile,email:account.email,age:v.ageOf(profile.birthday),pwd_id:pwdId,acc_username:account.username,expired_date:expiry,member_since:v.manilaToday()};
  const keys=Object.keys(member);
  const [result]=await connection.execute(`INSERT INTO userdata(${keys.join(',')}) VALUES(${keys.map(()=>'?').join(',')})`,keys.map(key=>member[key]));
  memberId=result.insertId;
 }
 await connection.execute('INSERT INTO userlogin(acc_username,password) VALUES(?,?)',[account.username,account.password_hash]);
 return {memberId,pwdId,expiry};
}
module.exports={ACCOUNT_SELECT,APPLICATION_SELECT,RECORD_SELECT,serialize,samePerson,approveMember};
