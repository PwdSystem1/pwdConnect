const buckets=new Map();
setInterval(()=>{const now=Date.now();for(const [key,value]of buckets)if(value.until<=now)buckets.delete(key);},60000).unref();
module.exports=function accountRateLimit(max=15){return(req,res,next)=>{const key=req.ip;const now=Date.now();let item=buckets.get(key);if(!item||item.until<=now){item={count:0,until:now+15*60000};buckets.set(key,item);}item.count++;if(item.count>max){res.set('Retry-After',String(Math.ceil((item.until-now)/1000)));return res.status(429).json({success:false,message:'Too many attempts. Please wait and try again.'});}next();};};
