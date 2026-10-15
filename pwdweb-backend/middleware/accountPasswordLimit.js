// Independent from the existing shared login limiter: one signed-in account's
// attempts cannot consume another member/staff account's allowance.
const attempts=new Map(),WINDOW=15*60*1000,MAX=10;
setInterval(()=>{const now=Date.now();for(const [key,item]of attempts)if(item.until<=now)attempts.delete(key);},60000).unref();
module.exports=(req,res,next)=>{
 const identity=req.portalAccount;
 if(!identity||!['user','staff'].includes(identity.kind))return res.status(403).json({success:false,message:'Member or staff access required.'});
 const key=JSON.stringify([identity.kind,identity.username]),now=Date.now();let item=attempts.get(key);
 if(!item||item.until<=now){item={count:0,until:now+WINDOW};attempts.set(key,item);}
 item.count++;
 if(item.count>MAX){res.set('Retry-After',String(Math.ceil((item.until-now)/1000)));return res.status(429).json({success:false,message:'Too many password-change attempts. Wait 15 minutes before trying again.'});}
 next();
};
