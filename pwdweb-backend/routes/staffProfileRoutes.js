const express=require('express');
const portalAuth=require('../middleware/portalAuth');
const controller=require('../controllers/staffProfileController');
const router=express.Router();
router.use(portalAuth);
router.use((req,res,next)=>{if(req.portalAccount.kind!=='staff')return res.status(403).json({success:false,message:'This profile page is for staff only.'});next();});
router.get('/',controller.getMyProfile);
router.put('/',controller.updateMyProfile);
module.exports=router;
