const express=require('express'),controller=require('../controllers/passwordRecoveryController');
const router=express.Router(),attempts=new Map();
setInterval(()=>{for(const [key,row]of attempts)if(row.until<Date.now())attempts.delete(key);},60000).unref();
function limit(req,res,next){const key=req.ip;let row=attempts.get(key);if(!row||row.until<Date.now()){row={count:0,until:Date.now()+900000};attempts.set(key,row);}if(++row.count>20){res.set('Retry-After',String(Math.ceil((row.until-Date.now())/1000)));return res.status(429).json({success:false,message:'Too many attempts. Try again later.'});}next();}
router.post('/request',limit,controller.request);
router.post('/reset',limit,controller.reset);
module.exports=router;
