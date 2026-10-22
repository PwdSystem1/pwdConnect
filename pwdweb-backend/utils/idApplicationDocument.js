const {renderIDApplicationPdf}=require('./idApplicationPdf');
function snapshot(app,review,account,scheduledAt){
 if(app.application_kind!=='NewID'||!review?.id_form_json)throw Object.assign(Error('This application has no printable ID form.'),{status:409});
 return {applicationId:app.id,profile:JSON.parse(app.profile_json),idForm:JSON.parse(review.id_form_json),email:account.email,scheduledAt,appointmentAt:review.appointment_at,venue:review.appointment_venue};
}
async function createAttachment(data){return{filename:`PWDConnect-ID-Application-${Number(data.applicationId)}.pdf`,content:await renderIDApplicationPdf(data),contentType:'application/pdf'};}
module.exports={snapshot,createAttachment};
