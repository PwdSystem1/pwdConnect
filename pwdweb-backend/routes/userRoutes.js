const express=require('express');
const portalAuth=require('../middleware/portalAuth');
const {getUserProfile,updateUserProfile}=require('../controllers/userController');
const router=express.Router();
router.use(portalAuth);
// /me must come before the dynamic username route.
router.get('/profile/me',(req,res,next)=>req.portalAccount.kind==='user'?next():res.status(403).json({success:false,message:'This is the PWD user profile.'}),getUserProfile);
router.put('/profile/me',updateUserProfile);
// Existing QR/profile readers keep this endpoint. Members can access only themselves.
router.get('/profile/:acc_username',getUserProfile);
router.put('/profile/:acc_username',updateUserProfile);
module.exports=router;
