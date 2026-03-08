"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCampaignStatus = exports.getCampaignTrails = exports.validateCampaign = exports.generateShareLink = exports.updateCampaign = exports.getCampaign = exports.createCampaign = exports.listCampaigns = void 0;
const db_1 = __importDefault(require("../db"));
const codes_1 = require("../utils/codes");
const planLimits_1 = require("../utils/planLimits");
// ─── Company: list campaigns ──────────────────────────────────────────────────
const listCampaigns = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const companyId = req.company.companyId;
    try {
        const campaigns = yield db_1.default.campaign.findMany({
            where: { companyId },
            include: {
                _count: { select: { drivers: true, locations: true, photos: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json(campaigns);
    }
    catch (_a) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.listCampaigns = listCampaigns;
// ─── Company: create campaign ─────────────────────────────────────────────────
const createCampaign = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const companyId = req.company.companyId;
    const { title, description, startDate, endDate } = req.body;
    if (!title) {
        res.status(400).json({ error: 'Title is required' });
        return;
    }
    try {
        const company = yield db_1.default.company.findUnique({ where: { id: companyId } });
        const limits = (0, planLimits_1.getPlanLimits)((company === null || company === void 0 ? void 0 : company.planName) || 'free');
        const activeCampaigns = yield db_1.default.campaign.count({
            where: { companyId, isActive: true },
        });
        if (activeCampaigns >= limits.maxCampaigns) {
            res.status(403).json({
                error: `Your plan allows up to ${limits.maxCampaigns} active campaign(s). Upgrade to create more.`,
            });
            return;
        }
        // Generate unique campaign code
        let campaignCode;
        let exists = true;
        do {
            campaignCode = (0, codes_1.generateCampaignCode)();
            exists = !!(yield db_1.default.campaign.findUnique({ where: { campaignCode } }));
        } while (exists);
        const campaign = yield db_1.default.campaign.create({
            data: {
                companyId,
                title,
                description,
                campaignCode,
                validationCode: (0, codes_1.generateValidationCode)(),
                startDate: startDate ? new Date(startDate) : undefined,
                endDate: endDate ? new Date(endDate) : undefined,
            },
        });
        res.status(201).json(campaign);
    }
    catch (error) {
        console.error('createCampaign error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.createCampaign = createCampaign;
// ─── Company: get campaign detail ─────────────────────────────────────────────
const getCampaign = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const companyId = req.company.companyId;
    try {
        const campaign = yield db_1.default.campaign.findFirst({
            where: { id, companyId },
            include: {
                drivers: {
                    include: {
                        locations: {
                            orderBy: { timestamp: 'desc' },
                            take: 1,
                        },
                    },
                },
                photos: {
                    orderBy: { takenAt: 'desc' },
                    take: 50,
                },
            },
        });
        if (!campaign) {
            res.status(404).json({ error: 'Campaign not found' });
            return;
        }
        res.json(campaign);
    }
    catch (_a) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.getCampaign = getCampaign;
// ─── Company: update campaign ─────────────────────────────────────────────────
const updateCampaign = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const companyId = req.company.companyId;
    const { title, description, isActive, startDate, endDate } = req.body;
    try {
        const campaign = yield db_1.default.campaign.findFirst({ where: { id, companyId } });
        if (!campaign) {
            res.status(404).json({ error: 'Campaign not found' });
            return;
        }
        const updated = yield db_1.default.campaign.update({
            where: { id },
            data: Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, (title !== undefined && { title })), (description !== undefined && { description })), (isActive !== undefined && { isActive })), (startDate !== undefined && { startDate: new Date(startDate) })), (endDate !== undefined && { endDate: new Date(endDate) })),
        });
        res.json(updated);
    }
    catch (_a) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.updateCampaign = updateCampaign;
// ─── Company: generate share link ─────────────────────────────────────────────
const generateShareLink = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const companyId = req.company.companyId;
    try {
        const company = yield db_1.default.company.findUnique({ where: { id: companyId } });
        const limits = (0, planLimits_1.getPlanLimits)((company === null || company === void 0 ? void 0 : company.planName) || 'free');
        if (!limits.canShareLink) {
            res.status(403).json({
                error: 'Share links require Starter plan or higher. Upgrade to unlock.',
            });
            return;
        }
        const campaign = yield db_1.default.campaign.findFirst({ where: { id, companyId } });
        if (!campaign) {
            res.status(404).json({ error: 'Campaign not found' });
            return;
        }
        const shareToken = (0, codes_1.generateShareToken)();
        const sharePin = (0, codes_1.generateSharePin)();
        yield db_1.default.campaign.update({ where: { id }, data: { shareToken, sharePin } });
        const baseUrl = process.env.APP_URL || 'http://localhost:5173';
        res.json({
            shareUrl: `${baseUrl}/track/${shareToken}`,
            sharePin,
            shareToken,
        });
    }
    catch (_a) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.generateShareLink = generateShareLink;
// ─── Driver: auth with campaignCode + validationCode ─────────────────────────
const validateCampaign = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { campaignCode, validationCode, alias, deviceId } = req.body;
    if (!campaignCode || !validationCode || !alias) {
        res.status(400).json({ error: 'campaignCode, validationCode and alias are required' });
        return;
    }
    try {
        const campaign = yield db_1.default.campaign.findUnique({ where: { campaignCode } });
        if (!campaign) {
            res.status(404).json({ error: 'Campaign not found' });
            return;
        }
        if (campaign.validationCode !== validationCode) {
            res.status(401).json({ error: 'Invalid validation code' });
            return;
        }
        if (!campaign.isActive) {
            res.status(403).json({ error: 'Campaign is not active' });
            return;
        }
        let driver;
        if (deviceId) {
            // Upsert: reuse existing driver for same device+campaign, or create new
            driver = yield db_1.default.driver.upsert({
                where: { deviceId_campaignId: { deviceId, campaignId: campaign.id } },
                update: { alias, isActive: true, lastSeenAt: new Date() },
                create: { alias, campaignId: campaign.id, deviceId },
            });
        }
        else {
            // Legacy clients without deviceId: create new driver
            driver = yield db_1.default.driver.create({
                data: { alias, campaignId: campaign.id },
            });
        }
        res.json({
            success: true,
            driverId: driver.id,
            campaignId: campaign.id,
            campaignTitle: campaign.title,
            _debug: { receivedDeviceId: deviceId || null, serverVersion: 'v2-deviceid' },
        });
    }
    catch (error) {
        console.error('validateCampaign error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.validateCampaign = validateCampaign;
// ─── Company: get campaign trails ────────────────────────────────────────────
const getCampaignTrails = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const companyId = req.company.companyId;
    const since = req.query.since
        ? new Date(req.query.since)
        : new Date(Date.now() - 2 * 60 * 60 * 1000); // default 2h ago
    const limit = Math.min(Number(req.query.limit) || 500, 1000);
    try {
        const campaign = yield db_1.default.campaign.findFirst({ where: { id, companyId } });
        if (!campaign) {
            res.status(404).json({ error: 'Campaign not found' });
            return;
        }
        const locations = yield db_1.default.location.findMany({
            where: { campaignId: id, timestamp: { gte: since } },
            orderBy: { timestamp: 'asc' },
            select: { driverId: true, latitude: true, longitude: true, timestamp: true },
        });
        const trails = {};
        for (const loc of locations) {
            if (!trails[loc.driverId])
                trails[loc.driverId] = [];
            if (trails[loc.driverId].length < limit) {
                trails[loc.driverId].push({
                    lat: loc.latitude,
                    lng: loc.longitude,
                    ts: loc.timestamp.toISOString(),
                });
            }
        }
        res.json({ trails });
    }
    catch (_a) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.getCampaignTrails = getCampaignTrails;
// ─── Legacy: get campaign status (public, by UUID) ────────────────────────────
const getCampaignStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        const campaign = yield db_1.default.campaign.findUnique({
            where: { id },
            include: {
                drivers: {
                    include: {
                        locations: { orderBy: { timestamp: 'desc' }, take: 1 },
                    },
                },
            },
        });
        res.json(campaign);
    }
    catch (_a) {
        res.status(500).json({ error: 'Error fetching campaign' });
    }
});
exports.getCampaignStatus = getCampaignStatus;
