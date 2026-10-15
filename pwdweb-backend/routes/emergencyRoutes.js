import portalAuth from '../middleware/portalAuth.js';
import db from '../config/db.js';
import express from 'express';
import { sendEmergencyAlert, getEmergencyAlerts } from '../controllers/emergencyController.js';

const router = express.Router();
router.use(portalAuth);
router.use(async(req,res,next)=>{if(req.portalAccount.kind!=='user')return res.status(403).json({success:false,message:'Member access required.'});try{const [rows]=await db.execute('SELECT pwd_id FROM userdata WHERE BINARY acc_username=? LIMIT 1',[req.portalAccount.username]);if(!rows.length||!rows[0].pwd_id)return res.status(403).json({success:false,message:'Member ID unavailable.'});req.ownedPwdId=rows[0].pwd_id;next();}catch{return res.status(503).json({success:false,message:'Unable to verify emergency account.'});}});

router.post('/',(req,res,next)=>{if(req.body?.pwd_id&&req.body.pwd_id!==req.ownedPwdId)return res.status(403).json({success:false,message:'Use your own PWD ID.'});req.body={...req.body,pwd_id:req.ownedPwdId};next();},sendEmergencyAlert);
router.get('/:pwd_id',(req,res,next)=>req.params.pwd_id===req.ownedPwdId?next():res.status(403).json({success:false,message:'Use your own PWD ID.'}),getEmergencyAlerts);

export default router;