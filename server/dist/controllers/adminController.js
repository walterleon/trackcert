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
exports.getAllActiveCampaigns = exports.updateCompany = exports.getCompanies = exports.getStats = void 0;
const db_1 = __importDefault(require("../db"));
const getStats = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const [companies, campaigns, drivers, locations, photos] = yield Promise.all([
            db_1.default.company.count(),
            db_1.default.campaign.count(),
            db_1.default.driver.count(),
            db_1.default.location.count(),
            db_1.default.photo.count(),
        ]);
        res.json({ companies, campaigns, drivers, locations, photos });
    }
    catch (_a) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.getStats = getStats;
const getCompanies = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const companies = yield db_1.default.company.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                planName: true,
                credits: true,
                createdAt: true,
                _count: { select: { campaigns: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json(companies);
    }
    catch (_a) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.getCompanies = getCompanies;
const updateCompany = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { planName, credits, role } = req.body;
    try {
        const company = yield db_1.default.company.update({
            where: { id },
            data: Object.assign(Object.assign(Object.assign({}, (planName !== undefined && { planName })), (credits !== undefined && { credits: Number(credits) })), (role !== undefined && { role })),
        });
        res.json(company);
    }
    catch (_a) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.updateCompany = updateCompany;
const getAllActiveCampaigns = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const campaigns = yield db_1.default.campaign.findMany({
            where: { isActive: true },
            include: {
                company: { select: { name: true } },
                _count: { select: { drivers: true, locations: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json(campaigns);
    }
    catch (_a) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.getAllActiveCampaigns = getAllActiveCampaigns;
