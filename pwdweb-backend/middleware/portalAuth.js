const {control}=require('../utils/accountControl');
const db = require('../config/db');
const { verifyPortalToken } = require('../utils/portalToken');

module.exports = async function portalAuth(req, res, next) {
  let identity;
  try {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) throw new Error('No token.');
    identity = verifyPortalToken(header.slice(7));
  } catch {
    return res.status(401).json({ success: false, message: 'Please log out and sign in again to access this feature.' });
  }
  try {
    const sql = identity.kind === 'staff'
      ? "SELECT sl.staff_username FROM stafflogin sl INNER JOIN staffdata sd ON BINARY sd.staff_username=BINARY sl.staff_username WHERE BINARY sl.staff_username = ? AND sd.account_status='Active' LIMIT 1"
      : `SELECT ul.acc_username FROM userlogin ul LEFT JOIN pending_accounts pa ON pa.username=ul.acc_username WHERE BINARY ul.acc_username=? AND (pa.id IS NULL OR (pa.approval_status='Approved' AND pa.email_verified_at IS NOT NULL AND EXISTS(SELECT 1 FROM membership_applications ma JOIN userdata ud ON ud.id=ma.member_id AND ud.acc_username=pa.username WHERE ma.account_id=pa.id AND ma.status='Approved'))) LIMIT 1`;
    const [rows] = await db.execute(sql, [identity.username]);
    if (!rows.length) return res.status(401).json({ success: false, message: 'Account is inactive or no longer available. Please contact the LGU administrator.' });
    const state=await control(identity.kind,identity.username);
    if(!state||state.managed_status!=='Active'||Number(state.must_change_password)||Number(state.session_version)!==Number(identity.version??0))return res.status(401).json({success:false,message:'Account access changed. Sign in again or contact the office.'});
    req.portalAccount = identity;
    next();
  } catch (error) {
    console.error('Portal authentication database error:', error);
    res.status(500).json({ success: false, message: 'Unable to verify your account.' });
  }
};
