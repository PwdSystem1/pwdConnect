import { useEffect,useRef,useState } from 'react';
import { Link,useNavigate } from 'react-router-dom';
import { Mail } from 'lucide-react';
import PublicLayout from '../publicPortal/PublicLayout';
import { PORTAL_API } from '../components/portalApi';
import { portalTheme } from '../components/portalTheme';
import { acceptApplicantSession } from './applicantApi';
export default function VerifyEmail(props){
 const navigate=useNavigate(),t=portalTheme(props.themeMode||'light');
 const token=useRef(new URLSearchParams(window.location.hash.slice(1)).get('token')||'');
 const pending=useRef(null),[error,setError]=useState('');
 useEffect(()=>{
  let active=true;
  if(window.location.hash)window.history.replaceState(null,'',window.location.pathname+window.location.search);
  if(!token.current){setError('This link has no verification token. If your email is already verified, sign in. Otherwise request a new link.');return;}
  // Reuse one request across React StrictMode effect replay; do not consume a one-use link twice.
  if(!pending.current)pending.current=fetch(PORTAL_API+'/registration/verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:token.current})}).then(async response=>{
   if(!response.headers.get('content-type')?.includes('application/json'))throw Error('Verification API is unavailable. Check the backend routes.');
   const data=await response.json();if(!response.ok||!data.success)throw Error(data.message||'Unable to verify this link.');return data;
  });
  pending.current.then(data=>{if(active){acceptApplicantSession(data);token.current='';navigate('/complete-profile',{replace:true});}}).catch(e=>{if(active)setError(e.message);});
  return()=>{active=false;};
 },[navigate]);
 return <PublicLayout {...props} speechText={{en:'Verifying your email. A verified email opens account profile setup. Membership still needs administrator approval.',fil:'Kinukumpirma ang iyong email. Pagkatapos nito, maaari kang magsumite ng application. Kailangan pa rin ang pag-apruba ng administrador.'}}><section className={`max-w-xl mx-4 sm:mx-auto my-12 p-6 sm:p-8 rounded-2xl ${t.card}`}><Mail className="size-9 text-sky-500"/><h1 className="text-2xl font-bold mt-4">Email verification</h1>{error?<><p role="alert" className={`mt-5 p-4 rounded-lg ${t.error}`}>{error}</p><div className="flex flex-wrap gap-4 mt-6"><Link to="/?login=user" className="underline">Sign in</Link><Link to="/create-account" className="underline">Resend verification</Link></div></>:<p role="status" className={`mt-4 ${t.muted}`}>Verifying your email and opening your personal information form…</p>}</section></PublicLayout>;
}
