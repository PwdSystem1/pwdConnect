import portalAuth from '../middleware/portalAuth.js';
import express from 'express';
import { getReceivedAlerts } from '../controllers/receivedAlertsController.js';

const router = express.Router();

router.use(portalAuth);
router.get('/', getReceivedAlerts); // o kaya /received-alerts depende sa setup ng server.js mo

export default router;