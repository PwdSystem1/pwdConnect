const db=require('../config/db');let generation='';
async function refresh(){const [rows]=await db.execute('SELECT generation,maintenance FROM portal_system_reset_state WHERE id=1');if(rows.length!==1)throw Error('Import full-system-reset.sql.');generation=rows[0].generation;return Number(rows[0].maintenance)===1;}
async function initialize(){await refresh();await db.execute('UPDATE portal_system_reset_state SET maintenance=0 WHERE id=1');}
function suffix(){return generation?':reset:'+generation:'';}
async function maintenance(value){await db.execute('UPDATE portal_system_reset_state SET maintenance=? WHERE id=1',[value?1:0]);}
function set(value){generation=value;}
module.exports={refresh,initialize,suffix,maintenance,set};
