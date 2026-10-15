const db=require('../config/db');
async function pendingControl(id,connection=db){const [rows]=await connection.execute('SELECT access_status,session_version FROM pending_account_controls WHERE account_id=?',[id]);return rows[0]||{access_status:'Active',session_version:0};}
module.exports={pendingControl};
