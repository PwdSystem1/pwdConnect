// Nodemailer-compatible transport: HTTPS Brevo in production, SMTP locally.
function failure(code){return Object.assign(new Error(code),{code});}
function address(value){
 if(typeof value!=='string'||/[\r\n]/.test(value))throw failure('EMAIL_ADDRESS');
 const match=value.trim().match(/^(.*?)\s*<([^<>]+)>$/);
 const email=(match?match[2]:value).trim();
 if(!/^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(email))throw failure('EMAIL_ADDRESS');
 return {email,...(match&&match[1].trim()?{name:match[1].trim().replace(/^"|"$/g,'')}:{})};
}
function createTransport(options){
 if(options?.provider!=='brevo')return require('nodemailer').createTransport(options);
 return {close(){},async sendMail(mail){
  const key=process.env.BREVO_API_KEY;
  if(!key)throw failure('EMAIL_CONFIG');
  const sender=address(mail.from),recipient=address(mail.to);
  if(!sender.name)sender.name=process.env.MAIL_FROM_NAME||'PWDConnect';
  if(typeof mail.subject!=='string'||/[\r\n]/.test(mail.subject)||typeof mail.text!=='string')throw failure('EMAIL_CONTENT');
  const escape=text=>text.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const body={sender,to:[recipient],subject:mail.subject,textContent:mail.text,htmlContent:'<pre style="white-space:pre-wrap;font-family:Arial,sans-serif">'+escape(mail.text)+'</pre>'};
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
  try{
   const response=await fetch('https://api.brevo.com/v3/smtp/email',{method:'POST',headers:{'api-key':key,'Content-Type':'application/json',accept:'application/json'},body:JSON.stringify(body),signal:controller.signal});
   if(!response.ok){await response.body?.cancel();throw failure(response.status===429?'BREVO_RATE_LIMIT':response.status===401||response.status===403?'BREVO_AUTH':'BREVO_HTTP_'+response.status);}
   const result=await response.json();
   if(!result.messageId)throw failure('BREVO_INVALID_RESPONSE');
   // Accepted means queued by provider, not delivered to recipient inbox.
   return{accepted:[recipient.email],rejected:[],messageId:result.messageId};
  }catch(e){if(e.name==='AbortError')throw failure('BREVO_TIMEOUT');if(e.code?.startsWith('BREVO_'))throw e;throw failure('BREVO_UNAVAILABLE');}
  finally{clearTimeout(timer);}
 }};
}
module.exports={createTransport};
