const resetGeneration=require('./resetGeneration');
const crypto = require('node:crypto');
function secret() {
  const value = process.env.PORTAL_TOKEN_SECRET;
  if (!value || value.length < 32) throw Error('Set PORTAL_TOKEN_SECRET in backend .env.');
  if(value.version!==undefined&&(!Number.isSafeInteger(value.version)||value.version<0))throw Error('Invalid session version.');
  return value+resetGeneration.suffix();
}
function signApplicant(id,version=0) {
  const payload = Buffer.from(JSON.stringify({ id, version, purpose: 'membership-applicant', exp: Math.floor(Date.now() / 1000) + 7200 })).toString('base64url');
  return payload + '.' + crypto.createHmac('sha256', secret()).update('membership-applicant:' + payload).digest('base64url');
}
function verifyApplicant(token) {
  if (typeof token !== 'string' || token.length > 1024) throw Error('Invalid token');
  const [payload, signature, ...rest] = token.split('.');
  if (!payload || !signature || rest.length) throw Error('Invalid token');
  const expected = crypto.createHmac('sha256', secret()).update('membership-applicant:' + payload).digest();
  const actual = Buffer.from(signature, 'base64url');
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) throw Error('Invalid token');
  const value = JSON.parse(Buffer.from(payload, 'base64url').toString());
  if (value.purpose !== 'membership-applicant' || !Number.isSafeInteger(value.id) || value.id < 1 || !Number.isFinite(value.exp) || value.exp <= Math.floor(Date.now() / 1000)) throw Error('Invalid token');
  return value;
}
module.exports = { signApplicant, verifyApplicant };
