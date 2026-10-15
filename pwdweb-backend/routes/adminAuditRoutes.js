const express=require('express'),auth=require('../middleware/adminAuth'),controller=require('../controllers/adminAuditController');
const router=express.Router();router.use(auth);router.get('/',controller.list);module.exports=router;
