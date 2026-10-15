const crypto=require('node:crypto');
const {promisify}=require('node:util');
const scrypt=promisify(crypto.scrypt);
async function hashPassword(password){const salt=crypto.randomBytes(16).toString('hex');const key=await scrypt(password,salt,64);return `scrypt:${salt}:${key.toString('hex')}`;}
async function checkPassword(password,hash){if(typeof hash!=='string'||!/^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/.test(hash))return false;const [,salt,encoded]=hash.split(':');const key=await scrypt(password,salt,64);return crypto.timingSafeEqual(key,Buffer.from(encoded,'hex'));}
module.exports={hashPassword,checkPassword};
