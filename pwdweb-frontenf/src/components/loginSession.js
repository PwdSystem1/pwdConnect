
export function acceptLoginSession(data){
 const role=data.role||({member:'user',applicant:'applicant',staff:'staff',admin:'admin'})[data.accountType];
 if(!['user','staff','admin','applicant','password_change'].includes(role)||typeof data.token!=='string'||!data.token)throw Error('Invalid login response. Check the updated backend.');
 if(role==='admin'&&!data.admin||['user','staff'].includes(role)&&!data.user)throw Error('Incomplete login response.');
 localStorage.removeItem('portalToken');localStorage.removeItem('userSession');sessionStorage.removeItem('adminAccessToken');sessionStorage.removeItem('applicantToken');sessionStorage.removeItem('passwordChangeToken');
 if(role==='password_change'){sessionStorage.setItem('passwordChangeToken',data.token);return '/change-initial-password';}
 if(role==='admin'){sessionStorage.setItem('adminAccessToken',data.token);return '/admin-dashboard';}
 if(role==='applicant'){sessionStorage.setItem('applicantToken',data.token);return data.profileComplete?'/verifying-dashboard':'/complete-profile';}
 localStorage.setItem('portalToken',data.token);localStorage.setItem('userSession',JSON.stringify(data.user));return role==='staff'?'/staff-dashboard':'/dashboard';
}
