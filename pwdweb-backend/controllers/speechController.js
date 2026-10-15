// Local worker by default; optional authenticated HTTPS worker for deployment.
const visitors=new Map();let active=false;
exports.synthesize=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 const text=req.body?.text;
 if(req.body?.language!=='fil'||typeof text!=='string'||!text.trim()||text.length>3000||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(text))return res.status(400).json({message:'Speech accepts Filipino text of 1–3,000 characters. English uses your device voice.'});
 const now=Date.now(),ip=req.ip||req.socket.remoteAddress||'unknown';
 for(const [address,entry] of visitors)if(entry.until<=now)visitors.delete(address);
 let visitor=visitors.get(ip);
 if(!visitor){if(visitors.size>=5000)return res.status(429).json({message:'Voice service is busy.'});visitor={until:now+60000,count:0};visitors.set(ip,visitor);}
 if(active||visitor.count>=10){res.setHeader('Retry-After','10');return res.status(429).json({message:'Tagalog voice is busy. Please try again shortly.'});}
 const port=Number(process.env.LOCAL_TTS_PORT||5055);
 if(!Number.isInteger(port)||port<1024||port>65535)return res.status(503).json({message:'The local voice port is not configured correctly.'});
 let endpoint,headers={'Content-Type':'application/json'};
 try{
  const remote=process.env.TTS_SERVICE_URL;
  if(remote){
   const url=new URL(remote);
   if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.pathname!=='/')throw Error('Invalid voice URL');
   if(!process.env.TTS_SERVICE_KEY||process.env.TTS_SERVICE_KEY.length<32)throw Error('Missing voice key');
   endpoint=new URL('/synthesize',url).href;
   headers.Authorization='Bearer '+process.env.TTS_SERVICE_KEY;
  }else endpoint='http://127.0.0.1:'+port+'/synthesize';
 }catch{return res.status(503).json({message:'Voice hosting configuration is incomplete.'});}
 active=true;visitor.count++;
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),90000);
 const closed=()=>{if(!res.writableEnded)controller.abort();};res.on('close',closed);
 try{
  const response=await fetch(endpoint,{method:'POST',signal:controller.signal,headers,body:JSON.stringify({text:text.trim()})});
  if(!response.ok)return res.status(response.status===429?429:503).json({message:response.status===429?'Tagalog voice is busy. Please try again shortly.':'Tagalog voice could not generate this text.'});
  if(!response.headers.get('content-type')?.includes('audio/wav'))throw Error('Invalid worker response');
  const audio=Buffer.from(await response.arrayBuffer());if(!audio.length||audio.length>32*1024*1024)throw Error('Invalid audio size');
  if(!res.destroyed)res.type('audio/wav').send(audio);
 }catch(error){if(!res.destroyed)res.status(503).json({message:error.name==='AbortError'?'Tagalog voice took too long. Try a shorter passage.':'Tagalog voice service is unavailable. Please try again shortly.'});}
 finally{active=false;clearTimeout(timer);res.off('close',closed);}
};
