import {useEffect,useState} from 'react';
import {portalRequest} from './portalApi';
import {portalTheme} from './portalTheme';
const date=v=>v?new Date(v).toLocaleString('en-PH',{timeZone:'Asia/Manila',dateStyle:'medium',timeStyle:'short'}):'—';
export default function BroadcastResponsesPanel({alert,themeMode='light'}){
 const t=portalTheme(themeMode),[open,setOpen]=useState(false),[data,setData]=useState(null),[page,setPage]=useState(1),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{if(!open)return;let alive=true,c;async function load(){c?.abort();c=new AbortController();try{const r=await portalRequest(`/broadcast-alerts/${alert.id}/responses?page=${page}`,{signal:c.signal});if(alive){setData(r);setError('');}}catch(e){if(alive&&e.name!=='AbortError')setError(e.message);}}load();const timer=setInterval(load,15000);return()=>{alive=false;clearInterval(timer);c?.abort();};},[alert.id,open,page,retry]);
 const summary=data?.summary||{recipients:alert.recipient_count||0,viewed:alert.viewed_count||0,safe:alert.safe_count||0},button=`px-4 py-3 min-h-11 rounded-lg font-semibold ${t.secondary} ${t.focus}`;
 return <section className="pt-3 space-y-3">
  <p className={`text-sm ${t.muted}`}>Expected event: {date(alert.expected_at)}{alert.expected_at?' (Manila)':''}</p>
  <p className={`text-sm break-words ${t.muted}`}>Audience: {alert.audience_mode==='Barangays'?alert.target_barangays:alert.audience_mode==='All'?'All active PWD member accounts':'Legacy broadcast — original recipient list was not recorded'}</p>
  <p className="text-sm font-semibold">Recipients: {summary.recipients} · Viewed: {summary.viewed} · Marked safe: {summary.safe}</p>
  <p className={`text-xs ${t.muted}`}>Viewed does not mean safe. No response means safety is unconfirmed.</p>
  <button type="button" onClick={()=>setOpen(v=>!v)} className={button}>{open?'Hide member responses':'View member responses'}</button>
  {open&&<div>{error&&<p role="alert" className={t.error}>{error}</p>}<button type="button" onClick={()=>setRetry(n=>n+1)} className={`mt-2 ${button}`}>Refresh responses</button><div className="overflow-x-auto mt-3"><table className="w-full min-w-[520px] text-sm text-left"><thead><tr>{['Member','Barangay','Viewed','Safety response'].map(h=><th className="p-2" key={h}>{h}</th>)}</tr></thead><tbody>{data?.rows.map(r=><tr key={r.member_id}><td className="p-2 break-words">{r.name}</td><td className="p-2">{r.barangay}</td><td className="p-2">{r.seen_at?date(r.seen_at):'Not yet viewed'}</td><td className="p-2">{r.safe_at?'Marked safe · '+date(r.safe_at):'Not confirmed'}</td></tr>)}</tbody></table></div>{data&&!data.rows.length&&<p className="mt-3">No tracked recipients.</p>}<div className="flex items-center gap-3 mt-3"><button type="button" disabled={page<=1} onClick={()=>setPage(v=>v-1)} className={button}>Previous</button><span>Page {page}</span><button type="button" disabled={page*50>=Number(summary.recipients)} onClick={()=>setPage(v=>v+1)} className={button}>Next</button></div></div>}
 </section>;
}
