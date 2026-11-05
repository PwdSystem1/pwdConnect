import {membershipFields} from './membershipFields';
import {CANDELARIA_BARANGAYS,barangayKey} from '../components/candelariaBarangays';
import {DISABILITY_TYPES,BLOOD_TYPES} from './profileOptions';
export default function ProfileFields({profile,setProfile,t,disabled=false}){
 const options={disability:DISABILITY_TYPES,blood_type:BLOOD_TYPES,baranggay:CANDELARIA_BARANGAYS};
 return <fieldset disabled={disabled}><div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">{membershipFields.map(([key,label,max,required,type='text'])=>{
  const fixed=key==='municipality'?'Candelaria':key==='province'?'Quezon':null;
  let value=fixed??profile[key]??'';
  if(key==='baranggay')value=CANDELARIA_BARANGAYS.find(v=>barangayKey(v)===barangayKey(value))||value;
  if(key==='disability')value=({'Visual Disability':'Visual Impairment','Deaf or Hard of Hearing':'Deaf / Hard of Hearing','Physical Disability (Orthopedic)':'Physical Disability'})[value]||value;
  const className=`w-full min-w-0 min-h-12 p-3 rounded-lg ${t.input} ${t.focus} disabled:opacity-80`;
  return <div key={key} className="min-w-0"><label htmlFor={'profile-'+key} className="block font-semibold text-sm mb-2">{label}{required?' *':''}</label>{options[key]?<select id={'profile-'+key} required={required} value={options[key].includes(value)?value:''} onChange={e=>setProfile(p=>({...p,[key]:e.target.value}))} className={className}><option value="">{key==='blood_type'?'Select blood type or Unknown':'Select '+label.toLowerCase()}</option>{options[key].map(v=><option key={v} value={v}>{v}</option>)}</select>:<input id={'profile-'+key} type={type} maxLength={max||undefined} required={required} readOnly={fixed!==null} aria-readonly={fixed!==null} value={value} onChange={e=>setProfile(p=>({...p,[key]:e.target.value}))} className={className}/>}{fixed&&<p className={`mt-1 text-xs ${t.muted}`}>Fixed locality for this application.</p>}</div>;
 })}</div></fieldset>;
}
