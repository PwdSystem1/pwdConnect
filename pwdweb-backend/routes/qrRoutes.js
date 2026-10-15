const express=require('express');
const auth=require('../middleware/portalAuth');const c=require('../controllers/qrController');const w=require('../controllers/qrWorkflowController');const limit=require('../utils/accountRateLimit');const router=express.Router();router.use(auth);
const user=(req,res,next)=>req.portalAccount.kind==='user'?next():res.status(403).json({success:false,message:'Member access only.'});
const staff=(req,res,next)=>req.portalAccount.kind==='staff'?next():res.status(403).json({success:false,message:'Active staff access only.'});
router.post('/my',user,c.getOrCreateMyQr);router.post('/my/regenerate',user,c.regenerateMyQr);
router.post('/verify',staff,limit(120),w.lookupQr);router.post('/lookup-id',staff,limit(120),w.lookupId);router.get('/history',staff,w.history);
router.get('/events/:eventId/details',staff,w.details);router.get('/events/:eventId/requests',staff,w.requests);router.post('/events/:eventId/deliveries',staff,limit(120),w.deliver);module.exports=router;
