import { PORTAL_API } from '../components/portalApi';
export function acceptApplicantSession(data) {
  sessionStorage.setItem('applicantToken',data.token);
  localStorage.removeItem('portalToken');
  localStorage.removeItem('userSession');
}
export async function applicantRequest(path,options={}) {
  const token=sessionStorage.getItem('applicantToken');
  if(!token)throw Object.assign(new Error('Sign in using your applicant username and password.'),{status:401});
  const response=await fetch(PORTAL_API+'/applicant'+path,{...options,headers:{Authorization:'Bearer '+token,...(options.body?{'Content-Type':'application/json'}:{}),...options.headers}});
  if(!response.headers.get('content-type')?.includes('application/json'))throw Error('Applicant API is unavailable. Check backend routes and restart the server.');
  const data=await response.json();
  if(!response.ok||!data.success)throw Object.assign(new Error(data.message||'Unable to complete the request.'),{status:response.status});
  return data;
}
