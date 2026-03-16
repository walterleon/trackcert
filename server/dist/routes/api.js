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
const paymentController_1 = require("../controllers/paymentController");
const auth_1 = require("../middleware/auth");
const creditCheck_1 = require("../middleware/creditCheck");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
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
router.get('/driver/status/:driverId', campaignController_1.checkCampaignStatus);
router.post('/driver/locations', locationController_1.ingestLocations);
router.post('/driver/photo', upload.single('photo'), driverController_1.uploadPhoto);
// ─── Share page (public) ──────────────────────────────────────────────────────
router.get('/share/:token', shareController_1.getShareData);
router.get('/share/:token/trails', shareController_1.getShareTrails);
// ─── Payments (company auth + rate limit) ────────────────────────────────────
const paymentLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000, // 1 minute
    max: 5,
    keyGenerator: (req) => { var _a; return ((_a = req.company) === null || _a === void 0 ? void 0 : _a.companyId) || req.ip || 'unknown'; },
    message: { error: 'Demasiadas solicitudes. Intentá de nuevo en un minuto.' },
    validate: { keyGeneratorIpFallback: false },
});
router.post('/payments/subscribe', auth_1.authMiddleware, paymentLimiter, paymentController_1.subscribe);
router.post('/payments/change-plan', auth_1.authMiddleware, paymentLimiter, paymentController_1.changePlan);
router.post('/payments/buy-credits', auth_1.authMiddleware, paymentLimiter, paymentController_1.buyCredits);
router.post('/payments/cancel-subscription', auth_1.authMiddleware, paymentLimiter, paymentController_1.cancelSub);
router.get('/payments/status', auth_1.authMiddleware, paymentController_1.paymentStatusHandler);
router.get('/payments/history', auth_1.authMiddleware, paymentController_1.paymentHistoryHandler);
// Webhook is mounted in index.ts (before express.json)
// Redirect endpoints (MP back_urls)
router.get('/payments/success', (0, paymentController_1.paymentRedirect)('success'));
router.get('/payments/failure', (0, paymentController_1.paymentRedirect)('failure'));
router.get('/payments/pending', (0, paymentController_1.paymentRedirect)('pending'));
// ─── Admin (super admin only) ─────────────────────────────────────────────────
router.get('/admin/stats', auth_1.authMiddleware, auth_1.superAdminMiddleware, adminController_1.getStats);
router.get('/admin/companies', auth_1.authMiddleware, auth_1.superAdminMiddleware, adminController_1.getCompanies);
router.put('/admin/companies/:id', auth_1.authMiddleware, auth_1.superAdminMiddleware, adminController_1.updateCompany);
router.get('/admin/campaigns', auth_1.authMiddleware, auth_1.superAdminMiddleware, adminController_1.getAllActiveCampaigns);
router.get('/admin/config', auth_1.authMiddleware, auth_1.superAdminMiddleware, adminController_1.getSystemConfig);
router.put('/admin/config', auth_1.authMiddleware, auth_1.superAdminMiddleware, adminController_1.updateSystemConfig);
exports.default = router;
