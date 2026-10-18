const {timestampUtcSql}=require('../utils/timestampSql');
const {visible}=require('../utils/operationalArchive');
const db = require('../config/db');

// Send Emergency Alert (Kumukuha na ng totoong pangalan mula sa userdata)
const sendEmergencyAlert = async (req, res) => {
  const pwd_id = req.body.pwd_id || req.params.pwd_id;
  const { alert_type, emergency_type, location, message, details } = req.body;

  const finalType = alert_type || emergency_type;
  const finalDetails = message || details || '';
  const finalLocation = location || 'Not specified';

  if (!pwd_id || !finalType) {
    return res.status(400).json({
      success: false,
      message: 'Please provide pwd_id and emergency type.'
    });
  }

  try {
    // 1. Kunin ang pangalan mula sa userdata table gamit ang pwd_id
    const userQuery = `SELECT first_name, middle_name, last_name FROM userdata WHERE pwd_id = ?`;
    const [userRows] = await db.execute(userQuery, [pwd_id]);

    let full_name = 'Unknown User';
    if (userRows && userRows.length > 0) {
      const u = userRows[0];
      full_name = `${u.first_name || ''} ${u.middle_name ? u.middle_name + ' ' : ''}${u.last_name || ''}`.trim();
    }

    // 2. I-save sa emergency_req kasama ang totoong pangalan
    const insertQuery = `
      INSERT INTO emergency_req (emergency_type, location, details, full_name, pwd_id, status, created_at) 
      VALUES (?, ?, ?, ?, ?, 'Broadcasted', NOW())
    `;

    const [result] = await db.execute(insertQuery, [
      finalType, 
      finalLocation, 
      finalDetails, 
      full_name, 
      pwd_id
    ]);

    return res.status(201).json({
      success: true,
      message: 'Emergency alert successfully sent and saved!',
      alertId: result.insertId
    });

  } catch (error) {
    console.error('Emergency alert insert error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while saving emergency alert.'
    });
  }
};

const getEmergencyAlerts = async (req, res) => {
  const { pwd_id } = req.params;

  try {
    const query = `SELECT emergency_req.*,${timestampUtcSql("created_at")} AS created_at FROM emergency_req WHERE pwd_id = ? AND ${visible('emergency','id')} ORDER BY created_at DESC`;
    const [rows] = await db.execute(query, [pwd_id]);

    const formattedAlerts = rows.map((row) => ({
      id: row.id,
      alert_type: row.emergency_type,
      message: row.details,
      location: row.location,
      status: row.status || 'Broadcasted',
      created_at: row.created_at
    }));

    return res.status(200).json({
      success: true,
      alerts: formattedAlerts
    });

  } catch (error) {
    console.error('Fetch emergency alerts error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching emergency alerts.'
    });
  }
};

module.exports = { sendEmergencyAlert, getEmergencyAlerts };