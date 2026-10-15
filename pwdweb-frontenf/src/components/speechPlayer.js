import {PORTAL_API} from './portalApi';
let current=null,audioContext=null;
export function stopSpeech(){
 const old=current;current=null;
 old?.abort.abort();
 if(old?.source){old.source.onended=null;try{old.source.stop();}catch{}}
 if(old?.audio){old.audio.pause();old.audio.removeAttribute('src');old.audio.load();}
 if(old?.url)URL.revokeObjectURL(old.url);
 window.speechSynthesis?.cancel();
 old?.notice('');
 old?.done?.();
}
function localVoice(text,language,task,reason){
 if(task.audio){task.audio.pause();task.audio.removeAttribute('src');task.audio.load();task.audio=null;}
 if(task.url){URL.revokeObjectURL(task.url);task.url=null;}
 const synth=window.speechSynthesis,voice=synth?.getVoices().find(v=>language==='fil'?/^(fil|tl)(-|_|$)/i.test(v.lang):/^en(-|_|$)/i.test(v.lang));
 if(!voice){current=null;task.notice(reason+(language==='fil'?' Walang Filipino voice sa device para sa fallback.':' No matching device voice is available.'));task.done?.();return;}
 const utterance=new SpeechSynthesisUtterance(text);utterance.voice=voice;utterance.lang=voice.lang;utterance.rate=0.95;
 utterance.onend=()=>{if(current===task){current=null;task.notice('');task.done?.();}};
 utterance.onerror=()=>{if(current===task){current=null;task.notice('Device speech could not continue.');task.done?.();}};
 task.notice(reason+' Using the matching device voice.');synth.speak(utterance);
}
export async function speakSpeech(text,language='en',notice=()=>{},done){
 stopSpeech();
 const task={abort:new AbortController(),notice,done};current=task;
 if(!text||text.length>3000){current=null;notice('Choose text of at most 3,000 characters.');done?.();return;}
 notice(language==='fil'?'Inihahanda ang Filipino voice…':'Preparing English voice…');
 // Resume during the click gesture so mobile browsers can play the response.
 let unlocked=null;
 try{const Context=window.AudioContext||window.webkitAudioContext;if(Context){audioContext??=new Context();unlocked=audioContext.resume().then(()=>true,()=>false);}}catch{}
 let response;
 try{
  response=await fetch(PORTAL_API+'/speech/synthesize',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,language}),signal:task.abort.signal});
  if(current!==task)return;
  if(!response.ok){let message='Online voice is unavailable.';try{message=(await response.json()).message||message;}catch{}if(current===task)localVoice(text,language,task,message);return;}
  if(!response.headers.get('content-type')?.includes('audio/'))throw Error('Invalid speech response');
  const bytes=await response.arrayBuffer();if(current!==task)return;
  if(unlocked&&await unlocked){const buffer=await audioContext.decodeAudioData(bytes);if(current!==task)return;const source=audioContext.createBufferSource();source.buffer=buffer;source.connect(audioContext.destination);task.source=source;source.onended=()=>{if(current===task){current=null;notice('');done?.();}};source.start();}
  else{const url=URL.createObjectURL(new Blob([bytes],{type:'audio/mpeg'})),audio=new Audio(url);task.url=url;task.audio=audio;audio.onended=()=>{if(current===task)stopSpeech();};audio.onerror=()=>{if(current===task){stopSpeech();notice('Audio could not play. Tap Speak to try again.');}};await audio.play();if(current!==task)return;}
  notice(language==='fil'?'Binabasa sa Filipino.':'Reading in English.');
 }catch(error){if(current!==task||error.name==='AbortError')return;localVoice(text,language,task,'Online voice could not be loaded.');}
}
