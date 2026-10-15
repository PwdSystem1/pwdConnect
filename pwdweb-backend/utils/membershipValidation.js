const { manilaToday, ageOf } = require('./staffProfileValidation');
const FIELDS = { first_name:50, middle_name:50, last_name:50, sex:40, contact_numb:255, occupation:50, province:50, municipality:50, baranggay:50, street:50, house_number:30, disability:100, blood_type:50, civil_status:50 };
const REQUIRED = ['first_name','last_name','sex','contact_numb','province','municipality','baranggay','disability','civil_status'];
function problem(message, status=400) { return Object.assign(new Error(message), { status }); }
function date(value, label) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw problem(`${label} must be a valid date.`);
  const parsed = new Date(value + 'T00:00:00Z');
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0,10) !== value || value < '1900-01-01') throw problem(`${label} must be a real date.`);
  return value;
}
function profile(body, complete=false) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw problem('Invalid personal information.');
  if (Object.keys(body).some(key => !Object.hasOwn(FIELDS,key) && key !== 'birthday')) throw problem('Unsupported personal information field.');
  const output = {};
  for (const [key,max] of Object.entries(FIELDS)) {
    const value = body[key] ?? '';
    if (typeof value !== 'string' || Array.from(value.trim()).length > max) throw problem(`${key.replaceAll('_',' ')} must be text with at most ${max} characters.`);
    output[key] = value.trim();
  }
  output.birthday = body.birthday ? date(body.birthday,'Birthday') : '';
  if (output.birthday > manilaToday()) throw problem('Birthday cannot be in the future.');
  if (complete && (!output.birthday || REQUIRED.some(key => !output[key]))) throw problem('Complete all required personal information before submitting.');
  return output;
}
function id(value, label='ID') {
  const result = Number(value);
  if (!Number.isSafeInteger(result) || result < 1) throw problem(`Invalid ${label}.`);
  return result;
}
function revision(value) {
  if (!Number.isSafeInteger(value) || value < 0) throw problem('Invalid application version. Refresh the page.');
  return value;
}
module.exports = { FIELDS, REQUIRED, profile, date, id, revision, problem, manilaToday, ageOf };
