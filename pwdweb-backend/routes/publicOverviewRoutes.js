const express=require('express'),controller=require('../controllers/publicOverviewController');
const router=express.Router();
router.get('/overview',controller.overview);
module.exports=router;
