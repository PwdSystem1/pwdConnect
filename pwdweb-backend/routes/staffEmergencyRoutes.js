const portalAuth=require('../middleware/portalAuth');
const express = require('express');
const router = express.Router();
const staff=(req,res,next)=>req.portalAccount.kind==='staff'?next():res.status(403).json({success:false,message:'Staff access required.'});
const staffEmergencyController = require('../controllers/staffEmergencyController');

// Siguraduhing ang mga ito ay mga tunay na function sa staffEmergencyController.js mo
router.get('/emergency-requests',portalAuth,staff, staffEmergencyController.getEmergencyRequests);
router.put('/emergency-requests/:id',portalAuth,staff, staffEmergencyController.updateEmergencyStatus);

router.get('/broadcast-alerts',portalAuth,staff, staffEmergencyController.getBroadcastAlerts);
router.post('/broadcast-alerts',portalAuth,staff, staffEmergencyController.createBroadcastAlert);

module.exports = router;