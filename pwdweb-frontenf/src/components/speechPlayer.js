// English device speech only. Never calls the suspended server voice endpoint.
try{if(localStorage.getItem('public_speechLanguage')==='fil')localStorage.setItem('public_speechLanguage','en');}catch{}
let current=null;
export function stopSpeech(){
 const old=current;current=null;
 if(old){clearTimeout(old.timer);window.speechSynthesis?.removeEventListener('voiceschanged',old.load);}
 window.speechSynthesis?.cancel();
 old?.notice('');old?.done?.();
}
export function speakSpeech(text,language='en',notice=()=>{},done){
 stopSpeech();
 if(language!=='en'){notice('Tagalog voice is currently unavailable. Please select English.');done?.();return;}
 const synth=window.speechSynthesis;
 if(!synth||!window.SpeechSynthesisUtterance){notice('This browser does not support voice reading. You can still read the text on screen.');done?.();return;}
 if(typeof text!=='string'||!text.trim()){notice('There is no text to read yet.');done?.();return;}
 const words=text.trim().slice(0,12000).split(/\s+/),chunks=[];let chunk='';
 for(const word of words){if(chunk.length+word.length>200){chunks.push(chunk);chunk='';}chunk+=(chunk?' ':'')+word;}if(chunk)chunks.push(chunk);
 const task={notice,done,index:0,timer:null,load:null};current=task;
 function finish(message){if(current!==task)return;current=null;clearTimeout(task.timer);synth.removeEventListener('voiceschanged',task.load);notice(message);done?.();}
 function next(){
  if(current!==task)return;
  if(task.index>=chunks.length){finish('Finished reading.');return;}
  const voices=synth.getVoices(),voice=voices.find(v=>/^en([-_]|$)/i.test(v.lang));
  if(voices.length&&!voice){finish('No English voice is available on this device. Enable an English text-to-speech voice in device settings.');return;}
  const utterance=new SpeechSynthesisUtterance(chunks[task.index++]);task.utterance=utterance;
  utterance.lang=voice?.lang||'en-US';if(voice)utterance.voice=voice;utterance.rate=0.95;
  task.timer=setTimeout(()=>{if(current===task){stopSpeech();notice('Voice did not start. Tap Read to try again, or enable an English device voice.');}},10000);
  utterance.onstart=()=>{if(current===task){clearTimeout(task.timer);notice('Reading in English.');}};
  utterance.onend=()=>{clearTimeout(task.timer);next();};
  utterance.onerror=()=>finish('Automatic voice may be blocked. Tap Read to hear the text.');
  synth.resume();synth.speak(utterance);
 }
 let started=false;
 task.load=()=>{if(started||current!==task)return;started=true;clearTimeout(task.timer);synth.removeEventListener('voiceschanged',task.load);next();};
 notice('Preparing English device voice…');
 if(synth.getVoices().length)task.load();
 else{synth.addEventListener('voiceschanged',task.load);task.timer=setTimeout(task.load,800);}
}
