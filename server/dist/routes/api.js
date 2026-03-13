"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const authController_1 = require("../controllers/authController");
const campaignController_1 = require("../controllers/campaignController");
const locationController_1 = require("../controllers/locationController");
const driverController_1 = require("../controllers/driverController");
const shareController_1 = require("../controllers/shareController");
const plansController_1 = require("../controllers/plansController");
const adminController_1 = require("../controllers/adminController");
const auth_1 = require("../middleware/auth");
const creditCheck_1 = require("../middleware/creditCheck");
const router = (0, express_1.Router)();
// Multer: disk storage for photos
const storage = multer_1.default.diskStorage({
    destination: path_1.default.join(process.cwd(), 'uploads'),
    filename: (_req, file, cb) => {
        const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, unique + path_1.default.extname(file.originalname));
    },
});
const upload = (0, multer_1.default)({ storage, limits: { fileSize: 10 * 1024 * 1024 } });
// ─── Plans (public) ──────────────────────────────────────────────────────────
router.get('/plans', plansController_1.getPlans);
// ─── Auth (public) ────────────────────────────────────────────────────────────
router.post('/auth/register', authController_1.register);
router.post('/auth/login', authController_1.login);
router.get('/auth/me', auth_1.authMiddleware, authController_1.getMe);
// ─── Campaigns (company auth) ─────────────────────────────────────────────────
router.get('/campaigns', auth_1.authMiddleware, campaignController_1.listCampaigns);
router.post('/campaigns', auth_1.authMiddleware, campaignController_1.createCampaign);
router.get('/campaigns/:id', auth_1.authMiddleware, creditCheck_1.creditCheckMiddleware, campaignController_1.getCampaign);
router.put('/campaigns/:id', auth_1.authMiddleware, campaignController_1.updateCampaign);
router.delete('/campaigns/:id', auth_1.authMiddleware, campaignController_1.deleteCampaign);
router.post('/campaigns/:id/share-link', auth_1.authMiddleware, campaignController_1.generateShareLink);
router.delete('/campaigns/:id/share-link', auth_1.authMiddleware, campaignController_1.deleteShareLink);
router.get('/campaigns/:id/trails', auth_1.authMiddleware, creditCheck_1.creditCheckMiddleware, campaignController_1.getCampaignTrails);
router.delete('/campaigns/:campaignId/photos/:photoId', auth_1.authMiddleware, driverController_1.deletePhoto);
// ─── Driver (public – driver auth by ID) ─────────────────────────────────────
router.post('/driver/auth', campaignController_1.validateCampaign);
router.post('/driver/locations', locationController_1.ingestLocations);
router.post('/driver/photo', upload.single('photo'), driverController_1.uploadPhoto);
// ─── Share page (public) ──────────────────────────────────────────────────────
router.get('/share/:token', shareController_1.getShareData);
router.get('/share/:token/trails', shareController_1.getShareTrails);
// ─── Admin (super admin only) ─────────────────────────────────────────────────
router.get('/admin/stats', auth_1.authMiddleware, auth_1.superAdminMiddleware, adminController_1.getStats);
router.get('/admin/companies', auth_1.authMiddleware, auth_1.superAdminMiddleware, adminController_1.getCompanies);
router.put('/admin/companies/:id', auth_1.authMiddleware, auth_1.superAdminMiddleware, adminController_1.updateCompany);
router.get('/admin/campaigns', auth_1.authMiddleware, auth_1.superAdminMiddleware, adminController_1.getAllActiveCampaigns);
router.get('/admin/config', auth_1.authMiddleware, auth_1.superAdminMiddleware, adminController_1.getSystemConfig);
router.put('/admin/config', auth_1.authMiddleware, auth_1.superAdminMiddleware, adminController_1.updateSystemConfig);
exports.default = router;
