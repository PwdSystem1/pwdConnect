const {visible,assertVisible}=require('../utils/operationalArchive');
const db = require("../config/db");

// Matches announcements(id, pic MEDIUMBLOB NOT NULL, title VARCHAR(255), content VARCHAR(555)).
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function imageMime(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) return null;
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return "image/png";
  if (buffer.length >= 3 && buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255) return "image/jpeg";
  if (buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return null;
}

function formatAnnouncement(row) {
  const mime = imageMime(row.pic);
  return {
    id: row.id,
    status: row.status||'Published',
    published_at: row.published_at||null,
    title: row.title,
    content: row.content,
    pic: mime ? `data:${mime};base64,${row.pic.toString("base64")}` : null,
  };
}

function parseId(value) {
  if (!/^[1-9]\d*$/.test(String(value))) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id <= 2147483647 ? id : null;
}

function validateText(body) {
  if (!body || typeof body.title !== "string" || typeof body.content !== "string") return "Title and content must be text.";
  if (!body.title.trim() || !body.content.trim()) return "Please provide both title and content.";
  if (body.title.trim().length > 255) return "Title must not exceed 255 characters.";
  if (body.content.trim().length > 555) return "Content must not exceed 555 characters.";
  return null;
}

function decodePicture(value) {
  if (typeof value !== "string" || value.length > 4 * Math.ceil(MAX_IMAGE_BYTES / 3) + 100) throw new Error("Picture must be PNG, JPEG, or WebP, at most 5 MB.");
  const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match) throw new Error("Please upload a PNG, JPEG, or WebP picture.");
  const buffer = Buffer.from(match[2], "base64");
  if (!buffer.length || buffer.length > MAX_IMAGE_BYTES) throw new Error("Picture must not exceed 5 MB.");
  if (buffer.toString("base64") !== match[2] || imageMime(buffer) !== match[1]) throw new Error("The picture format is invalid.");
  return buffer;
}

function fail(res, error) {
  console.error("Announcement error:", error.code || "unavailable");
  return res.status(error.status||500).json({ success: false, message: error.status?error.message:"Unable to process announcements. Please try again." });
}

const SELECT="SELECT a.id,a.pic,a.title,a.content,COALESCE(m.status,'Published') AS status,DATE_FORMAT(m.published_at,'%Y-%m-%d %H:%i:%s') AS published_at FROM announcements a LEFT JOIN announcement_metadata m ON m.announcement_id=a.id";
const getAnnouncements=async(req,res)=>{try{const [rows]=await db.execute(SELECT+` WHERE COALESCE(m.status,'Published')='Published' AND ${visible('announcement','a.id')} ORDER BY a.id DESC`);return res.json({success:true,announcements:rows.map(formatAnnouncement)});}catch(e){return fail(res,e);}};
const getManagedAnnouncements=async(req,res)=>{try{const [rows]=await db.execute(SELECT+` WHERE ${visible('announcement','a.id')} ORDER BY a.id DESC`);return res.json({success:true,announcements:rows.map(formatAnnouncement)});}catch(e){return fail(res,e);}};
async function detail(req,res,managed){const id=parseId(req.params.id);if(id===null)return res.status(400).json({success:false,message:'Invalid announcement ID.'});try{const [rows]=await db.execute(SELECT+` WHERE a.id=? AND ${visible('announcement','a.id')}`+(managed?'':" AND COALESCE(m.status,'Published')='Published'"),[id]);if(!rows.length)return res.status(404).json({success:false,message:'Announcement unavailable.'});return res.json({success:true,announcement:formatAnnouncement(rows[0])});}catch(e){return fail(res,e);}}
const getAnnouncementById=(req,res)=>detail(req,res,false);
const getManagedAnnouncement=(req,res)=>detail(req,res,true);
const createAnnouncement = async (req, res) => {
  const error = validateText(req.body);
  if (error) return res.status(400).json({ success: false, message: error });
  let pic;
  try { pic = decodePicture(req.body.pic); }
  catch (error) { return res.status(400).json({ success: false, message: error.message }); }
  const title = req.body.title.trim();
  const content = req.body.content.trim();
  let c;try{c=await db.getConnection();await c.beginTransaction();const [result]=await c.execute('INSERT INTO announcements(pic,title,content) VALUES(?,?,?)',[pic,title,content]);await c.execute("INSERT INTO announcement_metadata(announcement_id,author_username,status,created_at,published_at,updated_at) VALUES(?,?,'Published',UTC_TIMESTAMP(),UTC_TIMESTAMP(),UTC_TIMESTAMP())",[result.insertId,req.portalAccount.username]);await c.commit();return res.status(201).json({success:true,message:'Announcement created successfully.',announcement:formatAnnouncement({id:result.insertId,pic,title,content,status:'Published'})});}catch(e){if(c)try{await c.rollback();}catch{}return fail(res,e);}finally{c?.release();}
};

const updateAnnouncement = async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return res.status(400).json({ success: false, message: "Invalid announcement ID." });
  const error = validateText(req.body);
  if (error) return res.status(400).json({ success: false, message: error });
  const replacingPicture = Object.prototype.hasOwnProperty.call(req.body, "pic");
  let pic;
  if (replacingPicture) {
    try { pic = decodePicture(req.body.pic); }
    catch (error) { return res.status(400).json({ success: false, message: error.message }); }
  }
  const title = req.body.title.trim();
  const content = req.body.content.trim();
  let c;try{c=await db.getConnection();await c.beginTransaction();const [exists]=await c.execute('SELECT id FROM announcements WHERE id=? FOR UPDATE',[id]);if(!exists.length){await c.rollback();return res.status(404).json({success:false,message:'Announcement not found.'});}await assertVisible(c,'announcement',id);if(replacingPicture)await c.execute('UPDATE announcements SET pic=?,title=?,content=? WHERE id=?',[pic,title,content,id]);else await c.execute('UPDATE announcements SET title=?,content=? WHERE id=?',[title,content,id]);await c.execute("INSERT INTO announcement_metadata(announcement_id,status,updated_at) VALUES(?,'Published',UTC_TIMESTAMP()) ON DUPLICATE KEY UPDATE updated_at=UTC_TIMESTAMP()",[id]);const [rows]=await c.execute(SELECT+' WHERE a.id=?',[id]);await c.commit();return res.json({success:true,message:'Announcement updated successfully.',announcement:formatAnnouncement(rows[0])});}catch(e){if(c)try{await c.rollback();}catch{}return fail(res,e);}finally{c?.release();}
};

const deleteAnnouncement = async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return res.status(400).json({ success: false, message: "Invalid announcement ID." });
  let c;try{c=await db.getConnection();await c.beginTransaction();const [rows]=await c.execute('SELECT id FROM announcements WHERE id=? FOR UPDATE',[id]);if(!rows.length){await c.rollback();return res.status(404).json({success:false,message:'Announcement not found.'});}await assertVisible(c,'announcement',id);await c.execute('DELETE FROM announcement_views WHERE announcement_id=?',[id]);await c.execute('DELETE FROM announcement_metadata WHERE announcement_id=?',[id]);await c.execute('DELETE FROM announcements WHERE id=?',[id]);await c.execute("DELETE FROM portal_notifications WHERE recipient_kind='user' AND notification_type='announcement' AND entity_key LIKE ?",['announcement:'+id+':%']);await c.commit();return res.json({success:true,message:'Announcement deleted successfully.'});}catch(e){if(c)try{await c.rollback();}catch{}return fail(res,e);}finally{c?.release();}
};

module.exports = { getManagedAnnouncements,getManagedAnnouncement,getAnnouncements, getAnnouncementById, createAnnouncement, updateAnnouncement, deleteAnnouncement };

