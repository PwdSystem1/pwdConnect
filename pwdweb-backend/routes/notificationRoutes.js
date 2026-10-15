const express=require('express');
const portalAuth=require('../middleware/messagingAuth');
const controller=require('../controllers/notificationController');
const router=express.Router();
router.use(portalAuth);
router.get('/',controller.getNotifications);
router.patch('/read-all',controller.markAllRead);
router.patch('/:id/read',controller.markNotificationRead);
module.exports=router;
