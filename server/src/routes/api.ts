import { Router } from 'express';
import multer from 'multer';
import path from 'path';

import { register, login, getMe } from '../controllers/authController';
import {
  listCampaigns,
  createCampaign,
  getCampaign,
  updateCampaign,
  generateShareLink,
  deleteShareLink,
  validateCampaign,
  getCampaignTrails,
} from '../controllers/campaignController';
import { ingestLocations } from '../controllers/locationController';
import { uploadPhoto } from '../controllers/driverController';
import { getShareData, getShareTrails } from '../controllers/shareController';
import { getPlans } from '../controllers/plansController';
import { getStats, getCompanies, updateCompany, getAllActiveCampaigns, getSystemConfig, updateSystemConfig } from '../controllers/adminController';
import { authMiddleware, superAdminMiddleware } from '../middleware/auth';
import { creditCheckMiddleware } from '../middleware/creditCheck';

const router = Router();

// Multer: disk storage for photos
const storage = multer.diskStorage({
  destination: path.join(process.cwd(), 'uploads'),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, unique + path.extname(file.originalname));
  },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// ─── Plans (public) ──────────────────────────────────────────────────────────
router.get('/plans', getPlans);

// ─── Auth (public) ────────────────────────────────────────────────────────────
router.post('/auth/register', register);
router.post('/auth/login', login);
router.get('/auth/me', authMiddleware as any, getMe as any);

// ─── Campaigns (company auth) ─────────────────────────────────────────────────
router.get('/campaigns', authMiddleware as any, listCampaigns as any);
router.post('/campaigns', authMiddleware as any, createCampaign as any);
router.get('/campaigns/:id', authMiddleware as any, creditCheckMiddleware as any, getCampaign as any);
router.put('/campaigns/:id', authMiddleware as any, updateCampaign as any);
router.post('/campaigns/:id/share-link', authMiddleware as any, generateShareLink as any);
router.delete('/campaigns/:id/share-link', authMiddleware as any, deleteShareLink as any);
router.get('/campaigns/:id/trails', authMiddleware as any, creditCheckMiddleware as any, getCampaignTrails as any);

// ─── Driver (public – driver auth by ID) ─────────────────────────────────────
router.post('/driver/auth', validateCampaign);
router.post('/driver/locations', ingestLocations);
router.post('/driver/photo', upload.single('photo'), uploadPhoto);

// ─── Share page (public) ──────────────────────────────────────────────────────
router.get('/share/:token', getShareData);
router.get('/share/:token/trails', getShareTrails);

// ─── Admin (super admin only) ─────────────────────────────────────────────────
router.get('/admin/stats', authMiddleware as any, superAdminMiddleware as any, getStats as any);
router.get('/admin/companies', authMiddleware as any, superAdminMiddleware as any, getCompanies as any);
router.put('/admin/companies/:id', authMiddleware as any, superAdminMiddleware as any, updateCompany as any);
router.get('/admin/campaigns', authMiddleware as any, superAdminMiddleware as any, getAllActiveCampaigns as any);
router.get('/admin/config', authMiddleware as any, superAdminMiddleware as any, getSystemConfig as any);
router.put('/admin/config', authMiddleware as any, superAdminMiddleware as any, updateSystemConfig as any);

export default router;
