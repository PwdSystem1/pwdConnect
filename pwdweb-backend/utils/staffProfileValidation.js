const MAX_IMAGE_BYTES=5*1024*1024;
function manilaToday(){return new Date(Date.now()+8*60*60*1000).toISOString().slice(0,10);}
function birthday(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))throw new Error('Enter a valid birthday.');
 const date=new Date(value+'T00:00:00Z');
 if(Number.isNaN(date.getTime())||date.toISOString().slice(0,10)!==value||value< '1900-01-01'||value>manilaToday())throw new Error('Birthday must be a real date from 1900 through today.');
 return value;
}
function ageOf(value,today=manilaToday()){
 if(!value||!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;
 const parsed=new Date(value+'T00:00:00Z');if(Number.isNaN(parsed.getTime())||parsed.toISOString().slice(0,10)!==value||value<'1900-01-01'||value>today)return null;
 const [year,month,day]=value.split('-').map(Number),[nowYear,nowMonth,nowDay]=today.split('-').map(Number);
 return nowYear-year-Number(nowMonth<month||(nowMonth===month&&nowDay<day));
}
function text(value,label,max,required=false){if(typeof value!=='string')throw new Error(`${label} must be text.`);const s=value.trim();if((required&&!s)||Array.from(s).length>max)throw new Error(`${label} ${required?'is required and ':''}must be at most ${max} characters.`);return s;}
function decodePicture(value){
 if(value===null)return {buffer:null,mime:null};
 if(typeof value!=='string'||value.length>4*Math.ceil(MAX_IMAGE_BYTES/3)+100)throw new Error('Choose a PNG, JPEG, or WebP image no larger than 5 MB.');
 const match=/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
 if(!match)throw new Error('Picture must be a PNG, JPEG, or WebP image.');
 const buffer=Buffer.from(match[2],'base64');
 if(!buffer.length||buffer.length>MAX_IMAGE_BYTES||buffer.toString('base64')!==match[2])throw new Error('Picture data is invalid or exceeds 5 MB.');
 let mime=null;
 if(buffer.length>=8&&buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))mime='image/png';
 else if(buffer.length>=3&&buffer[0]===255&&buffer[1]===216&&buffer[2]===255)mime='image/jpeg';
 else if(buffer.length>=12&&buffer.toString('ascii',0,4)==='RIFF'&&buffer.toString('ascii',8,12)==='WEBP')mime='image/webp';
 if(mime!==match[1])throw new Error('The picture content does not match its format.');
 return {buffer,mime};
}
function validate(body){
 if(!body||typeof body!=='object'||Array.isArray(body))throw new Error('Invalid profile payload.');
 const allowed=['first_name','middle_name','last_name','birthday','is_pwd','pwd_id','profile_pic'];
 if(Object.keys(body).some(key=>!allowed.includes(key)))throw new Error('Staff ID, username, account status, staff-since date, and other protected fields cannot be edited here.');
 if(![true,false,0,1].includes(body.is_pwd))throw new Error('Choose whether you are a PWD.');
 const isPwd=Boolean(body.is_pwd),birth=birthday(body.birthday);
 const result={first_name:text(body.first_name,'First name',255,true),middle_name:text(body.middle_name??'','Middle name',255),last_name:text(body.last_name,'Last name',255,true),birthday:birth,age:ageOf(birth),is_pwd:Number(isPwd),pwd_id:isPwd?text(body.pwd_id,'PWD ID number',50,true):null};
 if(Object.hasOwn(body,'profile_pic'))result.picture=decodePicture(body.profile_pic);
 return result;
}
module.exports={MAX_IMAGE_BYTES,manilaToday,ageOf,decodePicture,validate};
