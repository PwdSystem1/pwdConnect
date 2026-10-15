const express=require('express');const c=require('../controllers/adminAccessController');const router=express.Router();router.get('/session',c.session);module.exports=router;
