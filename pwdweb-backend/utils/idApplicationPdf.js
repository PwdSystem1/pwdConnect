const PDFDocument=require('pdfkit');
const sharp=require('sharp');
const WIDTH=612,HEIGHT=936,LEFT=28,RIGHT=584;
const clean=value=>String(value??'').normalize('NFC').replace(/[\u0000-\u001f\u007f]/g,' ').trim();
function utc(value){if(!value)return null;const d=value instanceof Date?value:new Date(/[zZ]$|[+-]\d\d:\d\d$/.test(String(value))?value:String(value).replace(' ','T')+'Z');return Number.isNaN(d.getTime())?null:d;}
function manila(value,time=false){const d=utc(value);return d?d.toLocaleString('en-PH',{timeZone:'Asia/Manila',...(time?{dateStyle:'medium',timeStyle:'short'}:{year:'numeric',month:'2-digit',day:'2-digit'})}):'';}
function birthday(value){const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value||''));return m?`${m[2]}/${m[3]}/${m[1]}`:'';}
async function renderIDApplicationPdf({applicationId,profile={},idForm={},email='',scheduledAt='',appointmentAt='',venue=''}){
 if(!Number.isSafeInteger(Number(applicationId))||Number(applicationId)<1)throw Error('PDF_APPLICATION_ID');
 let photo=null;
 if(idForm.photo){
  const m=/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(idForm.photo);
  if(!m)throw Error('PDF_PHOTO_INVALID');
  const raw=Buffer.from(m[2],'base64');if(raw.length>1048576||raw.toString('base64')!==m[2])throw Error('PDF_PHOTO_INVALID');
  photo=await sharp(raw,{limitInputPixels:20000000,failOn:'error'}).rotate().resize(600,600,{fit:'contain',background:'#ffffff'}).jpeg({quality:90}).toBuffer();
 }
 const doc=new PDFDocument({size:[WIDTH,HEIGHT],margin:0,autoFirstPage:true,bufferPages:true,info:{Title:'PWD ID Application',Author:'PWDConnect',Subject:'Prefilled application for physician assessment'}});
 const chunks=[];const result=new Promise((resolve,reject)=>{doc.on('data',c=>chunks.push(c));doc.on('error',reject);doc.on('end',()=>resolve(Buffer.concat(chunks)));});
 const overflow=[];
 function txt(x,y,value,size=7,bold=false,width=RIGHT-x,height=12){
  const s=clean(value);if(!s)return;doc.font(bold?'Helvetica-Bold':'Helvetica').fontSize(size).fillColor('black').text(s,x,y,{width,height,lineBreak:false,ellipsis:false});
 }
 function rect(x,y,w,h){doc.lineWidth(.55).strokeColor('black').rect(x,y,w,h).stroke();}
 function fit(x,y,w,h,value,label){
  const s=clean(value);if(!s)return;let size=8;doc.font('Helvetica');
  while(size>6&&doc.fontSize(size).heightOfString(s,{width:w,lineGap:0})>h)size-=.25;
  doc.fontSize(size);if(doc.heightOfString(s,{width:w})>h){overflow.push({label,value:s});txt(x,y,'See continuation page',6,false,w,h);return;}
  doc.fillColor('black').text(s,x,y,{width:w,height:h,lineGap:0});
 }
 function cell(x,y,w,h,label,value=''){rect(x,y,w,h);txt(x+4,y+3,label,6.4,true,w-8,10);fit(x+4,y+15,w-8,h-17,value,label);}
 function band(y,label){rect(LEFT,y,556,13);txt(33,y+3,label,6.8,true,546,10);}
 function check(x,y,label,selected=false,size=6.2){rect(x,y+1,6,6);if(selected){doc.moveTo(x+1,y+2).lineTo(x+5,y+6).moveTo(x+1,y+6).lineTo(x+5,y+2).stroke();}txt(x+10,y,label,size,false,RIGHT-x-12,10);}
 txt(28,20,'DEPARTMENT OF HEALTH',15,true);
 txt(28,40,'Philippine Registry for Persons with Disabilities',10,true);
 txt(28,57,'Version 4.0 - Application Form',12,true);
 txt(28,79,`Application #${applicationId} | Physician assessment form`,7,true);
 fit(28,85,556,16,`Appointment: ${manila(appointmentAt,true)} (Manila) | ${clean(venue)}`,'Appointment');
 txt(28,103,'Clinical items 8, 9 and 19: municipal doctor. Office items 20-24: authorized personnel.',6.5);
 let y=115;
 // Keep the portrait square at a physical 1 inch, not a stretched ID photograph.
 rect(LEFT,y,470,23);txt(33,y+4,'1. APPLICATION TYPE',6.6,true,120);check(159,y+9,'NEW APPLICANT',idForm.application_type!=='Renewal');check(326,y+9,'RENEWAL',idForm.application_type==='Renewal');
 rect(498,y,86,94);
 if(photo)doc.image(photo,505,y+4,{fit:[72,72],align:'center',valign:'center'});
 else{rect(505,y+4,72,72);txt(515,y+27,'Place 1 x 1',7,true,60);txt(519,y+39,'Photo Here',7,true,54);}
 txt(503,y+81,photo?'Uploaded photo':'Attach physical photo',5.8,false,78);
 cell(28,y+23,282,26,'2. PERSONS WITH DISABILITY NUMBER','');cell(310,y+23,188,26,'3. STAFF SCHEDULING DATE',manila(scheduledAt));
 rect(28,y+49,470,13);txt(33,y+52,'4. PERSONAL INFORMATION',6.8,true);
 for(const [x,w,label,value]of [[28,141,'LAST NAME',profile.last_name],[169,141,'FIRST NAME',profile.first_name],[310,120,'MIDDLE NAME',profile.middle_name],[430,68,'SUFFIX',idForm.suffix]])cell(x,y+62,w,32,label,value);
 y+=94;
 rect(28,y,300,23);txt(33,y+4,'5. DATE OF BIRTH (mm/dd/yyyy)',6.6,true);txt(207,y+12,birthday(profile.birthday),8);
 rect(328,y,256,23);txt(333,y+4,'6. SEX',6.8,true);check(392,y+11,'MALE',String(profile.sex).toLowerCase()==='male');check(475,y+11,'FEMALE',String(profile.sex).toLowerCase()==='female');y+=23;
 rect(28,y,556,23);txt(33,y+3,'7. CIVIL STATUS',6.7,true);
 for(const [x,label]of [[134,'Single'],[213,'Separated'],[305,'Cohabitation (live-in)'],[445,'Married'],[515,'Widow/er']])check(x,y+12,label,clean(profile.civil_status).toLowerCase()===label.toLowerCase(),6.1);y+=23;
 rect(28,y,300,82);rect(328,y,256,82);txt(33,y+4,'8. TYPE OF DISABILITY - MUNICIPAL DOCTOR',6.5,true);
 for(const [x,labels]of [[34,['Deaf or Hard of Hearing','Intellectual Disability','Learning Disability','Mental Disability','Physical Disability (Orthopedic)']],[181,['Speech and Language Impairment','Visual Disability','Cancer (RA11215)','Rare Disease (RA10747)']]])labels.forEach((s,i)=>check(x,y+20+i*12,s,false,x===181?5.7:6));
 txt(333,y+4,'9. CAUSE OF DISABILITY - MUNICIPAL DOCTOR',6.2,true);
 for(const [x,title,labels]of [[334,'Congenital / Inborn',['ADHD','Cerebral Palsy','Down Syndrome','Others: __________']],[459,'Acquired',['Chronic illness','Cerebral Palsy','Injury','Others: __________']]]){check(x,y+18,title);labels.forEach((s,i)=>check(x+7,y+34+i*11,s));}y+=82;
 band(y,'10. RESIDENCE ADDRESS');y+=13;
 for(const [x,w,label,value]of [[28,141,'HOUSE NO. AND STREET',[profile.house_number,profile.street].filter(Boolean).join(', ')],[169,113,'BARANGAY',profile.baranggay],[282,99,'MUNICIPALITY',profile.municipality],[381,86,'PROVINCE',profile.province],[467,117,'REGION',idForm.region]])cell(x,y,w,33,label,value);y+=33;
 band(y,'11. CONTACT DETAILS');y+=13;
 for(const [x,w,label,value]of [[28,155,'LANDLINE NO.',idForm.landline],[183,173,'MOBILE NO.',profile.contact_numb],[356,228,'EMAIL ADDRESS',email]])cell(x,y,w,32,label,value);y+=32;
 rect(28,y,358,54);txt(33,y+3,'12. EDUCATIONAL ATTAINMENT',6.7,true);
 ['None','Kindergarten','Elementary','Junior High School','Senior High School','College','Vocational','Post Graduate'].forEach((s,i)=>check(35+Math.floor(i/4)*174,y+16+(i%4)*9,s,s===idForm.education));
 rect(28,y+54,179,45);txt(33,y+58,'13. STATUS OF EMPLOYMENT',6.6,true);['Employed','Unemployed','Self-employed'].forEach((s,i)=>check(35,y+72+i*10,s,s===idForm.employment_status));
 rect(207,y+54,179,71);txt(212,y+58,'13b. TYPE OF EMPLOYMENT',6.6,true);['Permanent / Regular','Seasonal','Casual','Emergency'].forEach((s,i)=>check(214,y+73+i*14,s,s===idForm.employment_type));
 rect(28,y+99,179,26);txt(33,y+103,'13a. CATEGORY OF EMPLOYMENT',6.3,true);check(35,y+117,'Government',idForm.employment_category==='Government');check(115,y+117,'Private',idForm.employment_category==='Private');
 rect(386,y,198,125);txt(391,y+3,'14. OCCUPATION',6.7,true);
 const occ=['Managers','Professionals','Technicians and Associate Professionals','Clerical Support Workers','Service and Sales Workers','Skilled Agricultural, Forestry and Fishery Workers','Craft and Related Trade Workers','Plant and Machine Operators and Assemblers','Elementary Occupations','Armed Forces Occupations','Other'];
 occ.forEach((s,i)=>check(393,y+16+i*9,s==='Other'?'Others (see below)':s,s===idForm.occupation_category,s.length>43?5:5.7));fit(393,y+116,185,8,idForm.occupation_other||profile.occupation,'Other occupation');y+=125;
 band(y,'15. ORGANIZATION INFORMATION');y+=13;
 for(const [x,w,label,value]of [[28,156,'ORGANIZATION AFFILIATED',idForm.organization],[184,140,'CONTACT PERSON',idForm.organization_contact],[324,160,'OFFICE ADDRESS',idForm.organization_address],[484,100,'TEL. NOS.',idForm.organization_phone]])cell(x,y,w,31,label,value);y+=31;
 band(y,'16. ID REFERENCE NO.');y+=13;
 ['sss','gsis','pagibig','psn','philhealth'].forEach((key,i)=>cell(28+i*111.2,y,111.2,27,({sss:'SSS NO.',gsis:'GSIS NO.',pagibig:'PAG-IBIG NO.',psn:'PSN NO.',philhealth:'PHILHEALTH NO.'})[key],idForm[key]));y+=27;
 band(y,'17. FAMILY BACKGROUND');y+=13;
 for(const [x,w,label]of [[28,132,''],[160,141,'LAST NAME'],[301,141,'FIRST NAME'],[442,142,'MIDDLE NAME']]){rect(x,y,w,12);txt(x+4,y+3,label,6,true);}y+=12;
 for(const role of ['father','mother','guardian']){rect(28,y,132,16);txt(33,y+5,role.toUpperCase()+"'S NAME",6.4,true);for(const [x,w,key]of [[160,141,'last'],[301,141,'first'],[442,142,'middle']]){rect(x,y,w,16);fit(x+4,y+3,w-8,11,idForm[role]?.[key],role+' '+key);}y+=16;}
 rect(28,y,132,42);txt(33,y+3,'18. ACCOMPLISHED BY',6.4,true);['Applicant','Guardian','Representative'].forEach((s,i)=>check(35,y+15+i*9,s,idForm.accomplished_by===s,6));
 // The online form stores a full representative name; retain it without guessing name parts.
 cell(160,y,424,42,'NAME OF APPLICANT / GUARDIAN / REPRESENTATIVE',idForm.accomplished_by==='Applicant'?[profile.first_name,profile.middle_name,profile.last_name,idForm.suffix].filter(Boolean).join(' '):idForm.accomplisher);y+=42;
 cell(28,y,385,33,'19. NAME OF CERTIFYING PHYSICIAN');cell(413,y,171,33,'LICENSE NO.');y+=33;
 for(const label of ['20. PROCESSING OFFICER','21. APPROVING OFFICER','22. ENCODER']){rect(28,y,556,20);txt(33,y+5,label,6.7,true);doc.moveTo(192,y).lineTo(192,y+20).stroke();y+=20;}
 rect(28,y,556,20);txt(33,y+5,'23. NAME OF REPORTING UNIT (OFFICE / SECTION)',6.5,true);doc.moveTo(300,y).lineTo(300,y+20).stroke();y+=20;
 rect(28,y,556,20);txt(33,y+5,'24. CONTROL NO.',6.7,true);y+=20;
 if(y>893)throw Error('PDF_LAYOUT_OVERFLOW');
 txt(28,903,'Item 3 records Staff scheduling, not final membership approval. Clinical/office findings remain blank.',6.1);
 txt(28,916,`PWDConnect | Application #${applicationId} | Long bond 8.5 x 13 in | Page 1`,6.2);
 if(overflow.length){
  doc.addPage({size:[WIDTH,HEIGHT],margin:28});txt(28,28,`Application #${applicationId} - continuation`,12,true);let yy=60;
  for(const item of overflow){const value=clean(item.value);doc.font('Helvetica').fontSize(9);const h=doc.heightOfString(value,{width:548})+30;if(yy+h>880){doc.addPage({size:[WIDTH,HEIGHT],margin:28});yy=40;}txt(28,yy,item.label,8,true);doc.font('Helvetica').fontSize(9).text(value,28,yy+15,{width:548});yy+=h;}
 }
 doc.end();return result;
}
module.exports={renderIDApplicationPdf,manila};
