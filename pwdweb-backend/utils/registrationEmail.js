const nodemailer=require('./emailTransport');
function emailSettings(){
 const provider=process.env.EMAIL_PROVIDER||'smtp';
 if(provider==='brevo'){
  const {BREVO_API_KEY,MAIL_FROM,FRONTEND_URL}=process.env;
  if(!BREVO_API_KEY||!MAIL_FROM||!FRONTEND_URL)throw Error('EMAIL_CONFIG');
  const url=new URL(FRONTEND_URL);
  if(!['http:','https:'].includes(url.protocol))throw Error('EMAIL_CONFIG');
  return{base:url.origin,from:MAIL_FROM,options:{provider:'brevo'}};
 }
 if(provider!=='smtp')throw Error('EMAIL_CONFIG');const {SMTP_HOST,SMTP_USER,SMTP_PASS,MAIL_FROM,FRONTEND_URL}=process.env;const port=Number(process.env.SMTP_PORT||587);if(!SMTP_HOST||!SMTP_USER||!SMTP_PASS||!MAIL_FROM||!FRONTEND_URL||!Number.isInteger(port)||port<1||port>65535)throw Error('EMAIL_CONFIG');const url=new URL(FRONTEND_URL);if(!['http:','https:'].includes(url.protocol))throw Error('EMAIL_CONFIG');return{base:url.origin,from:MAIL_FROM,options:{host:SMTP_HOST,port,secure:port===465,requireTLS:port!==465,auth:{user:SMTP_USER,pass:SMTP_PASS},connectionTimeout:10000,socketTimeout:15000}};}
async function sendVerification(email,token){const settings=emailSettings();const link=settings.base+'/verify-email#token='+token;const transport=nodemailer.createTransport(settings.options);const info=await transport.sendMail({from:settings.from,to:email,subject:'Verify your PWDConnect email',text:`Verify your email for your PWDConnect account:\n${link}\n\nThis link expires in one hour. Email verification does not approve PWD membership. If you did not request this, ignore this email.`});if(!info.accepted?.length)throw Error('EMAIL_SEND');}
module.exports={emailSettings,sendVerification};
