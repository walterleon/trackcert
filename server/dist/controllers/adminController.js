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
exports.updateSystemConfig = exports.getSystemConfig = exports.getAllActiveCampaigns = exports.updateCompany = exports.getCompanies = exports.getStats = void 0;
const db_1 = __importDefault(require("../db"));
const plans_1 = require("../utils/plans");
const configService_1 = require("../services/configService");
// ─── Stats ──────────────────────────────────────────────────────────────────
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
// ─── Companies ──────────────────────────────────────────────────────────────
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
                bonusCredits: true,
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
const VALID_ROLES = ['COMPANY', 'SUPER_ADMIN'];
const updateCompany = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { planName, credits, bonusCredits, role } = req.body;
    // Strict validation — no arbitrary values
    if (planName !== undefined && !plans_1.VALID_PLAN_NAMES.includes(planName)) {
        res.status(400).json({ error: `Plan inválido. Opciones: ${plans_1.VALID_PLAN_NAMES.join(', ')}` });
        return;
    }
    if (role !== undefined && !VALID_ROLES.includes(role)) {
        res.status(400).json({ error: `Rol inválido. Opciones: ${VALID_ROLES.join(', ')}` });
        return;
    }
    if (credits !== undefined) {
        const c = Number(credits);
        if (!Number.isFinite(c) || c < 0 || c > 1000000 || c !== Math.floor(c)) {
            res.status(400).json({ error: 'Créditos debe ser un entero entre 0 y 1.000.000' });
            return;
        }
    }
    if (bonusCredits !== undefined) {
        const b = Number(bonusCredits);
        if (!Number.isFinite(b) || b < 0 || b > 1000000 || b !== Math.floor(b)) {
            res.status(400).json({ error: 'Créditos bonus debe ser un entero entre 0 y 1.000.000' });
            return;
        }
    }
    try {
        const company = yield db_1.default.company.update({
            where: { id },
            data: Object.assign(Object.assign(Object.assign(Object.assign({}, (planName !== undefined && { planName })), (credits !== undefined && { credits: Number(credits) })), (bonusCredits !== undefined && { bonusCredits: Number(bonusCredits) })), (role !== undefined && { role })),
        });
        res.json(company);
    }
    catch (_a) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.updateCompany = updateCompany;
// ─── Campaigns ──────────────────────────────────────────────────────────────
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
// ─── System Config ──────────────────────────────────────────────────────────
const getSystemConfig = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const config = yield (0, configService_1.getAllConfig)();
        res.json(config);
    }
    catch (_a) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.getSystemConfig = getSystemConfig;
const updateSystemConfig = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { updates } = req.body;
    // Validate request shape
    if (!Array.isArray(updates)) {
        res.status(400).json({ error: 'Se requiere un array "updates" con {key, value}' });
        return;
    }
    if (updates.length > 50) {
        res.status(400).json({ error: 'Máximo 50 cambios por request' });
        return;
    }
    // Validate each entry shape
    for (const entry of updates) {
        if (typeof (entry === null || entry === void 0 ? void 0 : entry.key) !== 'string' || typeof (entry === null || entry === void 0 ? void 0 : entry.value) !== 'string') {
            res.status(400).json({ error: 'Cada entrada debe tener "key" (string) y "value" (string)' });
            return;
        }
    }
    // Validate values against definitions
    const preErrors = [];
    for (const { key, value } of updates) {
        const err = (0, configService_1.validateConfigValue)(key, value);
        if (err)
            preErrors.push(err);
    }
    if (preErrors.length > 0) {
        res.status(400).json({ error: 'Errores de validación', details: preErrors });
        return;
    }
    try {
        const errors = yield (0, configService_1.setConfigBatch)(updates);
        if (errors.length > 0) {
            res.status(400).json({ error: 'Errores al guardar', details: errors });
            return;
        }
        res.json({ success: true, updated: updates.length });
    }
    catch (_a) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.updateSystemConfig = updateSystemConfig;
