import ProfileInformationNotice from './ProfileInformationNotice';
import ProfileEmailStatus from './ProfileEmailStatus';
import AccountPasswordSettings from './AccountPasswordSettings';
import { useEffect, useRef, useState } from 'react';
import { Camera, CalendarDays, LockKeyhole, Pencil, Save, Trash2, UserRound } from 'lucide-react';
import StaffLayout from './StaffLayout';
import UserLayout from './UserLayout';
import { portalRequest,notifyPortalRefresh } from './portalApi';
import { portalTheme } from './portalTheme';

const MAX_IMAGE_BYTES=5*1024*1024;
const localToday=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Manila',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
function displayDate(value){if(!value)return 'Not recorded';const d=new Date(value.slice(0,10)+'T00:00:00Z');return Number.isNaN(d.getTime())?'Not recorded':d.toLocaleDateString('en-PH',{dateStyle:'long',timeZone:'UTC'});}
function age(value){if(!value)return '';const [y,m,d]=value.split('-').map(Number),[ny,nm,nd]=localToday().split('-').map(Number);return ny-y-Number(nm<m||(nm===m&&nd<d));}
const STAFF_GROUPS=[{title:'Personal information',fields:[['First name','first_name','text',255],['Middle name','middle_name','text',255],['Last name','last_name','text',255],['Birthday','birthday','date'],['Age','age']]},{title:'PWD information',fields:[['PWD ID number','pwd_id','text',50]]},{title:'Staff account',fields:[['Staff ID','staff_id'],['Username','staff_username'],['Account status','account_status'],['Staff since','staff_since','date']]}];
const USER_GROUPS=[{title:'Personal information',fields:[['First name','first_name'],['Middle name','middle_name'],['Last name','last_name'],['Sex','sex'],['Birthday','birthday','date'],['Age','age'],['Civil status','civil_status'],['Blood type','blood_type']]},{title:'Contact and occupation',fields:[['Contact number','contact_numb','tel',255],['Email address','email','email',255],['Occupation','occupation','text',50]]},{title:'Address',fields:[['House number','house_number'],['Street','street'],['Barangay','baranggay'],['Municipality','municipality'],['Province','province']]},{title:'PWD and membership details',fields:[['Disability','disability'],['PWD ID number','pwd_id'],['Username','acc_username'],['ID expiry date','expired_date','date'],['Member since','member_since','date'],['PWD ID status','id_status']]}];

export default function ProfilePage({kind,account,accessibility}){
 const isStaff=kind==='staff',Layout=isStaff?StaffLayout:UserLayout,t=portalTheme(accessibility.themeMode||'light');
 const endpoint=isStaff?'/staff-profile':'/users/profile/me';
 const [profile,setProfile]=useState(null),[draft,setDraft]=useState(null),[editing,setEditing]=useState(false),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[uploading,setUploading]=useState(false),[photoChanged,setPhotoChanged]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[retry,setRetry]=useState(0);
 const [sessionEnded,setSessionEnded]=useState(false);
 const reader=useRef(null),version=useRef(0),fileRef=useRef(null),saveController=useRef(null);
 const editable=isStaff?['first_name','middle_name','last_name','birthday','is_pwd','pwd_id']:['contact_numb','email','occupation'];
 useEffect(()=>{
  if(!account)return;
  const controller=new AbortController();setLoading(true);setError('');
  portalRequest(endpoint,{signal:controller.signal}).then(data=>{const value=data.profile||data.data;setProfile(value);setDraft(value);setEditing(false);setPhotoChanged(false);}).catch(e=>{if(e.name!=='AbortError')setError(e.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
  return()=>controller.abort();
 },[account,endpoint,retry]);
 useEffect(()=>()=>{version.current++;reader.current?.abort();saveController.current?.abort();},[]);
 const button=`inline-flex items-center justify-center gap-2 min-h-11 px-4 py-3 rounded-lg font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${t.focus}`;
 function cancel(){version.current++;reader.current?.abort();setUploading(false);setDraft(profile);setPhotoChanged(false);setEditing(false);setError('');if(fileRef.current)fileRef.current.value='';}
 function choosePicture(event){
  const file=event.target.files?.[0];if(!file)return;const next=++version.current;reader.current?.abort();setUploading(false);setError('');
  if(!['image/png','image/jpeg','image/webp'].includes(file.type)){setError('Choose a PNG, JPEG, or WebP picture.');event.target.value='';return;}
  if(file.size>MAX_IMAGE_BYTES){setError('Profile picture must be no larger than 5 MB.');event.target.value='';return;}
  setUploading(true);const fileReader=new FileReader();reader.current=fileReader;
  fileReader.onload=()=>{if(version.current===next){setDraft(previous=>({...previous,profile_pic:String(fileReader.result)}));setPhotoChanged(true);setUploading(false);}};
  fileReader.onerror=()=>{if(version.current===next){setError('Unable to read that picture. Please try again.');setUploading(false);}};
  fileReader.readAsDataURL(file);
 }
 function removePicture(){version.current++;reader.current?.abort();setUploading(false);setDraft(previous=>({...previous,profile_pic:null}));setPhotoChanged(true);if(fileRef.current)fileRef.current.value='';}
 async function save(event){
  event.preventDefault();if(saving||uploading)return;setSaving(true);setError('');setNotice('');saveController.current=new AbortController();
  const payload=Object.fromEntries(editable.map(key=>[key,key==='is_pwd'?Boolean(draft[key]):draft[key]??'']));if(photoChanged)payload.profile_pic=draft.profile_pic;
  try{const data=await portalRequest(endpoint,{method:'PUT',body:JSON.stringify(payload),signal:saveController.current.signal});const saved=data.profile||data.data;setProfile(saved);setDraft(saved);setEditing(false);setPhotoChanged(false);setNotice(data.message||'Profile updated successfully.');
   const old=JSON.parse(localStorage.getItem('userSession')||'null');if(old){const sessionDetails={...saved};delete sessionDetails.profile_pic;const session=isStaff?{...old,firstName:saved.first_name,lastName:saved.last_name}:{...old,...sessionDetails};localStorage.setItem('userSession',JSON.stringify(session));}
   window.dispatchEvent(new Event(isStaff?'pwd-staff-profile-updated':'pwd-user-profile-updated'));notifyPortalRefresh();
  }catch(e){if(e.name!=='AbortError')setError(e.message);}finally{if(!saveController.current.signal.aborted)setSaving(false);}
 }
 if(!account)return <p role="status" className="p-8">Loading your account…</p>;
 const details=draft||profile,fullName=profile?[profile.first_name,profile.middle_name,profile.last_name].filter(Boolean).join(' '):isStaff?[account.firstName,account.lastName].filter(Boolean).join(' '):[account.first_name,account.last_name].filter(Boolean).join(' ');
 const layoutUser=profile?{...account,...profile,...(isStaff?{firstName:profile.first_name,lastName:profile.last_name}:{})}:account;
 const status=profile?(isStaff?profile.account_status:profile.id_status):'';
 function field([label,key,type='text',max]){
  const canEdit=editing&&editable.includes(key);const raw=key==='age'?age(details.birthday):details[key];
  const value=type==='date'&&!canEdit?displayDate(raw):raw??'';
  return <div key={key} className="min-w-0"><label htmlFor={`profile-${kind}-${key}`} className={`flex items-center gap-2 mb-2 text-[0.85em] font-semibold ${t.heading}`}>{label}{!editable.includes(key)&&<LockKeyhole className="size-3.5" aria-label="Managed by LGU staff"/>}</label><input id={`profile-${kind}-${key}`} type={canEdit?type:'text'} readOnly={!canEdit} disabled={saving} value={value} maxLength={max} max={type==='date'?localToday():undefined} required={canEdit&&['first_name','last_name','birthday','pwd_id'].includes(key)} onChange={e=>setDraft(previous=>({...previous,[key]:e.target.value}))} className={`w-full min-w-0 p-3 rounded-lg min-h-12 ${t.input} ${t.focus} ${!canEdit?'opacity-90':''}`}/>{!canEdit&&raw===''&&<span className={`text-[0.75em] ${t.subtle}`}>Not recorded</span>}</div>;
 }
 return <Layout {...accessibility} user={layoutUser} title="My Profile">
  {error&&<div role="alert" className={`p-4 rounded-xl mb-6 ${t.error}`}>{error}{!profile&&<button type="button" onClick={()=>setRetry(n=>n+1)} className={`ml-3 ${button} ${t.secondary}`}>Retry</button>}</div>}
  {notice&&<p role="status" className={`p-4 rounded-xl mb-6 border ${t.divider} ${t.tile}`}>{notice}</p>}
  {loading?<p role="status" className="py-8">Loading profile information…</p>:profile&&<>
   <section className={`rounded-2xl p-6 sm:p-8 mb-6 flex flex-wrap items-center justify-between gap-5 ${t.card}`} aria-label="Profile overview"><div className="flex items-center gap-4 min-w-0"><div className={`size-20 rounded-2xl shrink-0 overflow-hidden flex items-center justify-center text-3xl font-bold ${t.active}`}>{profile.profile_pic?<img src={profile.profile_pic} alt={`${fullName} profile`} className="size-full object-cover"/>:fullName.charAt(0)||<UserRound className="size-9"/>}</div><div className="min-w-0"><h2 className={`font-bold text-[1.4em] break-words ${t.heading}`}>{fullName}</h2><p className={`mt-1 text-[0.9em] break-all ${t.subtle}`}>@{isStaff?profile.staff_username:profile.acc_username}</p><p className="mt-2 text-[0.85em]">{isStaff?'Staff ID':'PWD ID'}: {isStaff?profile.staff_id:profile.pwd_id}</p></div></div><span className={`px-3 py-2 rounded-lg font-semibold text-[0.85em] ${t.tile}`}>{status}</span></section>
   {!isStaff&&<ProfileInformationNotice missing={profile.missing_information||[]} themeMode={accessibility.themeMode} onEdit={()=>{setEditing(true);setNotice('');}} disabled={saving||sessionEnded}/>}
   {!isStaff&&<ProfileEmailStatus profile={profile} themeMode={accessibility.themeMode} disabled={editing||saving||sessionEnded} onRefresh={message=>{setNotice(message);setRetry(n=>n+1);notifyPortalRefresh();}}/>}
   {!isStaff&&profile.id_status==='Expiring Soon'&&<p role="status" className={`p-4 rounded-xl mb-6 border ${t.divider} ${t.tile}`}>Your PWD ID {profile.days_to_expiry===0?'expires today':`expires in ${profile.days_to_expiry} day${profile.days_to_expiry===1?'':'s'}`}. Please contact the LGU staff about renewal.</p>}
   {!isStaff&&profile.id_status==='Expired'&&<p role="status" className={`p-4 rounded-xl mb-6 ${t.error}`}>Your PWD ID expired on {displayDate(profile.expired_date)}. Contact the LGU staff about renewal.</p>}
   {!isStaff&&profile.id_status==='Not Set'&&<p className={`text-[0.85em] mb-6 ${t.muted}`}>No valid expiry date is recorded. Ask LGU staff to verify your ID details.</p>}
   {!sessionEnded&&<form onSubmit={save} className="space-y-6">
    <section className={`p-5 sm:p-6 rounded-2xl ${t.card}`}><div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className={`font-bold text-[1.15em] ${t.heading}`}>Profile information</h2><p className={`text-[0.85em] mt-2 ${t.muted}`}>{isStaff?'Update your personal details and PWD declaration. Staff ID, username, status, and staff-since date are managed by the LGU.':'You can update contact number, email, occupation, and picture. Identity, address, PWD, and membership details are managed by LGU staff.'}</p></div>{!editing?<button type="button" onClick={()=>{setEditing(true);setNotice('');setError('');}} className={`${button} ${t.primary}`}><Pencil className="size-4"/>Edit Profile</button>:<div className="flex flex-wrap gap-2"><button type="button" disabled={saving} onClick={cancel} className={`${button} ${t.secondary}`}>Cancel</button><button type="submit" disabled={saving||uploading} className={`${button} ${t.primary}`}><Save className="size-4"/>{saving?'Saving…':'Save Changes'}</button></div>}</div></section>
    <section className={`p-5 sm:p-6 rounded-2xl ${t.card}`} aria-label="Profile picture"><h2 className={`font-bold text-[1.1em] mb-4 ${t.heading}`}>Profile picture</h2><div className="flex flex-wrap items-center gap-5"><div className={`size-28 rounded-2xl shrink-0 overflow-hidden flex items-center justify-center text-4xl font-bold ${t.tile}`}>{details.profile_pic?<img src={details.profile_pic} alt="Profile picture preview" className="size-full object-cover"/>:<UserRound className="size-12" aria-hidden="true"/>}</div><div className="min-w-0 flex-1">{editing?<><label htmlFor={`profile-${kind}-picture`} className={`block font-semibold mb-2 ${t.heading}`}><Camera className="size-4 inline mr-2" aria-hidden="true"/>Choose profile picture</label><input ref={fileRef} id={`profile-${kind}-picture`} type="file" accept="image/png,image/jpeg,image/webp" disabled={saving} onChange={choosePicture} className={`block w-full max-w-full p-3 rounded-lg ${t.input} ${t.focus}`}/><p className={`text-[0.8em] mt-2 ${t.subtle}`}>PNG, JPEG, or WebP. Maximum 5 MB. Save Changes applies the picture.</p>{details.profile_pic&&<button type="button" disabled={saving} onClick={removePicture} className={`mt-3 ${button} ${t.secondary}`}><Trash2 className="size-4"/>Remove picture</button>}</>:<p className={t.muted}>Select Edit Profile to upload, replace, or remove your picture.</p>}{uploading&&<p role="status" className="mt-2">Preparing picture…</p>}</div></div></section>
    {(isStaff?STAFF_GROUPS:USER_GROUPS).map(group=><section key={group.title} aria-label={group.title} className={`p-5 sm:p-6 rounded-2xl ${t.card}`}><h2 className={`font-bold text-[1.1em] mb-5 flex items-center gap-2 ${t.heading}`}>{group.title.includes('account')||group.title.includes('membership')?<CalendarDays className="size-5"/>:<UserRound className="size-5"/>}{group.title}</h2>{isStaff&&group.title==='PWD information'&&<div className="mb-5"><label htmlFor="staff-is-pwd" className={`block font-semibold mb-2 ${t.heading}`}>Are you a PWD?</label>{editing?<select id="staff-is-pwd" disabled={saving} value={details.is_pwd?'yes':'no'} onChange={e=>setDraft(previous=>({...previous,is_pwd:e.target.value==='yes',pwd_id:e.target.value==='yes'?previous.pwd_id||'':null}))} className={`w-full sm:w-64 p-3 rounded-lg ${t.input} ${t.focus}`}><option value="no">No</option><option value="yes">Yes</option></select>:<p>{profile.is_pwd?'Yes':'No'}</p>}</div>}<div className="grid grid-cols-1 sm:grid-cols-2 gap-5">{group.fields.filter(([,key])=>!(isStaff&&key==='pwd_id'&&!details.is_pwd)).map(field)}</div></section>)}
    {editing&&<div className="flex flex-wrap justify-end gap-3"><button type="button" disabled={saving} onClick={cancel} className={`${button} ${t.secondary}`}>Cancel editing</button><button type="submit" disabled={saving||uploading} className={`${button} ${t.primary}`}><Save className="size-4"/>{saving?'Saving…':'Save profile'}</button></div>}
   </form>}
   <AccountPasswordSettings key="account-password-settings" kind={kind} themeMode={accessibility.themeMode} disabled={editing||saving||uploading} onChanged={()=>{setSessionEnded(true);cancel();setNotice('');}}/>
  </>}
 </Layout>;
}

