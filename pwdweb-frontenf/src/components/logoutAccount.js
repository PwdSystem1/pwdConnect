import {PORTAL_API} from './portalApi';
let pending=null;
export function logoutAccount(kind='portal'){
 if(pending)return pending;
 const token=kind==='admin'?sessionStorage.getItem('adminAccessToken'):kind==='applicant'?sessionStorage.getItem('applicantToken'):localStorage.getItem('portalToken');
 if(!token)return Promise.resolve();
 pending=(async()=>{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),5000);try{const response=await fetch(PORTAL_API+'/logout',{method:'POST',headers:{Authorization:'Bearer '+token},signal:controller.signal});if(!response.ok||response.headers.get('X-Audit-Status')==='unavailable')console.warn('Sign-out audit was unavailable.');}catch{console.warn('Sign-out audit was unavailable.');}finally{clearTimeout(timer);pending=null;}})();return pending;
}
