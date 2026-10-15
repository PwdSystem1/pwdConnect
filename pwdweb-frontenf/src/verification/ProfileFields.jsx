import {membershipFields} from './membershipFields';
export default function ProfileFields({profile,setProfile,t,disabled=false}){
 return <fieldset disabled={disabled}><div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">{membershipFields.map(([key,label,max,required,type='text'])=><div key={key} className="min-w-0"><label htmlFor={'profile-'+key} className="block font-semibold text-sm mb-2">{label}{required?' *':''}</label><input id={'profile-'+key} type={type} maxLength={max||undefined} required={required} value={profile[key]||''} onChange={event=>setProfile(value=>({...value,[key]:event.target.value}))} className={`w-full min-w-0 min-h-12 p-3 rounded-lg ${t.input} ${t.focus} disabled:opacity-80`}/></div>)}</div></fieldset>;
}
