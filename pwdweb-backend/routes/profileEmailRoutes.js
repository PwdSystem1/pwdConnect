const express=require('express'),portalAuth=require('../middleware/portalAuth'),c=require('../controllers/profileEmailController');
const router=express.Router(),attempts=new Map();
setInterval(()=>{for(const [key,r]of attempts)if(r.until<Date.now())attempts.delete(key);},60000).unref();
router.post('/verify',(req,res,next)=>{let r=attempts.get(req.ip);if(!r||r.until<Date.now()){r={count:0,until:Date.now()+900000};attempts.set(req.ip,r);}if(++r.count>30){res.set('Retry-After',String(Math.ceil((r.until-Date.now())/1000)));return res.status(429).json({success:false,message:'Too many verification attempts. Try again later.'});}next();},c.verify);
router.use(portalAuth);router.use((req,res,next)=>req.portalAccount.kind==='user'?next():res.status(403).json({success:false,message:'This email setting is for PWD member accounts.'}));
router.post('/request',c.request);router.post('/cancel',c.cancel);
module.exports=router;
