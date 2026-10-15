const express=require('express'),auth=require('../middleware/adminAuth'),c=require('../controllers/systemSettingsController');
const router=express.Router();router.use(auth);
const full=require('../controllers/fullResetController');
router.post('/full-reset/preview',full.preview);router.post('/full-reset/cancel',full.cancel);router.get('/full-reset/backups/:token',full.backup);router.post('/full-reset/apply',full.apply);
router.get('/',c.summary);router.get('/history',c.history);
router.post('/preview',c.preview);router.get('/batches/:id',c.detail);
router.post('/batches/:id/archive',c.archive);router.post('/batches/:id/restore',c.restore);
module.exports=router;
