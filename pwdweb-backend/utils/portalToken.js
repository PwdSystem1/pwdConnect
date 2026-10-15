const resetGeneration=require('./resetGeneration');
const crypto = require('node:crypto');

function secret() {
  const value = process.env.PORTAL_TOKEN_SECRET;
  if (!value || value.length < 32) throw new Error('Set PORTAL_TOKEN_SECRET to a random secret of at least 32 characters in backend .env.');
  return value+resetGeneration.suffix();
}

function signPortalToken(kind, username, version=0) {
  const payload = Buffer.from(JSON.stringify({ kind, username, version, exp: Math.floor(Date.now() / 1000) + 8 * 60 * 60 })).toString('base64url');
  const signature = crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function verifyPortalToken(token) {
  if (typeof token !== 'string' || token.length > 2048) throw new Error('Invalid token.');
  const parts = token.split('.');
  if (parts.length !== 2) throw new Error('Invalid token.');
  const expected = crypto.createHmac('sha256', secret()).update(parts[0]).digest();
  const actual = Buffer.from(parts[1], 'base64url');
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) throw new Error('Invalid token.');
  const payload = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
  if (!['user', 'staff'].includes(payload.kind) || typeof payload.username !== 'string' || !payload.username || payload.username.length > 191 || !Number.isFinite(payload.exp) || payload.exp <= Math.floor(Date.now() / 1000)) throw new Error('Expired or invalid token.');
  return payload;
}

module.exports = { signPortalToken, verifyPortalToken };
