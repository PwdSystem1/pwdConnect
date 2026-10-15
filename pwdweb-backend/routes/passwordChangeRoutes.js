const express=require('express');
const limit=require('../utils/accountRateLimit');
const forced=require('../controllers/passwordChangeController');
const portalAuth=require('../middleware/portalAuth');
const self=require('../controllers/accountPasswordController');
const selfLimit=require('../middleware/accountPasswordLimit');
const router=express.Router();
// Existing forced temporary-password flow remains at POST /api/password-change.
router.post('/',limit(30),forced.change);
// Authenticated profile settings for verified members and staff only.
router.post('/self',portalAuth,selfLimit,self.change);
module.exports=router;
