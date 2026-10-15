const express=require('express'),adminAuth=require('../middleware/adminAuth'),controller=require('../controllers/adminReportController');
const router=express.Router();
router.use(adminAuth);
router.get('/',controller.getReport);
router.get('/members',controller.getMembers);
router.get('/activity',controller.getActivity);
router.get('/export.csv',controller.exportCsv);
module.exports=router;
