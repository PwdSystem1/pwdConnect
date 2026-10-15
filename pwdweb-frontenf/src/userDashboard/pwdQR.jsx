import { useEffect, useRef, useState } from 'react';
import { Download, RefreshCw, ShieldCheck, UserRound } from 'lucide-react';
import UserLayout from '../components/UserLayout';
import usePortalAccount from '../components/usePortalAccount';
import { portalRequest } from '../components/portalApi';
import { portalTheme } from '../components/portalTheme';

function displayDate(value){return value?new Date(value+'T00:00:00Z').toLocaleDateString('en-PH',{dateStyle:'long',timeZone:'UTC'}):'Not recorded';}
export default function PWDQR(props){
 const account=usePortalAccount(),t=portalTheme(props.themeMode||'light');
 const [data,setData]=useState(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[ready,setReady]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[retry,setRetry]=useState(0);
 const canvasRef=useRef(null),requestRef=useRef(null);
 useEffect(()=>{
  if(!account)return;const controller=new AbortController();setLoading(true);setError('');
  portalRequest('/qr/my',{method:'POST',signal:controller.signal}).then(value=>setData(value)).catch(e=>{if(e.name!=='AbortError')setError(e.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});return()=>controller.abort();
 },[account,retry]);
 useEffect(()=>{
  if(!data?.qrPayload||!canvasRef.current)return;let active=true;setReady(false);
  import('qrcode').then(module=>module.default.toCanvas(canvasRef.current,data.qrPayload,{width:768,margin:4,errorCorrectionLevel:'M',color:{dark:'#000000',light:'#ffffff'}})).then(()=>{if(active&&canvasRef.current){canvasRef.current.style.width='100%';canvasRef.current.style.height='auto';setReady(true);}}).catch(()=>{if(active)setError('Unable to draw the QR. Install the supplied QR dependencies and restart the frontend.');});
  return()=>{active=false;};
 },[data?.qrPayload,loading]);
 useEffect(()=>()=>requestRef.current?.abort(),[]);
 async function download(){
  if(!ready||busy)return;setBusy(true);setError('');
  try{const blob=await new Promise((resolve,reject)=>canvasRef.current.toBlob(value=>value?resolve(value):reject(new Error('Unable to export the QR image.')),'image/png'));const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=`PWDConnect-QR-${data.member.pwd_id.replace(/[^a-z0-9_-]/gi,'_')}.png`;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);setNotice('Your QR PNG is ready to download.');}catch(e){setError(e.message);}finally{setBusy(false);}
 }
 async function regenerate(){
  if(busy||!window.confirm('Replace your QR code? Previously downloaded or printed QR codes will stop working.'))return;
  setBusy(true);setError('');setNotice('');requestRef.current=new AbortController();
  try{const value=await portalRequest('/qr/my/regenerate',{method:'POST',signal:requestRef.current.signal});setData(value);setNotice(value.message);}catch(e){if(e.name!=='AbortError')setError(e.message);}finally{if(!requestRef.current.signal.aborted)setBusy(false);}
 }
 if(!account)return <p role="status" className="p-8">Loading your account…</p>;
 const member=data?.member,name=member?[member.first_name,member.middle_name,member.last_name].filter(Boolean).join(' '):'';
 const button=`inline-flex items-center justify-center gap-2 min-h-11 px-4 py-3 rounded-lg font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${t.focus}`;
 const rows=member?[['Full name',name],['PWD ID',member.pwd_id],['ID status',member.id_status],['Expiry date',displayDate(member.expired_date)],['Member since',displayDate(member.member_since)]]:[];
 return <UserLayout {...props} user={account} title="My QR Code">
  <p className={`mb-6 ${t.muted}`}>Show your QR to LGU staff for member-record verification.</p>
  {error&&<p role="alert" className={`p-4 rounded-xl mb-6 ${t.error}`}>{error}<button type="button" onClick={()=>setRetry(n=>n+1)} className={`ml-3 ${button} ${t.secondary}`}>Retry</button></p>}
  {notice&&<p role="status" className={`p-4 rounded-xl mb-6 ${t.tile}`}>{notice}</p>}
  {loading?<p role="status">Preparing your QR code…</p>:member&&<div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
   <section aria-label="Member QR code" className={`p-6 sm:p-8 rounded-2xl flex flex-col items-center ${t.card}`}><h2 className={`font-bold text-[1.2em] mb-2 ${t.heading}`}>Your member QR</h2><p className={`text-[0.85em] text-center mb-5 ${t.subtle}`}>A private record reference for authorized LGU staff.</p><div className="bg-white rounded-xl p-2 w-full max-w-80 border border-slate-200"><canvas ref={canvasRef} role="img" aria-label={`Scannable PWDConnect QR code for PWD ID ${member.pwd_id}`} className="block w-full h-auto aspect-square"/></div>{!ready&&<p role="status" className="mt-3">Drawing QR code…</p>}<p className={`font-semibold mt-4 break-all ${t.heading}`}>{member.pwd_id}</p><button type="button" onClick={download} disabled={!ready||busy} className={`w-full mt-6 ${button} ${t.primary}`}><Download className="size-5"/>Download QR PNG</button><p className={`mt-3 text-[0.8em] text-center ${t.subtle}`}>High-resolution PNG, suitable for showing on your phone or printing. Keep the white border intact.</p></section>
   <div className="space-y-6"><section aria-label="Member information" className={`p-6 rounded-2xl ${t.card}`}><div className="flex items-center gap-4 mb-6">{member.profile_pic?<img src={member.profile_pic} alt="Member profile" className="size-16 rounded-xl object-cover"/>:<div className={`size-16 rounded-xl flex items-center justify-center ${t.tile}`}><UserRound className="size-8"/></div>}<h2 className={`font-bold text-[1.2em] ${t.heading}`}>Your information</h2></div><dl className="space-y-4">{rows.map(([label,value])=><div key={label} className={`p-3 rounded-lg ${t.tile}`}><dt className={`text-[0.8em] ${t.subtle}`}>{label}</dt><dd className="mt-1 font-semibold break-words">{value}</dd></div>)}</dl>{member.id_status==='Expired'&&<p className={`mt-4 text-[0.85em] ${t.muted}`}>Your ID has expired. The QR can identify your record; contact LGU staff about renewal.</p>}{member.id_status==='Expiring Soon'&&<p className={`mt-4 text-[0.85em] ${t.muted}`}>Your ID {member.days_to_expiry===0?'expires today':`expires in ${member.days_to_expiry} days`}. Contact LGU staff about renewal.</p>}</section>
    <section className={`p-6 rounded-2xl ${t.card}`}><h2 className={`font-bold flex items-center gap-2 ${t.heading}`}><ShieldCheck className="size-5"/>How verification works</h2><p className={`mt-3 text-[0.9em] leading-relaxed ${t.muted}`}>The QR contains a random reference, not your name, address, or disability. Only active logged-in staff can retrieve your current record with the system scanner. A scan is a record lookup; staff must still compare your identity/photo before processing services.</p><p className={`mt-3 text-[0.9em] leading-relaxed ${t.muted}`}>Your existing QR stays the same when you update your profile or renew your ID. Staff see the latest ID status after scanning. They can open your service requests and separately record assistance actually delivered.</p><button type="button" onClick={regenerate} disabled={busy||!ready} className={`mt-5 ${button} ${t.secondary}`}><RefreshCw className="size-4"/>Replace QR code</button><p className={`mt-2 text-[0.8em] ${t.subtle}`}>Use only if you need a replacement. Previous printed/downloaded copies will become invalid.</p></section>
   </div>
  </div>}
 </UserLayout>;
}
