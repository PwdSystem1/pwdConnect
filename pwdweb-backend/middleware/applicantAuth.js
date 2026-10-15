const {pendingControl}=require('../utils/pendingAccountControl');
const db = require('../config/db');
const { verifyApplicant } = require('../utils/applicantToken');
module.exports = async function applicantAuth(req, res, next) {
  let identity;
  try {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) throw Error('Missing token');
    identity = verifyApplicant(header.slice(7));
  } catch {
    return res.status(401).json({ success: false, message: 'Your applicant session expired. Sign in using your username and password.' });
  }
  try {
    const [rows] = await db.execute('SELECT id,username,email,approval_status,profile_revision,DATE_FORMAT(profile_completed_at,"%Y-%m-%d %H:%i:%s") AS profile_completed_at,DATE_FORMAT(created_at,"%Y-%m-%d %H:%i:%s") AS created_at FROM pending_accounts WHERE id=? AND email_verified_at IS NOT NULL', [identity.id]);
    if (rows.length !== 1) return res.status(401).json({ success: false, message: 'Verify your email before accessing the application dashboard.' });
    const access=await pendingControl(identity.id);if(access.access_status!=='Active'||Number(access.session_version)!==Number(identity.version??0))return res.status(401).json({success:false,message:'Account access changed. Sign in again or contact the office.'});
    req.applicant = rows[0];
    next();
  } catch (error) {
    console.error('Applicant authentication:', error.code || error.message);
    return res.status(503).json({ success: false, message: 'Applicant access is unavailable. Check the database migration.' });
  }
};
