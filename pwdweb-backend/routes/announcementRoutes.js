const express=require('express'),portalAuth=require('../middleware/portalAuth'),c=require('../controllers/announcementController'),oversight=require('../controllers/announcementOversightController');
const router=express.Router(),staff=(req,res,next)=>req.portalAccount.kind==='staff'?next():res.status(403).json({success:false,message:'Staff access required.'});
router.get('/manage',portalAuth,staff,c.getManagedAnnouncements);
router.get('/',c.getAnnouncements);router.get('/:id',c.getAnnouncementById);
router.post('/:id/view',portalAuth,oversight.view);
router.post('/',portalAuth,staff,c.createAnnouncement);router.put('/:id',portalAuth,staff,c.updateAnnouncement);router.delete('/:id',portalAuth,staff,c.deleteAnnouncement);
module.exports=router;
