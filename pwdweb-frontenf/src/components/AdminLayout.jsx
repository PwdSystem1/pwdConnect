import {logoutAccount} from './logoutAccount';
import {speakSpeech,stopSpeech} from './speechPlayer';
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Settings, ShieldCheck, Volume2, Square, Accessibility, BarChart3, Bell, ChevronDown, FileText, LayoutDashboard, LogOut, Megaphone, Menu, MessageSquare, UserRound, X } from 'lucide-react';
import PortalBrand from './PortalBrand';
import { formatPortalDate, notifyPortalRefresh } from './portalApi';
import { adminRequest as portalRequest } from './adminApi';
import { portalTheme } from './portalTheme';

const groups=[{label:'Main',items:[['Dashboard','/admin-dashboard',LayoutDashboard]]},{label:'Administration',items:[['Membership Approvals','/admin-approvals',ShieldCheck],['User Management','/admin-users',UserRound],['Reports & Analytics','/admin-reports',BarChart3],['Announcement Oversight','/admin-announcements',Megaphone],['Audit Logs','/admin-audit',FileText],['System Settings','/admin-settings',Settings]]}];

export default function AdminLayout({ user, title, children, alertActive=false, fontSize='text-base', setFontSize=()=>{}, themeMode='light', setThemeMode=()=>{}, isDyslexicFont=false, setIsDyslexicFont=()=>{} }) {
  const navigate=useNavigate();
  const location=useLocation();
  const t=portalTheme(themeMode);
  const [menuOpen,setMenuOpen]=useState(false);
  const [popup,setPopup]=useState(null);
  const [conversations,setConversations]=useState([]);
  const [notifications,setNotifications]=useState([]);
  const [messageUnread,setMessageUnread]=useState(0);
  const [notificationUnread,setNotificationUnread]=useState(0);
  const [messageError,setMessageError]=useState('');
  const [notificationError,setNotificationError]=useState('');
  const [activityLoading,setActivityLoading]=useState(true);
  const [readingBusy,setReadingBusy]=useState(false);
  const controlsRef=useRef(null);
  const sidebarRef=useRef(null);
  const profileIdentity=null;
  const fullName=user?.username||'Administrator';
  const [speechLanguage,setSpeechLanguage]=useState(()=>localStorage.getItem('public_speechLanguage')||'en');
  const [speechNotice,setSpeechNotice]=useState('');
  const speak=()=>speakSpeech(speechLanguage==='fil'?'Admin portal ng PWDConnect. Makikita rito ang buod ng mga miyembro, kawani, pending na pagpaparehistro, service request, at naitalang aktibidad. Nasa itaas ang mensahe at abiso. Gamitin ang Approvals upang suriin ang mga application. Gamitin ang User Management upang pamahalaan ang miyembro at kawani.':'PWDConnect admin portal. Review member and staff counts, pending registrations, service requests and recorded activity. Use the message and notification icons at the top. Use Approvals to review membership applications. Use User Management to manage members and staff.',speechLanguage,setSpeechNotice);
  useEffect(()=>()=>stopSpeech(),[location.pathname]);
  const button=`inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-11 rounded-lg font-semibold cursor-pointer transition disabled:opacity-50 disabled:cursor-not-allowed ${t.focus}`;

  useEffect(()=>{setMenuOpen(false);setPopup(null);},[location.pathname,location.search]);
  useEffect(()=>{if(alertActive){setMenuOpen(false);setPopup(null);}},[alertActive]);

  useEffect(()=>{
    let active=true, running=false, controller;
    async function load(){
      if(running)return;
      running=true;
      controller=new AbortController();
      const results=await Promise.allSettled([
        portalRequest('/messages/conversations',{signal:controller.signal}),
        portalRequest('/notifications',{signal:controller.signal}),
      ]);
      if(active){
        const [messages,alerts]=results;
        if(messages.status==='fulfilled'){
          setConversations(messages.value.conversations||[]);
          setMessageUnread(Number(messages.value.unreadCount)||0);
          setMessageError('');
        }else if(messages.reason.name!=='AbortError')setMessageError(messages.reason.message);
        if(alerts.status==='fulfilled'){
          setNotifications(alerts.value.notifications||[]);
          setNotificationUnread(Number(alerts.value.unreadCount)||0);
          setNotificationError('');
        }else if(alerts.reason.name!=='AbortError')setNotificationError(alerts.reason.message);
        setActivityLoading(false);
      }
      running=false;
    }
    load();
    const timer=setInterval(load,10000);
    window.addEventListener('pwd-portal-refresh',load);
    return()=>{active=false;clearInterval(timer);controller?.abort();window.removeEventListener('pwd-portal-refresh',load);};
  },[user?.username]);

  useEffect(()=>{
    if(!popup)return;
    const outside=event=>{if(!controlsRef.current?.contains(event.target))setPopup(null);};
    const escape=event=>{if(event.key==='Escape'){setPopup(null);controlsRef.current?.querySelector(`[data-popup="${popup}"]`)?.focus();}};
    document.addEventListener('mousedown',outside);
    document.addEventListener('keydown',escape);
    return()=>{document.removeEventListener('mousedown',outside);document.removeEventListener('keydown',escape);};
  },[popup]);

  useEffect(()=>{
    if(!menuOpen)return;
    const priorOverflow=document.body.style.overflow;
    const priorFocus=document.activeElement;
    document.body.style.overflow='hidden';
    const controls=()=>Array.from(sidebarRef.current?.querySelectorAll('button,a[href]')||[]).filter(element=>element.offsetParent!==null);
    controls()[0]?.focus();
    const key=event=>{
      if(event.key==='Escape'){setMenuOpen(false);return;}
      if(event.key!=='Tab')return;
      const items=controls(),first=items[0],last=items[items.length-1];
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
    };
    const resize=()=>{if(window.innerWidth>=1024)setMenuOpen(false);};
    document.addEventListener('keydown',key);window.addEventListener('resize',resize);
    return()=>{document.body.style.overflow=priorOverflow;document.removeEventListener('keydown',key);window.removeEventListener('resize',resize);if(priorFocus instanceof HTMLElement&&priorFocus.isConnected)priorFocus.focus();};
  },[menuOpen]);

  async function markAll(){
    if(!notifications.length||readingBusy)return;
    setReadingBusy(true);
    try{
      const upToId=Math.max(...notifications.map(item=>item.id));
      await portalRequest('/notifications/read-all',{method:'PATCH',body:JSON.stringify({up_to_id:upToId})});
      setNotifications(items=>items.map(item=>({...item,read_at:item.read_at||new Date().toISOString()})));
      notifyPortalRefresh();
    }catch(error){setNotificationError(error.message);}finally{setReadingBusy(false);}
  }
  async function openNotification(item){
    if(readingBusy)return;
    setReadingBusy(true);
    try{
      await portalRequest(`/notifications/${item.id}/read`,{method:'PATCH'});
      notifyPortalRefresh();setPopup(null);
      if(item.target_path?.startsWith('/')&&!item.target_path.startsWith('//'))navigate(item.target_path);
    }catch(error){setNotificationError(error.message);}finally{setReadingBusy(false);}
  }
  const toggle=name=>setPopup(current=>current===name?null:name);
  const countBadge=count=>count>0?<span className={`absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full text-[0.7em] font-bold flex items-center justify-center ${t.badge}`}>{count>99?'99+':count}</span>:null;
  const popoverClass=`absolute right-0 top-full mt-3 w-96 max-w-[calc(100vw_-_2rem)] max-h-[calc(100dvh_-_6rem)] rounded-2xl shadow-xl overflow-y-auto z-40 max-sm:fixed max-sm:left-4 max-sm:right-4 max-sm:top-20 max-sm:mt-0 max-sm:w-auto ${t.card}`;

  return(
    <div className={`admin-shell min-h-screen flex ${fontSize} ${isDyslexicFont?'font-mono':'font-sans'} ${t.page}`}>
      {menuOpen&&<button type="button" tabIndex={-1} aria-label="Close navigation" onClick={()=>setMenuOpen(false)} className="fixed inset-0 bg-black/60 z-30 lg:hidden"/>}
      <aside ref={sidebarRef} id="pwd-admin-navigation" aria-label="Main navigation" role={menuOpen?'dialog':undefined} aria-modal={menuOpen?true:undefined}
        className={`fixed inset-y-0 left-0 z-40 w-72 max-w-[85vw] p-5 overflow-y-auto flex flex-col justify-between transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:z-auto lg:max-w-none lg:translate-x-0 lg:shrink-0 ${menuOpen?'translate-x-0':'-translate-x-full max-lg:invisible'} ${t.sidebar}`}>
        <div>
          <div className="flex items-center justify-between gap-3 mb-6 px-2 py-3">
            <PortalBrand themeMode={themeMode} subtitle="Admin Portal"/>
            <button type="button" onClick={()=>setMenuOpen(false)} aria-label="Close navigation" className={`lg:hidden size-11 shrink-0 rounded-lg inline-flex items-center justify-center ${t.idle} ${t.focus}`}><X className="size-5" aria-hidden="true"/></button>
          </div>
          <div className="space-y-6">{groups.map(group=><div key={group.label}><p className={`px-3 mb-2 text-[0.8em] font-semibold ${t.subtle}`}>{group.label}</p><nav aria-label={group.label} className="space-y-1">{group.items.map(([label,path,Icon])=>path?<a key={label} href={path} aria-current={location.pathname===path?'page':undefined} onClick={event=>{if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;event.preventDefault();setMenuOpen(false);navigate(path);}} className={`flex items-center gap-3 px-4 py-3 rounded-lg ${t.focus} ${location.pathname===path?t.active:t.idle}`}><Icon className="size-5"/>{label}</a>:<button key={label} type="button" disabled className={`w-full flex items-center gap-3 text-left px-4 py-3 rounded-lg opacity-60 ${t.idle}`}><Icon className="size-5 shrink-0"/><span className="flex-1 text-[0.9em]">{label}</span><span className="text-[0.65em]">Soon</span></button>)}</nav></div>)}</div>

        </div>
        <div className={`mt-6 pt-4 border-t space-y-3 ${t.divider}`}><div className={`rounded-xl p-3.5 flex items-center gap-3 ${t.card}`}><span className={`size-11 shrink-0 rounded-lg inline-flex items-center justify-center font-bold ${t.active}`}>{profileIdentity?.profile_pic?<img src={profileIdentity.profile_pic} alt="" className="size-11 rounded-lg object-cover"/>:fullName.charAt(0).toUpperCase()}</span><div className="min-w-0"><p className={`font-semibold text-[0.9em] truncate ${t.heading}`}>{fullName}</p><p className={`text-[0.75em] truncate ${t.subtle}`}>Administrator</p></div></div><button type="button" onClick={async()=>{stopSpeech();await logoutAccount('admin');sessionStorage.removeItem('adminAccessToken');navigate('/');}} className={`w-full ${button} ${t.secondary}`}><LogOut className="size-5" aria-hidden="true"/>Logout</button></div>
      </aside>
      <div className="flex-1 min-w-0" inert={menuOpen?true:undefined}>
        <header className={`sticky top-0 z-20 flex items-center justify-between gap-2 px-4 sm:px-8 lg:px-10 py-3 ${t.header}`}>
          <div className="flex items-center gap-2 min-w-0"><button type="button" aria-label="Open navigation" aria-expanded={menuOpen} aria-controls="pwd-admin-navigation" onClick={()=>setMenuOpen(true)} className={`lg:hidden size-11 shrink-0 inline-flex items-center justify-center rounded-lg ${t.idle} ${t.focus}`}><Menu className="size-5" aria-hidden="true"/></button><PortalBrand themeMode={themeMode} subtitle="Admin Portal" compact/></div>
          <div ref={controlsRef} className="relative flex items-center gap-1 sm:gap-3 shrink-0">
            <button type="button" data-popup="accessibility" aria-label="Accessibility options" aria-expanded={popup==='accessibility'} aria-controls="portal-accessibility" onClick={()=>toggle('accessibility')} className={`${button} px-3 ${t.secondary}`}><Accessibility className="size-5" aria-hidden="true"/><span className="hidden md:inline">Accessibility</span><ChevronDown className="size-4 hidden md:block" aria-hidden="true"/></button>
            <button type="button" data-popup="messages" aria-label={`Messages, ${messageUnread} unread`} aria-expanded={popup==='messages'} aria-controls="portal-messages-dropdown" onClick={()=>toggle('messages')} className={`relative size-11 inline-flex items-center justify-center rounded-lg ${t.idle} ${t.focus}`}><MessageSquare className="size-5" aria-hidden="true"/>{countBadge(messageUnread)}</button>
            <button type="button" data-popup="notifications" aria-label={`Notifications, ${notificationUnread} unread`} aria-expanded={popup==='notifications'} aria-controls="portal-notifications-dropdown" onClick={()=>toggle('notifications')} className={`relative size-11 inline-flex items-center justify-center rounded-lg ${t.idle} ${t.focus}`}><Bell className="size-5" aria-hidden="true"/>{countBadge(notificationUnread)}</button>
            <div className={`hidden xl:flex items-center gap-2 border-l pl-4 ${t.divider}`}><span className={`max-w-48 truncate text-[0.9em] font-semibold ${t.heading}`}>{fullName}</span><span className={`px-2.5 py-1 rounded-md text-[0.75em] font-bold ${t.tile}`}>Admin</span></div>

            {popup==='accessibility'&&<section id="portal-accessibility" aria-label="Accessibility settings" className={`${popoverClass} p-5 space-y-4 max-h-[75vh] overflow-y-auto`}>
              <p className={`text-[0.8em] font-semibold ${t.subtle}`}>Display Mode</p><div className="grid grid-cols-3 gap-1">{[['light','Light'],['dark','Dark'],['contrast','High']].map(([mode,label])=><button key={mode} type="button" aria-pressed={themeMode===mode} onClick={()=>setThemeMode(mode)} className={`${button} px-2 ${themeMode===mode?t.active:t.secondary}`}>{label}</button>)}</div>
              <button type="button" aria-pressed={isDyslexicFont} onClick={()=>setIsDyslexicFont(!isDyslexicFont)} className={`w-full ${button} ${t.secondary}`}>Dyslexia Font: {isDyslexicFont?'ON':'OFF'}</button>
              <p className={`text-[0.8em] font-semibold ${t.subtle}`}>Text Size</p><div className="grid grid-cols-3 gap-1">{[['text-sm','A−','Small text'],['text-base','A','Normal text'],['text-lg','A+','Large text']].map(([size,label,description])=><button key={size} type="button" aria-label={description} aria-pressed={fontSize===size} onClick={()=>setFontSize(size)} className={`${button} ${fontSize===size?t.active:t.secondary}`}>{label}</button>)}</div>
              <label htmlFor="admin-speech-language" className="block font-semibold text-[0.8em]">Speak language</label><select id="admin-speech-language" value={speechLanguage} onChange={e=>{setSpeechLanguage(e.target.value);localStorage.setItem('public_speechLanguage',e.target.value);stopSpeech();setSpeechNotice('');}} className={`w-full p-3 rounded-lg ${t.input} ${t.focus}`}><option value="en">English</option><option value="fil">Filipino / Tagalog</option></select><div className="flex gap-2"><button type="button" onClick={speak} className={`${button} ${t.primary}`}><Volume2 className="size-4"/>Speak</button><button type="button" onClick={()=>{stopSpeech();setSpeechNotice('');}} className={`${button} ${t.secondary}`}><Square className="size-4"/>Stop</button></div>{speechNotice&&<p role="status" className="text-[0.8em]">{speechNotice}</p>}<p className="text-[0.75em] opacity-75">Online speech sends the summary to Microsoft Azure.</p>
            </section>}

            {popup==='messages'&&<section id="portal-messages-dropdown" aria-label="Messages preview" className={popoverClass}>
              <h2 className={`px-5 py-4 border-b font-semibold ${t.divider} ${t.heading}`}>Messages</h2>
              <div className="max-h-72 overflow-y-auto">{messageError?<p role="alert" className={`p-5 text-[0.85em] ${t.muted}`}>{messageError}</p>:activityLoading?<p className="p-5">Loading messages…</p>:!conversations.length?<p className={`p-5 ${t.muted}`}>No conversations yet.</p>:conversations.slice(0,5).map(item=><button type="button" key={item.id} onClick={()=>{setPopup(null);navigate(`/admin-messages?conversation=${item.id}`);}} className={`block w-full text-left px-5 py-4 border-b ${t.divider} ${t.focus} ${Number(item.unread_count)>0?t.unread:t.idle}`}><p className={`font-semibold text-[0.9em] ${t.heading}`}>{item.peer_name} <span className={`text-[0.75em] ${t.subtle}`}>({item.peer_kind==='admin'?'Admin':item.peer_kind==='staff'?'Staff':'PWD'})</span></p><p className={`text-[0.85em] mt-1 truncate ${t.muted}`}>{item.last_message||'Start a conversation'}</p></button>)}</div>
              <button type="button" onClick={()=>{setPopup(null);navigate('/admin-messages');}} className={`w-full rounded-none ${button} ${t.idle}`}>Open Messages</button>
            </section>}

            {popup==='notifications'&&<section id="portal-notifications-dropdown" aria-label="Notifications preview" className={popoverClass}>
              <div className={`flex items-center justify-between gap-3 px-5 py-3 border-b ${t.divider}`}><h2 className={`font-semibold ${t.heading}`}>Notifications</h2><button type="button" disabled={!notificationUnread||readingBusy} onClick={markAll} className={`text-[0.8em] min-h-11 px-2 rounded-lg font-semibold ${t.focus} ${t.idle}`}>Mark all read</button></div>
              <div className="max-h-80 overflow-y-auto">{notificationError?<p role="alert" className={`p-5 text-[0.85em] ${t.muted}`}>{notificationError}</p>:activityLoading?<p className="p-5">Loading notifications…</p>:!notifications.length?<p className={`p-5 ${t.muted}`}>No notifications yet.</p>:notifications.slice(0,10).map(item=><button type="button" disabled={readingBusy} key={item.id} onClick={()=>openNotification(item)} className={`w-full block text-left px-5 py-4 border-b ${t.divider} ${t.focus} ${item.read_at?t.idle:t.unread}`}><p className={`font-semibold text-[0.85em] ${t.heading}`}>{item.title}</p><p className={`mt-1 truncate text-[0.8em] ${t.muted}`}>{item.body}</p><p className={`mt-1 text-[0.75em] ${t.subtle}`}>{formatPortalDate(item.created_at)}</p></button>)}</div>
              <button type="button" onClick={()=>{setPopup(null);navigate('/admin-notifications');}} className={`w-full rounded-none ${button} ${t.idle}`}>View all notifications</button>
            </section>}
          </div>
        </header>
        <main className="staff-content p-4 sm:p-8 lg:p-10 w-full max-w-[1600px] mx-auto">{title&&<h1 className={`text-[1.6em] sm:text-[1.9em] font-bold tracking-tight mb-6 ${t.heading}`}>{title}</h1>}{children}</main>
      </div>
    </div>
  );
}
