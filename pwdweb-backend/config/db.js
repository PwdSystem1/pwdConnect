require('dotenv').config({path:require('node:path').join(__dirname,'../.env'),quiet:true});
const mysql=require('mysql2/promise'),fs=require('node:fs'),{pool}=require('../utils/applicationDataRules');
const port=Number(process.env.DB_PORT||3306),limit=Number(process.env.DB_CONNECTION_LIMIT||3);
if(!Number.isInteger(port)||port<1||port>65535||!Number.isInteger(limit)||limit<1||limit>20)throw new Error('Invalid database port or connection limit.');
const tls=process.env.DB_SSL==='true'?{rejectUnauthorized:true,...(process.env.DB_SSL_CA_FILE?{ca:fs.readFileSync(process.env.DB_SSL_CA_FILE,'utf8')}:{})}:undefined;
module.exports=pool(mysql.createPool({host:process.env.DB_HOST||'127.0.0.1',port,user:process.env.DB_USER||'root',password:process.env.DB_PASSWORD||'',database:process.env.DB_NAME||'pwd_connect',waitForConnections:true,connectionLimit:limit,queueLimit:30,...(tls?{ssl:tls}:{})}));
