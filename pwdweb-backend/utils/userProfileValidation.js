const {decodePicture,manilaToday,ageOf}=require('./staffProfileValidation');
function statusFromExpiry(value,today=manilaToday()){
 if(!value||!/^\d{4}-\d{2}-\d{2}$/.test(value))return {id_status:'Not Set',days_to_expiry:null};
 const expiry=new Date(value+'T00:00:00Z');
 if(Number.isNaN(expiry.getTime())||expiry.toISOString().slice(0,10)!==value)return {id_status:'Not Set',days_to_expiry:null};
 const days=Math.round((expiry.getTime()-new Date(today+'T00:00:00Z').getTime())/86400000);
 return {id_status:days<0?'Expired':days<=15?'Expiring Soon':'Active',days_to_expiry:days};
}
function validate(body){
 if(!body||typeof body!=='object'||Array.isArray(body))throw new Error('Invalid profile payload.');
 const allowed=['contact_numb','email','occupation','profile_pic'];
 if(Object.keys(body).some(key=>!allowed.includes(key)))throw new Error('Only contact number, email, occupation, and picture can be edited here. Other details are managed by staff.');
 const result={};
 for(const [key,label,max]of [['contact_numb','Contact number',255],['email','Email',255],['occupation','Occupation',50]]){
  if(typeof body[key]!=='string')throw new Error(`${label} must be text.`);
  result[key]=body[key].trim();if(Array.from(result[key]).length>max)throw new Error(`${label} must be at most ${max} characters.`);
 }
 if(result.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.email))throw new Error('Enter a valid email address.');
 if(Object.hasOwn(body,'profile_pic'))result.picture=decodePicture(body.profile_pic);
 return result;
}
module.exports={statusFromExpiry,validate,ageOf};
