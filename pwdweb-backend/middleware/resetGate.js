const state=require('../utils/resetGeneration');
let busy=false,active=0,lease=null;
const problem=(message,status=409)=>Object.assign(Error(message),{status});
const control=req=>/^\/api\/admin-settings\/full-reset(?:\/|$)/.test((req.originalUrl||req.url).split('?')[0]);
async function gate(req,res,next){
 if(control(req)){try{await state.refresh();if(!res.destroyed&&!res.writableFinished)return next();}catch{if(!res.destroyed&&!res.writableFinished)return res.status(503).json({success:false,message:'Reset configuration is unavailable. Import full-system-reset.sql.'});}return;}
 let ended=Boolean(res.destroyed||res.writableFinished),counted=false;
 const done=()=>{ended=true;if(counted){counted=false;active--;}};
 res.once('finish',done);res.once('close',done);
 try{const maintenance=await state.refresh();if(ended||res.destroyed||res.writableFinished)return;if(busy||maintenance)return res.status(503).json({success:false,message:'Administrator maintenance is in progress. Please try again shortly.'});counted=true;active++;next();}
 catch{if(!ended&&!res.destroyed&&!res.writableFinished)return res.status(503).json({success:false,message:'Reset configuration is unavailable. Import full-system-reset.sql.'});}
}
function forget(){if(lease?.timer)clearTimeout(lease.timer);lease=null;}
async function expire(token){if(!lease||lease.token!==token||busy)return;busy=true;try{forget();await state.maintenance(false);}catch{console.error('Reset maintenance expiry failed; restart the single backend process to recover.');}finally{busy=false;}}
async function exclusive(fn,{owner=null,hold=false,token=null}={}){
 if(busy)throw problem('Another maintenance operation is running.');
 if(hold&&lease)throw problem('A reset backup is already pending. Cancel it or wait for its ten-minute expiry.');
 if(token&&(!lease||lease.token!==token||lease.owner!==Number(owner)))throw problem('Reset session unavailable or belongs to another administrator. Prepare a new backup.');
 if(token&&lease.expiresAt<=Date.now()){await expire(token);throw problem('Reset preview expired. Prepare a new backup.');}
 busy=true;let retained=false;
 try{
  await state.maintenance(true);const end=Date.now()+15000;
  while(active){if(Date.now()>end)throw problem('Requests are still running. Try maintenance again shortly.');await new Promise(r=>setTimeout(r,50));}
  await new Promise(r=>setTimeout(r,250));const result=await fn();
  if(hold){if(!result?.token||!Number.isFinite(result.expiresAt)||result.expiresAt<=Date.now())throw problem('Unable to reserve the reset preview. Prepare a new backup.');lease={owner:Number(owner),token:result.token,expiresAt:result.expiresAt};lease.timer=setTimeout(()=>expire(result.token),Math.max(1,result.expiresAt-Date.now()));lease.timer.unref?.();retained=true;}
  return result;
 }finally{try{if(!retained){forget();await state.maintenance(false);}}finally{busy=false;}}
}
gate.prepareReset=(owner,fn)=>exclusive(fn,{owner,hold:true});
gate.applyReset=(owner,token,fn)=>{if(typeof token!=='string'||!token)throw problem('Prepare and save a new reset backup first.');return exclusive(fn,{owner,token});};
gate.cancelReset=async(owner,token)=>{if(!lease)return;if(lease.owner!==Number(owner)||lease.token!==token)throw problem('Only the administrator who prepared this backup can cancel it.',403);if(busy)throw problem('Maintenance is running. Please wait.');busy=true;try{forget();await state.maintenance(false);}finally{busy=false;}};
gate.runBackground=async fn=>{const maintenance=await state.refresh();if(busy||maintenance)return;active++;try{return await fn();}finally{active--;}};
// Finish/close audit work belongs to an already-admitted request. Drain it too.
gate.trackWork=async fn=>{active++;try{return await fn();}finally{active--;}};
gate.exclusive=fn=>exclusive(fn);
module.exports=gate;
