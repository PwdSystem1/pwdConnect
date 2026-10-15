const express=require('express'),adminAuth=require('../middleware/adminAuth'),applicantAuth=require('../middleware/applicantAuth'),portalAuth=require('../middleware/portalAuth');
const {verifyAdmin}=require('../utils/adminAccessToken'),{verifyApplicant}=require('../utils/applicantToken');
const router=express.Router();
router.post('/',(req,res,next)=>{const token=(req.headers.authorization||'').replace(/^Bearer /,'');try{verifyAdmin(token);return adminAuth(req,res,next);}catch{}try{verifyApplicant(token);return applicantAuth(req,res,next);}catch{}return portalAuth(req,res,next);},(req,res)=>res.json({success:true,message:'Sign-out recorded.'}));
module.exports=router;
