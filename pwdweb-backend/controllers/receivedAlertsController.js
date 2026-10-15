import archive from '../utils/operationalArchive.js';
const {visible}=archive;
import db from '../config/db.js';

// GET /api/received-alerts - Kunin ang received alerts at ang count ng sent emergency alerts
const getReceivedAlerts = async (req, res) => {
  try {
    // 1. Kunin ang received alerts
    const receivedQuery = `SELECT * FROM received_alerts WHERE ${visible('broadcast','id')} ORDER BY id DESC`;
    const [receivedRows] = await db.execute(receivedQuery);

    const formattedReceived = receivedRows.map((row) => ({
      id: row.id,
      title: row.title,
      category: row.category || 'Announcement',
      message: row.message || row.details,
      sender: row.sender || 'LGU Staff',
      date: row.created_at ? new Date(row.created_at).toLocaleString() : 'Just now',
      priority: row.priority || 'GENERAL',
      type: 'Received'
    }));

    // 2. Kunin ang sent emergency alerts (mula sa emergency_req) pati ang count nito
    let sentRows=[];
    if(req.portalAccount.kind==='user'){
      const [members]=await db.execute('SELECT pwd_id FROM userdata WHERE BINARY acc_username=? LIMIT 1',[req.portalAccount.username]);
      if(members.length)[sentRows]=await db.execute(`SELECT * FROM emergency_req WHERE pwd_id=? AND ${visible('emergency','id')} ORDER BY id DESC`,[members[0].pwd_id]);
    }


    const formattedSent = sentRows.map((row) => ({
      id: row.id,
      title: row.emergency_type,
      category: row.emergency_type || 'Emergency',
      message: row.details || row.message,
      sender: row.full_name || 'PWD User',
      date: row.created_at ? new Date(row.created_at).toLocaleString() : 'Just now',
      priority: 'HIGH',
      status: row.status,
      type: 'Sent'
    }));

    return res.status(200).json({
      success: true,
      alerts: formattedReceived,
      sentAlerts: formattedSent,        // <--- Buong listahan ng sent alerts
      sentCount: formattedSent.length   // <--- Eksaktong count ng sent alerts
    });

  } catch (error) {
    console.error('Fetch alerts history error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching alerts history.'
    });
  }
};

export { getReceivedAlerts };