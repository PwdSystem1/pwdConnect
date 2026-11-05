const {problem}=require('./membershipValidation');
const MAX=2,WAIT=30*60*1000;
const parse=s=>s?Date.parse(String(s).replace(' ','T')+'Z'):0;
function state(row,now=Date.now()){
 let attempts=Number(row?.attempts||0),until=parse(row?.locked_until),start=parse(row?.window_started_at);
 if(until&&until<=now||!until&&start&&now-start>=WAIT)attempts=0;
 const seconds=until>now?Math.ceil((until-now)/1000):0;
 return {attempts,remainingAttempts:Math.max(0,MAX-attempts),locked:seconds>0,retryAfter:seconds,lockedUntil:seconds?new Date(until).toISOString():null};
}
const SELECT="SELECT attempts,DATE_FORMAT(window_started_at,'%Y-%m-%d %H:%i:%s') AS window_started_at,DATE_FORMAT(locked_until,'%Y-%m-%d %H:%i:%s') AS locked_until FROM applicant_verification_limits WHERE account_id=?";
async function read(c,id){const [rows]=await c.execute(SELECT,[id]);return state(rows[0]);}
async function consume(c,id){
 await c.execute('INSERT IGNORE INTO applicant_verification_limits(account_id,attempts,window_started_at,updated_at) VALUES(?,0,UTC_TIMESTAMP(),UTC_TIMESTAMP())',[id]);
 const [rows]=await c.execute(SELECT+' FOR UPDATE',[id]);const now=Date.now(),s=state(rows[0],now);
 if(s.locked)throw Object.assign(problem('You have used two existing-record verification attempts. Try again after the 30-minute cooldown. You may contact the PWD office or apply for a PWD ID.',429),{verificationLimits:s});
 const attempts=s.attempts+1,until=attempts>=MAX?new Date(now+WAIT).toISOString().slice(0,19).replace('T',' '):null;
 await c.execute('UPDATE applicant_verification_limits SET attempts=?,window_started_at=IF(?=1,UTC_TIMESTAMP(),window_started_at),locked_until=?,updated_at=UTC_TIMESTAMP() WHERE account_id=?',[attempts,attempts,until,id]);
 return state({attempts,window_started_at:new Date(now).toISOString().slice(0,19).replace('T',' '),locked_until:until},now);
}
module.exports={read,consume,state};
