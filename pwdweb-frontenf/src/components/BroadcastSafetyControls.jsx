import {useEffect,useRef,useState} from 'react';
import {portalRequest} from './portalApi';
import {portalTheme} from './portalTheme';
const date=v=>v?new Date(v).toLocaleString('en-PH',{timeZone:'Asia/Manila',dateStyle:'medium',timeStyle:'short'}):'';
export default function BroadcastSafetyControls({alert,themeMode='light',disabled=false}){
 const t=portalTheme(themeMode),ref=useRef(null),sent=useRef(false),[seen,setSeen]=useState(alert.my_seen_at),[safe,setSafe]=useState(alert.my_safe_at),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{if(alert.my_seen_at)setSeen(alert.my_seen_at);if(alert.my_safe_at)setSafe(alert.my_safe_at);},[alert.my_seen_at,alert.my_safe_at]);
 useEffect(()=>{
  if(seen||sent.current||!ref.current)return;let alive=true;
  const observer=new IntersectionObserver(entries=>{if(!entries.some(e=>e.isIntersecting)||sent.current)return;sent.current=true;portalRequest(`/received-alerts/${alert.id}/response`,{method:'POST',body:JSON.stringify({status:'seen'})}).then(r=>{if(alive)setSeen(r.my_seen_at);}).catch(()=>{sent.current=false;});},{threshold:0.4});observer.observe(ref.current);return()=>{alive=false;observer.disconnect();};
 },[alert.id,seen]);
 async function markSafe(){if(busy||safe||disabled)return;setBusy(true);setError('');try{const r=await portalRequest(`/received-alerts/${alert.id}/response`,{method:'POST',body:JSON.stringify({status:'safe'})});setSeen(r.my_seen_at);setSafe(r.my_safe_at);}catch(e){setError(e.message);}finally{setBusy(false);}}
 return <section ref={ref} className={`mt-4 p-4 rounded-xl ${t.card}`} aria-label="Broadcast safety response">
  {alert.expected_at&&<p className={`text-sm mb-3 ${t.heading}`}>Expected emergency / calamity: <strong>{date(alert.expected_at)} (Manila)</strong></p>}
  <p className={`text-sm ${t.muted}`}>{safe?'You marked yourself safe at '+date(safe)+'.':seen?'Viewed. Your safety has not yet been confirmed.':'Viewing this alert does not automatically mark you safe.'}</p>
  <button type="button" disabled={disabled||busy||Boolean(safe)} onClick={markSafe} className={`mt-3 px-4 py-3 min-h-12 rounded-lg font-bold disabled:opacity-60 ${t.primary} ${t.focus}`}>{safe?'Marked Safe':busy?'Saving…':'Mark Myself Safe'}</button>
  {!safe&&<p className={`mt-2 text-xs ${t.muted}`}>Select this only if you are safe. If you need help, use Emergency Alerts or the emergency hotlines.</p>}
  {error&&<p role="alert" className={`mt-3 ${t.error}`}>{error}</p>}
 </section>;
}
