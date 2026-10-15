import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Plus, Search, Send, X } from 'lucide-react';
import AdminLayout from '../components/AdminLayout';
import useAdminAccount from '../components/useAdminAccount';
import { adminRequest as portalRequest } from '../components/adminApi';
import { portalTheme } from '../components/portalTheme';
import { formatPortalDate, notifyPortalRefresh } from '../components/portalApi';

export default function AdminMessages(props){
  const user=useAdminAccount();
  const t=portalTheme(props.themeMode||'light');
  const [params,setParams]=useSearchParams();
  const conversationId=/^[1-9]\d*$/.test(params.get('conversation')||'')?Number(params.get('conversation')):null;
  const [conversations,setConversations]=useState([]);
  const [listLoading,setListLoading]=useState(true);
  const [listError,setListError]=useState('');
  const [thread,setThread]=useState({id:null,messages:[],hasMore:false});
  const [threadLoading,setThreadLoading]=useState(false);
  const [threadError,setThreadError]=useState('');
  const [draft,setDraft]=useState('');
  const [sending,setSending]=useState(false);
  const [olderLoading,setOlderLoading]=useState(false);
  const [newOpen,setNewOpen]=useState(false);
  const [search,setSearch]=useState('');
  const [contacts,setContacts]=useState([]);
  const [contactsLoading,setContactsLoading]=useState(false);
  const [contactError,setContactError]=useState('');
  const [creating,setCreating]=useState(false);
  const [retry,setRetry]=useState(0);
  const dialogRef=useRef(null);
  const scrollRef=useRef(null);
  const nearBottom=useRef(true);
  const button=`inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-11 rounded-lg font-semibold cursor-pointer transition disabled:opacity-50 disabled:cursor-not-allowed ${t.focus}`;
  const current=conversations.find(item=>Number(item.id)===conversationId);
  const messages=thread.id===conversationId?thread.messages:[];

  useEffect(()=>{
    if(!user)return;
    let active=true,running=false,controller;
    async function load(){
      if(running)return;running=true;controller=new AbortController();
      try{
        const data=await portalRequest('/messages/conversations',{signal:controller.signal});
        if(active){setConversations(data.conversations||[]);setListError('');}
      }catch(error){if(active&&error.name!=='AbortError')setListError(error.message);}
      finally{running=false;if(active)setListLoading(false);}
    }
    load();const timer=setInterval(load,10000);
    window.addEventListener('pwd-portal-refresh',load);
    return()=>{active=false;clearInterval(timer);controller?.abort();window.removeEventListener('pwd-portal-refresh',load);};
  },[user,retry]);

  useEffect(()=>{
    if(!user||!conversationId)return;
    let active=true,timer,controller;
    nearBottom.current=true;setThreadLoading(true);setThreadError('');setDraft('');
    async function load(){
      controller=new AbortController();
      try{
        const data=await portalRequest(`/messages/conversations/${conversationId}/messages`,{signal:controller.signal});
        if(!active)return;
        setThread(previous=>{
          const entries=new Map((previous.id===conversationId?previous.messages:[]).map(item=>[item.id,item]));
          for(const item of data.messages)entries.set(item.id,item);
          return{id:conversationId,messages:Array.from(entries.values()).sort((a,b)=>a.id-b.id),hasMore:previous.id===conversationId&&previous.messages.length>50?previous.hasMore:data.hasMore};
        });
        setThreadError('');
        const last=data.messages.at(-1);
        if(last&&nearBottom.current){
          await portalRequest(`/messages/conversations/${conversationId}/read`,{method:'PATCH',signal:controller.signal,body:JSON.stringify({message_id:last.id})});
          notifyPortalRefresh();
        }
      }catch(error){if(active&&error.name!=='AbortError')setThreadError(error.message);}
      finally{if(active){setThreadLoading(false);timer=setTimeout(load,5000);}}
    }
    load();return()=>{active=false;clearTimeout(timer);controller?.abort();};
  },[conversationId,user,retry]);

  useEffect(()=>{
    if(nearBottom.current&&scrollRef.current)scrollRef.current.scrollTop=scrollRef.current.scrollHeight;
  },[thread]);

  useEffect(()=>{
    const dialog=dialogRef.current;
    if(!dialog)return;
    if(newOpen&&!dialog.open)dialog.showModal();
    if(!newOpen&&dialog.open)dialog.close();
  },[newOpen]);

  useEffect(()=>{
    if(!newOpen)return;
    const controller=new AbortController();
    setContactsLoading(true);setContactError('');
    const timer=setTimeout(async()=>{
      try{
        const data=await portalRequest(`/messages/contacts?search=${encodeURIComponent(search)}`,{signal:controller.signal});
        if(!controller.signal.aborted)setContacts(data.contacts||[]);
      }catch(error){if(error.name!=='AbortError')setContactError(error.message);}
      finally{if(!controller.signal.aborted)setContactsLoading(false);}
    },250);
    return()=>{clearTimeout(timer);controller.abort();};
  },[newOpen,search]);

  async function start(contact){
    if(creating)return;setCreating(true);setContactError('');
    try{
      const data=await portalRequest('/messages/conversations',{method:'POST',body:JSON.stringify({recipient_kind:contact.kind,recipient_username:contact.username})});
      setConversations(previous=>[data.conversation,...previous.filter(item=>item.id!==data.conversation.id)]);
      setParams({conversation:String(data.conversation.id)});setNewOpen(false);notifyPortalRefresh();
    }catch(error){setContactError(error.message);}finally{setCreating(false);}
  }
  async function send(event){
    event.preventDefault();if(sending||!draft.trim()||!conversationId)return;
    const target=conversationId;setSending(true);setThreadError('');
    try{
      const data=await portalRequest(`/messages/conversations/${target}/messages`,{method:'POST',body:JSON.stringify({body:draft.trim()})});
      setThread(previous=>previous.id===target?{...previous,messages:[...previous.messages.filter(item=>item.id!==data.message.id),data.message]}:previous);
      setDraft('');nearBottom.current=true;notifyPortalRefresh();
    }catch(error){setThreadError(error.message);}finally{setSending(false);}
  }
  async function loadOlder(){
    if(olderLoading||!messages.length)return;
    setOlderLoading(true);const target=conversationId;
    try{
      const data=await portalRequest(`/messages/conversations/${target}/messages?before=${messages[0].id}`);
      nearBottom.current=false;
      setThread(previous=>{
        if(previous.id!==target)return previous;
        const entries=new Map([...data.messages,...previous.messages].map(item=>[item.id,item]));
        return{...previous,messages:Array.from(entries.values()).sort((a,b)=>a.id-b.id),hasMore:data.hasMore};
      });
    }catch(error){setThreadError(error.message);}finally{setOlderLoading(false);}
  }
  if(!user)return <p role="status" className="p-8">Loading your account…</p>;

  return <AdminLayout {...props} user={user} title="Messages">
    <div className="flex flex-wrap items-center justify-between gap-4 mb-6"><p className={t.muted}>Assist PWD members and coordinate with other LGU staff.</p><button type="button" onClick={()=>{setSearch('');setNewOpen(true);}} className={`${button} ${t.primary}`}><Plus className="size-5" aria-hidden="true"/>New Message</button></div>
    {listError&&<div role="alert" className={`rounded-xl p-4 mb-4 ${t.error}`}>{listError}<button type="button" onClick={()=>setRetry(value=>value+1)} className={`ml-3 ${button} ${t.secondary}`}>Retry</button></div>}
    <div className={`grid grid-cols-1 lg:grid-cols-[20rem_minmax(0,1fr)] rounded-2xl overflow-hidden ${t.card}`}>
      <section aria-label="Conversations" className={`${conversationId?'hidden lg:block':''} border-b lg:border-b-0 lg:border-r ${t.divider}`}>
        <h2 className={`font-bold p-5 border-b ${t.divider} ${t.heading}`}>Conversations</h2>
        <div className="max-h-[65vh] overflow-y-auto">{listLoading?<p role="status" className="p-5">Loading conversations…</p>:!conversations.length?<p className={`p-5 ${t.muted}`}>No conversations yet. Select New Message to start.</p>:conversations.map(item=><button type="button" disabled={sending} key={item.id} onClick={()=>setParams({conversation:String(item.id)})} className={`block text-left w-full p-5 border-b ${t.divider} ${t.focus} ${Number(item.id)===conversationId?t.active:t.idle}`}><div className="flex items-start justify-between gap-2"><p className="font-semibold break-words">{item.peer_name}</p>{Number(item.unread_count)>0&&<span className={`text-xs px-2 py-1 rounded-full ${t.badge}`}>{item.unread_count}</span>}</div><p className="text-[0.75em] mt-1 capitalize">{item.peer_kind==='admin'?'Administrator':item.peer_kind==='staff'?'LGU Staff':'PWD Member'}</p><p className="text-[0.85em] truncate mt-2 opacity-80">{item.last_message||'No messages yet'}</p></button>)}</div>
      </section>
      <section aria-label="Conversation" className={`${!conversationId?'hidden lg:flex lg:flex-col':''} min-w-0`}>
        {!conversationId?<div className={`p-10 text-center min-h-96 flex flex-col items-center justify-center ${t.muted}`}><MessageSquare className="size-12 mb-4" aria-hidden="true"/><h2 className={`font-bold text-[1.2em] ${t.heading}`}>Your conversations</h2><p className="mt-2">Choose a conversation or start a new message.</p></div>:<>
          <div className={`p-5 border-b flex items-center gap-3 ${t.divider}`}><button type="button" disabled={sending} onClick={()=>setParams({})} aria-label="Back to conversations" className={`lg:hidden size-11 rounded-lg flex items-center justify-center ${t.idle} ${t.focus}`}><ArrowLeft className="size-5"/></button><div className="min-w-0"><h2 className={`font-bold truncate ${t.heading}`}>{current?.peer_name||'Conversation'}</h2><p className={`text-[0.8em] ${t.subtle}`}>{current?.peer_kind==='admin'?'Administrator':current?.peer_kind==='staff'?'LGU Staff':'PWD Member'}</p></div></div>
          {threadError&&<p role="alert" className={`m-4 p-3 rounded-lg ${t.error}`}>{threadError}</p>}
          <div ref={scrollRef} onScroll={()=>{const element=scrollRef.current;if(element)nearBottom.current=element.scrollHeight-element.scrollTop-element.clientHeight<80;}} className="p-4 sm:p-6 min-h-72 h-[50vh] max-h-[36rem] overflow-y-auto space-y-4">
            {thread.hasMore&&thread.id===conversationId&&<button type="button" disabled={olderLoading} onClick={loadOlder} className={`${button} ${t.secondary}`}>{olderLoading?'Loading…':'Load earlier messages'}</button>}
            {threadLoading&&!messages.length?<p role="status">Loading messages…</p>:!messages.length?<p className={`text-center py-10 ${t.muted}`}>No messages yet. Say hello below.</p>:messages.map(item=>{const mine=item.sender_kind==='admin'&&item.sender_username===user.username;return <div key={item.id} className={`flex ${mine?'justify-end':'justify-start'}`}><div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 ${mine?t.bubble:t.input}`}><p className="whitespace-pre-wrap break-words text-[0.95em] leading-relaxed">{item.body}</p><p className="text-[0.7em] mt-2 opacity-75">{formatPortalDate(item.created_at)}</p></div></div>;})}
          </div>
          <form onSubmit={send} className={`p-4 sm:p-5 border-t ${t.divider}`}><label htmlFor="message-body" className={`block font-semibold text-[0.85em] mb-2 ${t.heading}`}>Your message</label><textarea id="message-body" rows={3} maxLength={2000} value={draft} disabled={sending||threadLoading||!current} onChange={event=>setDraft(event.target.value)} placeholder="Write a message…" className={`w-full rounded-xl p-3 resize-y ${t.input} ${t.focus}`}/><div className="flex items-center justify-between gap-3 mt-3"><span className={`text-[0.75em] ${t.subtle}`}>{draft.length}/2,000</span><button type="submit" disabled={sending||threadLoading||!current||!draft.trim()} className={`${button} ${t.primary}`}><Send className="size-4" aria-hidden="true"/>{sending?'Sending…':'Send Message'}</button></div></form>
        </>}
      </section>
    </div>
    <dialog ref={dialogRef} onCancel={event=>{if(creating)event.preventDefault();}} onClose={()=>setNewOpen(false)} aria-labelledby="new-message-title" className={`m-auto w-[calc(100%_-_2rem)] max-w-xl max-h-[85vh] rounded-2xl p-6 backdrop:bg-black/60 ${t.card} ${t.page}`}><div className="flex items-center justify-between gap-3 mb-4"><h2 id="new-message-title" className={`font-bold text-[1.25em] ${t.heading}`}>New Message</h2><button type="button" disabled={creating} onClick={()=>setNewOpen(false)} aria-label="Close new message" className={`${button} ${t.idle}`}><X className="size-5"/></button></div><label htmlFor="contact-search" className={`block font-semibold text-[0.9em] mb-2 ${t.heading}`}>Find an admin, staff member or PWD user</label><div className="relative"><Search className={`absolute left-3 top-3 size-5 ${t.subtle}`} aria-hidden="true"/><input id="contact-search" type="search" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Search name or username" className={`w-full pl-11 pr-3 py-3 rounded-xl ${t.input} ${t.focus}`}/></div>{contactError&&<p role="alert" className={`p-3 rounded-xl my-3 ${t.error}`}>{contactError}</p>}<div className="mt-4 max-h-80 overflow-y-auto space-y-2">{contactsLoading?<p role="status">Loading contacts…</p>:!contacts.length?<p className={t.muted}>No matching contacts.</p>:contacts.map(contact=><button type="button" disabled={creating} key={`${contact.kind}:${contact.username}`} onClick={()=>start(contact)} className={`block text-left w-full p-4 rounded-xl ${t.idle} ${t.focus}`}><p className={`font-semibold ${t.heading}`}>{contact.name}</p><p className={`text-[0.8em] mt-1 ${t.subtle}`}>{contact.kind==='admin'?'Administrator':contact.kind==='staff'?'LGU Staff':'PWD Member'} · @{contact.username}</p></button>)}</div></dialog>
  </AdminLayout>;
}
