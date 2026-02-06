import { Router } from 'express';
import { validateCampaign, getCampaignStatus } from '../controllers/campaignController';
import { ingestLocations } from '../controllers/locationController';

const router = Router();

// Driver App Routes
router.post('/driver/auth', validateCampaign);
router.post('/driver/locations', ingestLocations);

// Admin Routes (Simplified for now)
router.get('/campaign/:id', getCampaignStatus);

export default router;
