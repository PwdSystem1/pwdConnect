import {useEffect,useState} from 'react';
import {Volume2,Square} from 'lucide-react';
import {PROGRAMS} from '../landingContent';
import PublicDetailsDialog from '../components/PublicDetailsDialog';
import {portalTheme} from '../components/portalTheme';
import {speakSpeech,stopSpeech} from '../components/speechPlayer';

// This applicant resource uses public program text only; no service-request access.
export default function ApplicantPrograms({themeMode='light',fontSize='text-base',isDyslexicFont=false}){
 const t=portalTheme(themeMode),[selected,setSelected]=useState(null),[notice,setNotice]=useState('');
 useEffect(()=>()=>stopSpeech(),[]);
 const button=`inline-flex items-center justify-center gap-1.5 min-h-11 px-3 rounded-lg text-[0.85em] font-semibold ${t.focus}`;
 const textOnly=item=>({id:item.id,title:item.title,description:item.description,fullDescription:item.fullDescription,details:(item.details||[]).filter(d=>d.title!=='About this image')});
 function close(){stopSpeech();setSelected(null);setNotice('');}
 const controls=item=><div className="flex gap-2"><button type="button" aria-label={`Read ${item.title} aloud`} onClick={()=>speakSpeech(`${item.title}. ${item.fullDescription||item.description}`,'en',setNotice)} className={`${button} ${t.secondary}`}><Volume2 className="size-4"/>Speak</button><button type="button" onClick={stopSpeech} className={`${button} ${t.secondary}`}><Square className="size-4"/>Stop</button></div>;
 return <><h1 className={`text-2xl font-bold ${t.heading}`}>Programs</h1><p className={`mt-2 max-w-2xl leading-relaxed ${t.muted}`}>Explore PDAO Candelaria programs and support for the PWD community. Contact the office for current requirements and availability.</p><p className={`mt-3 text-[0.85em] ${t.subtle}`}>Your account remains subject to verification. Viewing a program does not submit a request or confirm eligibility.</p>{notice&&<p role="status" className="mt-3">{notice}</p>}<div className="grid md:grid-cols-2 2xl:grid-cols-3 gap-4 mt-6">{PROGRAMS.map(item=><article key={item.id} className={`p-4 rounded-xl flex flex-col min-w-0 ${t.card}`}><h2 className={`font-bold leading-snug ${t.heading}`}>{item.title}</h2><p className={`mt-2 text-[0.9em] leading-relaxed line-clamp-3 ${t.muted}`}>{item.description}</p><div className="mt-auto pt-3 flex flex-wrap gap-2 items-center justify-between">{controls(item)}<button type="button" aria-haspopup="dialog" aria-label={`Read more about ${item.title}`} onClick={()=>{stopSpeech();setSelected(textOnly(item));}} className={`${button} ${t.primary}`}>Read More</button></div></article>)}</div>{selected&&<PublicDetailsDialog item={selected} category="Program" themeMode={themeMode} fontSize={fontSize} isDyslexicFont={isDyslexicFont} onClose={close}>{controls(selected)}</PublicDetailsDialog>}</>;
}
