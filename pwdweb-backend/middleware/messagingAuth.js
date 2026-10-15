const {verifyAdmin}=require('../utils/adminAccessToken');const adminAuth=require('./adminAuth');const portalAuth=require('./portalAuth');
module.exports=function messagingAuth(req,res,next){const token=(req.headers.authorization||'').replace(/^Bearer /,'');try{verifyAdmin(token);}catch{return portalAuth(req,res,next);}return adminAuth(req,res,next);};
