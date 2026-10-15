const express=require('express');
const portalAuth=require('../middleware/portalAuth');
const controller=require('../controllers/staffBirthdayController');
const router=express.Router();router.use(portalAuth);
router.use((req,res,next)=>req.portalAccount.kind==='staff'?next():res.status(403).json({success:false,message:'Staff access required.'}));
router.post('/',controller.createRequest);
module.exports=router;
