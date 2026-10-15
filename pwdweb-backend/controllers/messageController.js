const db = require('../config/db');
const crypto = require('node:crypto');

const CONTACTS_SQL = `
  SELECT 'user' AS kind, ul.acc_username AS username,
    COALESCE(NULLIF(TRIM(CONCAT_WS(' ', ud.first_name, ud.last_name)), ''), ul.acc_username) AS name
  FROM userlogin ul INNER JOIN userdata ud ON ul.acc_username = ud.acc_username
  UNION
  SELECT 'staff' AS kind, sl.staff_username AS username,
    COALESCE(NULLIF(TRIM(CONCAT_WS(' ', sd.first_name, sd.last_name)), ''), sl.staff_username) AS name
  FROM stafflogin sl INNER JOIN staffdata sd ON BINARY sl.staff_username = BINARY sd.staff_username WHERE sd.account_status='Active'
  UNION SELECT 'admin' AS kind,username,username AS name FROM adminlogin WHERE account_status='Active'`;

function id(value) {
  if (!/^[1-9]\d*$/.test(String(value))) return null;
  const result = Number(value);
  return Number.isSafeInteger(result) && result <= 4294967295 ? result : null;
}
function failure(res, error) {
  console.error('Message API error:', error);
  return res.status(500).json({ success: false, message: 'Unable to process messages. Check that the messaging SQL tables have been imported.' });
}
async function membership(connection, conversationId, account) {
  const [rows] = await connection.execute('SELECT conversation_id FROM portal_participants WHERE conversation_id = ? AND account_kind = ? AND username = ?', [conversationId, account.kind, account.username]);
  return rows.length > 0;
}

exports.getContacts = async (req, res) => {
  const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 100) : '';
  try {
    const [rows] = await db.execute(`SELECT DISTINCT kind, username, name FROM (${CONTACTS_SQL}) accounts
      WHERE NOT (kind = ? AND BINARY username = ?) AND (?<>'user' OR kind<>'admin') AND (? = '' OR LOCATE(?, name) > 0 OR LOCATE(?, username) > 0)
      ORDER BY kind DESC, name LIMIT 100`, [req.portalAccount.kind, req.portalAccount.username, req.portalAccount.kind, search, search, search]);
    res.json({ success: true, contacts: rows });
  } catch (error) { failure(res, error); }
};

exports.getConversations = async (req, res) => {
  const account = req.portalAccount;
  try {
    const [rows] = await db.execute(`SELECT c.id, peer.account_kind AS peer_kind, peer.username AS peer_username,
      COALESCE(a.name, peer.username) AS peer_name,
      (SELECT body FROM portal_messages WHERE conversation_id=c.id ORDER BY id DESC LIMIT 1) AS last_message,
      (SELECT created_at FROM portal_messages WHERE conversation_id=c.id ORDER BY id DESC LIMIT 1) AS last_message_at,
      (SELECT COUNT(*) FROM portal_messages m WHERE m.conversation_id=c.id AND m.id > me.last_read_message_id
        AND NOT (m.sender_kind=me.account_kind AND m.sender_username=me.username)) AS unread_count
      FROM portal_conversations c
      JOIN portal_participants me ON me.conversation_id=c.id AND me.account_kind=? AND me.username=?
      JOIN portal_participants peer ON peer.conversation_id=c.id AND NOT (peer.account_kind=me.account_kind AND peer.username=me.username)
      LEFT JOIN (${CONTACTS_SQL}) a ON a.kind=peer.account_kind AND BINARY a.username=peer.username
      ORDER BY COALESCE(last_message_at,c.created_at) DESC,c.id DESC`, [account.kind, account.username]);
    res.json({ success: true, conversations: rows, unreadCount: rows.reduce((sum, row) => sum + Number(row.unread_count), 0) });
  } catch (error) { failure(res, error); }
};

exports.createConversation = async (req, res) => {
  const account = req.portalAccount;
  const { recipient_kind: kind, recipient_username: username } = req.body || {};
  if (!['user','staff','admin'].includes(kind) || typeof username !== 'string' || !username || username.length > 191 || (kind === account.kind && username === account.username)) return res.status(400).json({ success: false, message: 'Choose another available account.' });
  if(account.kind==='user'&&kind==='admin')return res.status(403).json({success:false,message:'Only staff can message administrators.'});
  let connection;
  try {
    const [contacts] = await db.execute(`SELECT kind, username, name FROM (${CONTACTS_SQL}) a WHERE kind=? AND BINARY username=? LIMIT 1`, [kind, username]);
    if (!contacts.length) return res.status(404).json({ success: false, message: 'Recipient not found.' });
    const participants = [[account.kind, account.username], [kind, username]].sort((a,b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
    const directKey = crypto.createHash('sha256').update(JSON.stringify(participants)).digest('hex');
    connection = await db.getConnection();
    await connection.beginTransaction();
    const [result] = await connection.execute('INSERT INTO portal_conversations (direct_key) VALUES (?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)', [directKey]);
    for (const participant of participants) {
      await connection.execute('INSERT IGNORE INTO portal_participants (conversation_id,account_kind,username) VALUES (?,?,?)', [result.insertId, ...participant]);
    }
    await connection.commit();
    res.status(201).json({ success: true, conversation: { id: result.insertId, peer_kind: kind, peer_username: username, peer_name: contacts[0].name, unread_count: 0 } });
  } catch (error) {
    if (connection) await connection.rollback();
    failure(res, error);
  } finally { connection?.release(); }
};

exports.getMessages = async (req, res) => {
  const conversationId = id(req.params.id);
  const before = req.query.before ? id(req.query.before) : null;
  if (!conversationId || (req.query.before && !before)) return res.status(400).json({ success: false, message: 'Invalid conversation or cursor.' });
  try {
    if (!await membership(db, conversationId, req.portalAccount)) return res.status(404).json({ success: false, message: 'Conversation not found.' });
    const [rows] = await db.execute(`SELECT id, conversation_id, sender_kind, sender_username, body, created_at
      FROM portal_messages WHERE conversation_id=? ${before ? 'AND id < ?' : ''} ORDER BY id DESC LIMIT 51`, before ? [conversationId,before] : [conversationId]);
    const hasMore = rows.length > 50;
    res.json({ success: true, messages: rows.slice(0,50).reverse(), hasMore });
  } catch (error) { failure(res, error); }
};

exports.sendMessage = async (req, res) => {
  const conversationId = id(req.params.id);
  const body = req.body?.body;
  if (!conversationId || typeof body !== 'string' || !body.trim() || body.trim().length > 2000) return res.status(400).json({ success: false, message: 'Enter a message of 1–2,000 characters.' });
  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();
    const account = req.portalAccount;
    if (!await membership(connection, conversationId, account)) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Conversation not found.' });
    }
    if(account.kind==='user'){const [admins]=await connection.execute("SELECT username FROM portal_participants WHERE conversation_id=? AND account_kind='admin' LIMIT 1",[conversationId]);if(admins.length){await connection.rollback();return res.status(403).json({success:false,message:'Only staff can reply to administrators. This conversation is read-only for PWD users.'});}}
    const [result] = await connection.execute('INSERT INTO portal_messages (conversation_id,sender_kind,sender_username,body) VALUES (?,?,?,?)', [conversationId,account.kind,account.username,body.trim()]);
    await connection.execute(`INSERT INTO portal_notifications (recipient_kind,recipient_username,notification_type,entity_key,title,body,target_path)
      SELECT account_kind,username,'message',?, ?, ?, CONCAT(CASE account_kind WHEN 'admin' THEN '/admin-messages' WHEN 'staff' THEN '/staff-messages' ELSE '/messages' END,'?conversation=',conversation_id)
      FROM portal_participants WHERE conversation_id=? AND NOT (account_kind=? AND username=?)`,
      [`message:${result.insertId}`,`New message from ${account.username}`,body.trim().slice(0,1000),conversationId,account.kind,account.username]);
    const [rows] = await connection.execute('SELECT id,conversation_id,sender_kind,sender_username,body,created_at FROM portal_messages WHERE id=?', [result.insertId]);
    await connection.commit();
    res.status(201).json({ success: true, message: rows[0] });
  } catch (error) {
    if (connection) await connection.rollback();
    failure(res,error);
  } finally { connection?.release(); }
};

exports.markConversationRead = async (req, res) => {
  const conversationId = id(req.params.id);
  const messageId = id(req.body?.message_id);
  if (!conversationId || !messageId) return res.status(400).json({ success: false, message: 'Invalid read receipt.' });
  try {
    if (!await membership(db,conversationId,req.portalAccount)) return res.status(404).json({ success: false, message: 'Conversation not found.' });
    const [rows] = await db.execute('SELECT id FROM portal_messages WHERE conversation_id=? AND id=?', [conversationId,messageId]);
    if (!rows.length) return res.status(400).json({ success: false, message: 'Message does not belong to this conversation.' });
    const account=req.portalAccount;
    await db.execute('UPDATE portal_participants SET last_read_message_id=GREATEST(last_read_message_id,?) WHERE conversation_id=? AND account_kind=? AND username=?', [messageId,conversationId,account.kind,account.username]);
    await db.execute(`UPDATE portal_notifications SET read_at=COALESCE(read_at,NOW()) WHERE recipient_kind=? AND recipient_username=? AND notification_type='message' AND target_path=? AND CAST(SUBSTRING_INDEX(entity_key,':',-1) AS UNSIGNED) <= ?`, [account.kind,account.username,`${account.kind==='admin'?'/admin-messages':account.kind==='staff'?'/staff-messages':'/messages'}?conversation=${conversationId}`,messageId]);
    res.json({ success: true });
  } catch (error) { failure(res,error); }
};
