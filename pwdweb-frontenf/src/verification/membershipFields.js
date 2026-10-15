export const membershipFields=[
 ['first_name','First name',50,true],['middle_name','Middle name',50],['last_name','Last name',50,true],
 ['birthday','Birthday',null,true,'date'],['sex','Sex',40,true],['civil_status','Civil status',50,true],
 ['contact_numb','Contact number',255,true,'tel'],['occupation','Occupation',50],
 ['house_number','House number',30],['street','Street',50],['baranggay','Barangay',50,true],
 ['municipality','Municipality / City',50,true],['province','Province',50,true],
 ['disability','Disability / Disability type',100,true],['blood_type','Blood type (if known)',50],
];
export const emptyProfile=Object.fromEntries(membershipFields.map(([key])=>[key,'']));
export const applicationLabel=value=>({ChangesRequested:'Changes requested',Submitted:'Under review',Approved:'Approved',Rejected:'Rejected',Draft:'Draft'})[value]||'Not submitted';
export function utcDate(value){if(!value)return '—';const parsed=new Date(value.replace(' ','T')+'Z');return Number.isNaN(parsed.getTime())?'—':parsed.toLocaleString('en-PH',{timeZone:'Asia/Manila',dateStyle:'medium',timeStyle:'short'});}
