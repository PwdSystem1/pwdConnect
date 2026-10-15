const express=require('express');const auth=require('../middleware/portalAuth');const c=require('../controllers/staffReqController');const router=express.Router();const staff=(req,res,next)=>req.portalAccount.kind==='staff'?next():res.status(403).json({success:false,message:'Active staff access only.'});
// Protect individual routes: a global router.use(auth/staff) here would intercept the user POST route.
router.get('/api/service-requests',auth,staff,c.getAllServiceRequests);router.put('/api/service-requests/:id',auth,staff,c.updateServiceRequestStatus);module.exports=router;
