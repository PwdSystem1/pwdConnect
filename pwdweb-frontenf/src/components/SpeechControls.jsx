import {useEffect,useId,useState} from 'react';
import {Volume2,Square} from 'lucide-react';
import {speakSpeech,stopSpeech} from './speechPlayer';
export default function SpeechControls({texts,button,t}){
 const id=useId(),[language,setLanguage]=useState(()=>localStorage.getItem('public_speechLanguage')||'en'),[notice,setNotice]=useState('');
 useEffect(()=>()=>stopSpeech(),[]);
 return <div className="space-y-3"><label htmlFor={id} className="block font-semibold">Speak language</label><select id={id} value={language} onChange={e=>{stopSpeech();setLanguage(e.target.value);localStorage.setItem('public_speechLanguage',e.target.value);}} className={`w-full p-3 rounded-lg ${t.input} ${t.focus}`}><option value="en">English</option><option value="fil">Filipino / Tagalog</option></select><p className={`text-[0.75em] ${t.subtle}`}>Reads a page summary. Online speech sends the selected text to Microsoft Azure.</p><div className="flex flex-wrap gap-2"><button type="button" onClick={()=>speakSpeech(texts[language],language,setNotice)} className={`${button} ${t.primary}`}><Volume2 className="size-4"/>Speak</button><button type="button" onClick={stopSpeech} className={`${button} ${t.secondary}`}><Square className="size-4"/>Stop</button></div><p role="status" aria-live="polite" className="text-[0.8em] break-words">{notice}</p></div>;
}
