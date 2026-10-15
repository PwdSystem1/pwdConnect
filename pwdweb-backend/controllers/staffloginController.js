const { signPortalToken } = require('../utils/portalToken');
const db = require('../config/db');

const staffLogin = async (req, res) => {
  const { staff_username, staff_password } = req.body;

  if (!staff_username || !staff_password) {
    return res.status(400).json({ success: false, message: "Please provide both username and password." });
  }

  try {
    const query = `
      SELECT 
        sl.id,
        sl.staff_username,
        sd.first_name,
        sd.middle_name,
        sd.last_name,
        sd.Staff_id AS staff_id,
        sd.account_status,
        sd.staff_since
      FROM stafflogin sl
      LEFT JOIN staffdata sd ON sl.staff_username = sd.staff_username
      WHERE sl.staff_username = ? AND sl.staff_password = ?
    `;

    const [rows] = await db.execute(query, [staff_username, staff_password]);

    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: "Invalid Staff Username or Password." });
    }

    const staffUser = rows[0];
    if (staffUser.account_status !== 'Active') {
      return res.status(403).json({success:false,message:'Your staff account is inactive or has no staff profile. Please contact the LGU administrator.'});
    }

    return res.status(200).json({
      success: true,
      message: "Staff Login Successful",
      token: signPortalToken("staff", staffUser.staff_username),
      user: {
        id: staffUser.id,
        staff_username: staffUser.staff_username,
        firstName: staffUser.first_name || "Staff",
        lastName: staffUser.last_name || "",
        role: "staff",
        staff_id: staffUser.staff_id,
        account_status: staffUser.account_status,
        staff_since: staffUser.staff_since
      }
    });

  } catch (err) {
    console.error("Staff login error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

module.exports = { staffLogin };