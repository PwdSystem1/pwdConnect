import {stopSpeech} from './speechPlayer';
import {useEffect,useRef,useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {CheckCircle2,Eye,EyeOff,KeyRound,ShieldCheck} from 'lucide-react';
import {portalRequest} from './portalApi';
import {portalTheme} from './portalTheme';
const EMPTY={current_password:'',new_password:'',confirm_password:''};
export default function AccountPasswordSettings({kind,themeMode='light',disabled=false,onChanged}){
 const navigate=useNavigate(),t=portalTheme(themeMode),[open,setOpen]=useState(false),[values,setValues]=useState(EMPTY),[visible,setVisible]=useState({}),[busy,setBusy]=useState(false),[error,setError]=useState(''),[changed,setChanged]=useState(false);
 const abort=useRef(null),submitting=useRef(false),currentRef=useRef(null),successRef=useRef(null);
 const button=`inline-flex items-center justify-center gap-2 px-4 py-3 min-h-11 rounded-lg font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${t.focus}`;
 useEffect(()=>()=>abort.current?.abort(),[]);
 useEffect(()=>{if(open&&!changed)currentRef.current?.focus();if(changed)successRef.current?.focus();},[open,changed]);
 function cancel(){if(submitting.current)return;setOpen(false);setValues(EMPTY);setVisible({});setError('');}
 async function submit(event){
  event.preventDefault();if(disabled||submitting.current)return;setError('');
  if(!values.current_password){setError('Enter your current password.');return;}
  if(values.new_password.length<12||values.new_password.length>128||!values.new_password.trim()){setError('Use a new password of 12–128 characters.');return;}
  if(values.new_password!==values.confirm_password){setError('New password and confirmation must match.');return;}
  submitting.current=true;setBusy(true);abort.current=new AbortController();
  try{
   await portalRequest('/password-change/self',{method:'POST',body:JSON.stringify(values),signal:abort.current.signal});
   setValues(EMPTY);setVisible({});setChanged(true);setOpen(false);
   // Keep accessibility preferences; only this member/staff login is removed.
   localStorage.removeItem('portalToken');localStorage.removeItem('userSession');
   stopSpeech();onChanged?.();
  }catch(e){if(e.name!=='AbortError'){setError(e.message);setValues(previous=>({...previous,current_password:''}));currentRef.current?.focus();}}
  finally{if(!abort.current.signal.aborted){submitting.current=false;setBusy(false);}}
 }
 const fields=[['Current password','current_password','current-password'],['New password','new_password','new-password'],['Confirm new password','confirm_password','new-password']];
 return <section aria-label="Account Settings" className={`mt-6 p-5 sm:p-6 rounded-2xl ${t.card}`}>
  <div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0"><h2 className={`font-bold text-[1.15em] flex items-center gap-2 ${t.heading}`}><ShieldCheck className="size-5"/>Account Settings</h2><p className={`text-[0.85em] mt-2 ${t.muted}`}>Manage the password for your {kind==='staff'?'staff':'PWD member'} login.</p></div>{!open&&!changed&&<button type="button" disabled={disabled} onClick={()=>{setOpen(true);setError('');}} className={`${button} ${t.primary}`}><KeyRound className="size-4"/>Change Password</button>}</div>
  {disabled&&!changed&&<p className={`text-[0.85em] mt-3 ${t.subtle}`}>Save or cancel your profile edits before changing your password.</p>}
  {changed?<div ref={successRef} tabIndex={-1} role="status" className={`p-4 mt-5 rounded-xl ${t.tile}`}><h3 className="font-bold flex items-center gap-2"><CheckCircle2 className="size-5"/>Password changed successfully</h3><p className="text-[0.9em] mt-3">All previous sessions have ended. Sign in again with your new password.</p><button type="button" onClick={()=>navigate('/',{replace:true})} className={`mt-4 ${button} ${t.primary}`}>Sign in again</button></div>:open&&<form onSubmit={submit} className="mt-6 space-y-5" aria-label="Change account password">
   {error&&<p role="alert" className={`p-4 rounded-xl ${t.error}`}>{error}</p>}
   <fieldset disabled={busy||disabled} className="space-y-5"><div className="grid grid-cols-1 lg:grid-cols-2 gap-5">{fields.map(([label,key,autoComplete])=><div key={key} className="min-w-0"><label htmlFor={`password-${kind}-${key}`} className="block text-[0.9em] font-semibold mb-2">{label}</label><div className="relative"><input ref={key==='current_password'?currentRef:undefined} id={`password-${kind}-${key}`} type={visible[key]?'text':'password'} autoComplete={autoComplete} required minLength={key==='current_password'?1:12} maxLength={128} spellCheck={false} value={values[key]} onChange={e=>setValues(previous=>({...previous,[key]:e.target.value}))} className={`w-full min-w-0 p-3 pr-14 rounded-lg min-h-12 ${t.input} ${t.focus}`}/><button type="button" aria-label={`${visible[key]?'Hide':'Show'} ${label.toLowerCase()}`} aria-pressed={Boolean(visible[key])} onClick={()=>setVisible(previous=>({...previous,[key]:!previous[key]}))} className={`absolute right-1 top-1 bottom-1 w-11 rounded-lg flex items-center justify-center ${t.focus}`}>{visible[key]?<EyeOff className="size-5"/>:<Eye className="size-5"/>}</button></div>{key==='new_password'&&<p className={`text-[0.8em] mt-2 ${t.subtle}`}>12–128 characters. Choose a password different from your current password.</p>}</div>)}</div>
   <p className={`text-[0.85em] ${t.muted}`}>After changing your password, sign in again on every device. Your username and profile details stay the same.</p><div className="flex flex-wrap gap-3"><button type="submit" className={`${button} ${t.primary}`}><KeyRound className="size-4"/>{busy?'Changing password…':'Update Password'}</button><button type="button" onClick={cancel} className={`${button} ${t.secondary}`}>Cancel password change</button></div></fieldset>
  </form>}
 </section>;
}
