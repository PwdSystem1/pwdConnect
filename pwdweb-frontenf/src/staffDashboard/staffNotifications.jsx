import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, RefreshCw } from 'lucide-react';
import StaffLayout from '../components/StaffLayout';
import useStaffAccount from '../components/useStaffAccount';
import { portalTheme } from '../components/portalTheme';
import { formatPortalDate, notifyPortalRefresh, portalRequest } from '../components/portalApi';

export default function StaffNotifications(props){
  const user=useStaffAccount();const navigate=useNavigate();const t=portalTheme(props.themeMode||'light');
  const [items,setItems]=useState([]);const [loading,setLoading]=useState(true);const [error,setError]=useState('');
  const [unread,setUnread]=useState(0);const [hasMore,setHasMore]=useState(false);const [filter,setFilter]=useState('all');
  const [busy,setBusy]=useState(false);const [refresh,setRefresh]=useState(0);
  const earlierLoaded=useRef(false);
  const button=`inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-11 rounded-lg font-semibold cursor-pointer transition disabled:opacity-50 disabled:cursor-not-allowed ${t.focus}`;
  useEffect(()=>{
    if(!user)return;let active=true,running=false,controller;
    async function load(){
      if(running)return;running=true;controller=new AbortController();
      try{const data=await portalRequest('/notifications',{signal:controller.signal});if(active){setItems(previous=>{const entries=new Map([...previous,...data.notifications].map(item=>[item.id,item]));return Array.from(entries.values()).sort((a,b)=>b.id-a.id);});setUnread(data.unreadCount);setHasMore(previous=>earlierLoaded.current?previous:data.hasMore);setError('');}}
      catch(error){if(active&&error.name!=='AbortError')setError(error.message);}
      finally{running=false;if(active)setLoading(false);}
    }
    load();const timer=setInterval(load,10000);window.addEventListener('pwd-portal-refresh',load);
    return()=>{active=false;clearInterval(timer);controller?.abort();window.removeEventListener('pwd-portal-refresh',load);};
  },[user,refresh]);
  async function markAll(){
    if(!items.length||busy)return;setBusy(true);
    try{await portalRequest('/notifications/read-all',{method:'PATCH',body:JSON.stringify({up_to_id:Math.max(...items.map(item=>item.id))})});setItems(previous=>previous.map(item=>({...item,read_at:item.read_at||new Date().toISOString()})));setUnread(0);notifyPortalRefresh();}
    catch(error){setError(error.message);}finally{setBusy(false);}
  }
  async function open(item){
    if(busy)return;setBusy(true);
    try{await portalRequest(`/notifications/${item.id}/read`,{method:'PATCH'});notifyPortalRefresh();if(item.target_path?.startsWith('/')&&!item.target_path.startsWith('//'))navigate(item.target_path);}
    catch(error){setError(error.message);}finally{setBusy(false);}
  }
  async function older(){
    if(busy||!items.length)return;setBusy(true);
    try{const data=await portalRequest(`/notifications?before=${Math.min(...items.map(item=>item.id))}`);earlierLoaded.current=true;setItems(previous=>{const entries=new Map([...previous,...data.notifications].map(item=>[item.id,item]));return Array.from(entries.values()).sort((a,b)=>b.id-a.id);});setHasMore(data.hasMore);setUnread(data.unreadCount);}
    catch(error){setError(error.message);}finally{setBusy(false);}
  }
  if(!user)return <p role="status" className="p-8">Loading your account…</p>;
  const visible=items.filter(item=>filter==='all'||!item.read_at);
  return <StaffLayout {...props} user={user} title="Notifications">
    <div className="flex flex-wrap items-center justify-between gap-4 mb-6"><p className={t.muted}>{unread} unread notifications</p><div className="flex flex-wrap gap-2"><button type="button" disabled={busy||loading} onClick={()=>setRefresh(value=>value+1)} className={`${button} ${t.secondary}`}><RefreshCw className="size-4" aria-hidden="true"/>Refresh</button><button type="button" disabled={busy||!unread} onClick={markAll} className={`${button} ${t.primary}`}><CheckCheck className="size-4" aria-hidden="true"/>Mark all read</button></div></div>
    <div className="flex gap-2 mb-5">{[['all','All'],['unread','Unread']].map(([value,label])=><button type="button" key={value} aria-pressed={filter===value} onClick={()=>setFilter(value)} className={`${button} ${filter===value?t.active:t.secondary}`}>{label}</button>)}</div>
    {error&&<p role="alert" className={`rounded-xl p-4 mb-5 ${t.error}`}>{error}</p>}
    <section aria-label="Notifications" className={`rounded-2xl overflow-hidden ${t.card}`}>{loading?<p role="status" className="p-8">Loading notifications…</p>:!visible.length?<div className={`p-10 text-center ${t.muted}`}><Bell className="size-10 mx-auto mb-4" aria-hidden="true"/><h2 className={`font-bold ${t.heading}`}>No {filter==='unread'?'unread ':''}notifications</h2><p className="mt-2">New messages, service requests, and emergency reports will appear here.</p></div>:visible.map(item=><button type="button" disabled={busy} key={item.id} onClick={()=>open(item)} className={`w-full text-left p-5 sm:p-6 border-b transition ${t.divider} ${t.focus} ${item.read_at?t.idle:t.unread}`}><div className="flex items-start gap-4"><span className={`size-11 shrink-0 rounded-lg inline-flex items-center justify-center ${t.tile}`}><Bell className="size-5" aria-hidden="true"/></span><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><h2 className={`font-semibold break-words ${t.heading}`}>{item.title}</h2>{!item.read_at&&<span className={`size-2.5 shrink-0 rounded-full ${t.badge}`} aria-label="Unread"/>}</div><p className={`mt-2 text-[0.9em] break-words leading-relaxed ${t.muted}`}>{item.body}</p><p className={`mt-3 text-[0.75em] ${t.subtle}`}>{formatPortalDate(item.created_at)}</p></div></div></button>)}</section>
    {hasMore&&<button type="button" disabled={busy} onClick={older} className={`mt-5 ${button} ${t.secondary}`}>{busy?'Loading…':'Load older notifications'}</button>}
  </StaffLayout>;
}
