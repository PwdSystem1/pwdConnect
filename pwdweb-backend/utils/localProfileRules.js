const {problem}=require('./membershipValidation');
const BARANGAYS=["Bukal Norte", "Bukal Sur", "Buenavista East", "Buenavista West", "Kinatihan I", "Kinatihan II", "Malabanban Norte", "Malabanban Sur", "Mangilag Norte", "Mangilag Sur", "Masalukot I", "Masalukot II", "Masalukot III", "Masalukot IV", "Masalukot V", "Masin Norte", "Masin Sur", "Mayabobo", "Pahinga Norte", "Pahinga Sur", "Poblacion", "San Andres", "San Isidro", "Santa Catalina Norte", "Santa Catalina Sur"],DISABILITIES=["Physical Disability", "Visual Impairment", "Deaf / Hard of Hearing", "Speech and Language Impairment", "Psychosocial Disability", "Intellectual Disability", "Learning Disability", "Mental Disability", "Chronic Illness", "Cancer", "Rare Disease", "Other"],BLOOD_TYPES=["Unknown", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
function key(value){return String(value||'').normalize('NFKC').trim().toLowerCase().replace(/^(?:barangay|brgy\.?)\s+/,'').replace(/^sta\.?\s+catalina/,'santa catalina').replace(/\s+/g,' ').replace(/^(masalukot|kinatihan) ([1-5])$/,(s,n,d)=>n==='kinatihan'&&Number(d)>2?s:n+' '+['','i','ii','iii','iv','v'][d]);}
function barangay(value){const result=BARANGAYS.find(v=>key(v)===key(value));if(!result)throw problem('Choose one of the 25 Candelaria barangays.');return result;}
function applicantProfile(profile){
 const p={...profile};
 if(String(p.municipality).trim().toLowerCase()!=='candelaria'||String(p.province).trim().toLowerCase()!=='quezon')throw problem('Applicant profiles must use Candelaria, Quezon.');
 p.municipality='Candelaria';p.province='Quezon';p.baranggay=barangay(p.baranggay);
 const aliases={'visual disability':'Visual Impairment','deaf or hard of hearing':'Deaf / Hard of Hearing','physical disability (orthopedic)':'Physical Disability'};
 p.disability=aliases[String(p.disability).trim().toLowerCase()]||DISABILITIES.find(v=>v.toLowerCase()===String(p.disability).trim().toLowerCase());
 if(!p.disability)throw problem('Choose a valid disability type.');
 const b=String(p.blood_type||'Unknown').trim();p.blood_type=BLOOD_TYPES.find(v=>v.toLowerCase()===b.toLowerCase());
 if(!p.blood_type)throw problem('Choose a valid blood type, or Unknown.');
 return p;
}
module.exports={BARANGAYS,DISABILITIES,BLOOD_TYPES,barangay,key,applicantProfile};
