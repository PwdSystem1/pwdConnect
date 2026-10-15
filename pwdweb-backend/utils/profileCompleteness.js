const fields=[['first_name','First name'],['last_name','Last name'],['sex','Sex'],['birthday','Birthday'],['contact_numb','Contact number'],['email','Email'],['occupation','Occupation'],['province','Province'],['municipality','Municipality'],['baranggay','Barangay'],['street','Street/address description'],['disability','Disability'],['blood_type','Blood type (Unknown is accepted)'],['pwd_id','PWD ID'],['civil_status','Civil status'],['expired_date','ID expiry'],['member_since','Member since']];
const editable=new Set(['contact_numb','email','occupation']);
function missingInformation(row){return fields.filter(([key])=>row[key]===null||row[key]===undefined||String(row[key]).trim()==='').map(([key,label])=>({key,label,editable:editable.has(key)}));}
// Middle name, house number and profile photo are optional; absent values must
// not generate a permanent incomplete-profile alert or block services.
module.exports={missingInformation};
