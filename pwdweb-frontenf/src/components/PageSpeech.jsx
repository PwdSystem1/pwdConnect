import {useEffect,useState} from 'react';
import {speakSpeech,stopSpeech} from './speechPlayer';
export function pageReadingText(){
 const root=document.querySelector('main');if(!root)return '';
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),parts=[];
 while(walker.nextNode()){
  const node=walker.currentNode,parent=node.parentElement;
  if(!parent||parent.closest('input,textarea,select,script,style,[hidden],[aria-hidden="true"],[data-no-speech],dialog'))continue;
  if(!parent.getClientRects().length||getComputedStyle(parent).visibility==='hidden')continue;
  if(node.textContent.trim())parts.push(node.textContent.trim());
 }
 return parts.join(' ').replace(/\s+/g,' ').trim().slice(0,12000);
}
export default function PageSpeech(){
 const [notice,setNotice]=useState(''),[auto,setAuto]=useState(()=>localStorage.getItem('pwd_alert_voice')!=='off');
 useEffect(()=>()=>stopSpeech(),[]);
 function toggle(){const value=!auto;setAuto(value);localStorage.setItem('pwd_alert_voice',value?'on':'off');window.dispatchEvent(new Event('pwd-alert-voice-change'));}
 return <section data-no-speech aria-label="Page voice controls" className="rounded-xl border border-current/20 p-3 space-y-3 text-sm">
  <div className="flex flex-wrap gap-2"><button type="button" onClick={()=>speakSpeech(pageReadingText(),'en',setNotice)} className="min-h-11 px-4 py-2 rounded-lg bg-sky-700 text-white font-bold focus-visible:outline-2 focus-visible:outline-offset-2">Read page</button><button type="button" onClick={()=>{stopSpeech();setNotice('Reading stopped.');}} className="min-h-11 px-4 py-2 rounded-lg border border-current font-bold focus-visible:outline-2 focus-visible:outline-offset-2">Stop</button></div>
  <label className="flex items-start gap-3 min-h-11 cursor-pointer"><input type="checkbox" checked={auto} onChange={toggle} className="mt-1 size-5 shrink-0"/><span>Read new emergency alerts aloud in English</span></label>
  <p className="text-xs">Voice availability depends on your device. If automatic audio is blocked, use Read alert. Tagalog voice is currently unavailable.</p>
  <p role="status" aria-live="polite" className="break-words">{notice}</p>
 </section>;
}
