const express=require('express'),{synthesize}=require('../controllers/speechController');
const router=express.Router();
router.post('/synthesize',express.json({limit:'16kb'}),synthesize);
module.exports=router;
