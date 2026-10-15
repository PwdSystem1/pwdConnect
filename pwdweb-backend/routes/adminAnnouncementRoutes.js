const express=require('express'),auth=require('../middleware/adminAuth'),c=require('../controllers/announcementOversightController'),posts=require('../controllers/announcementController');
const router=express.Router();router.use(auth);
router.get('/',c.list);router.get('/:id',posts.getManagedAnnouncement);router.patch('/:id/status',c.status);
module.exports=router;
