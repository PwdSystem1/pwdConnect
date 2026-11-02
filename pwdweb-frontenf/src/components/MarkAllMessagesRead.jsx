import {useRef,useState} from 'react';
import {notifyPortalRefresh,portalRequest} from './portalApi';

export function applyMessageReadReceipt(items,upTo){
 return items.map(item=>Number(item.last_message_id)>0&&Number(item.last_message_id)<=upTo?{...item,unread_count:0}:item);
}
export default function MarkAllMessagesRead({conversations=[],disabled=false,t,onRead,request=portalRequest}){
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),pending=useRef(false),callback=useRef(onRead);callback.current=onRead;
 const unread=conversations.reduce((sum,item)=>sum+(Number(item.unread_count)||0),0);
 async function mark(){
  if(pending.current||disabled||!unread)return;
  const upTo=Math.max(0,...conversations.map(item=>Number(item.last_message_id)||0));
  if(!Number.isSafeInteger(upTo)||upTo<1){setError('Reload Messages after the backend update, then try again.');return;}
  pending.current=true;setBusy(true);setError('');
  try{const result=await request('/messages/read-all',{method:'PATCH',body:JSON.stringify({up_to_id:upTo})});callback.current?.(Number(result.readThroughId));notifyPortalRefresh();}
  catch(e){setError(e.message);}
  finally{pending.current=false;setBusy(false);}
 }
 return <div className="min-w-0"><button type="button" disabled={disabled||busy||!unread} onClick={mark} className={`min-h-11 px-2 rounded-lg text-[0.8em] font-semibold disabled:opacity-50 disabled:cursor-not-allowed ${t.focus} ${t.idle}`}>{busy?'Marking…':'Mark all as read'}</button>{error&&<p role="alert" className={`text-[0.75em] max-w-xs break-words mt-1 ${t.muted}`}>{error}</p>}</div>;
}
