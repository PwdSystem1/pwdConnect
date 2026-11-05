import portalAuth from '../middleware/portalAuth.js';
import express from 'express';
import { getReceivedAlerts, recordBroadcastResponse } from '../controllers/receivedAlertsController.js';

const router = express.Router();

router.use(portalAuth);
router.get('/', getReceivedAlerts);
router.post('/:id/response', recordBroadcastResponse); // o kaya /received-alerts depende sa setup ng server.js mo

export default router;