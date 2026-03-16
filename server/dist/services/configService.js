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
exports.invalidateCache = invalidateCache;
exports.getConfig = getConfig;
exports.getConfigNumber = getConfigNumber;
exports.getAllConfig = getAllConfig;
exports.validateConfigValue = validateConfigValue;
exports.setConfig = setConfig;
exports.setConfigBatch = setConfigBatch;
exports.seedConfigDefaults = seedConfigDefaults;
exports.getDynamicPlanLimits = getDynamicPlanLimits;
const db_1 = __importDefault(require("../db"));
const CONFIG_DEFINITIONS = {
    // ─── Pricing ────────────────────────────────────────────────────────────────
    credit_price_ars: {
        type: 'number', default: '150', label: 'Precio por crédito (ARS)',
        category: 'pricing', min: 1, max: 1000000,
    },
    credit_price_usd: {
        type: 'number', default: '0.10', label: 'Precio por crédito (USD)',
        category: 'pricing', min: 0.01, max: 1000,
    },
    credit_pack_size: {
        type: 'number', default: '100', label: 'Tamaño del paquete de créditos',
        category: 'pricing', min: 10, max: 10000,
    },
    currency_default: {
        type: 'string', default: 'ARS', label: 'Moneda por defecto',
        category: 'pricing', maxLength: 3,
    },
    // ─── Plan: Gratis ───────────────────────────────────────────────────────────
    plan_gratis_monthly_credits: {
        type: 'number', default: '30', label: 'Créditos mensuales (Gratis)',
        category: 'plan_gratis', min: 0, max: 100000,
    },
    plan_gratis_max_campaigns: {
        type: 'number', default: '1', label: 'Campañas máximas (Gratis)',
        category: 'plan_gratis', min: 1, max: 1000,
    },
    plan_gratis_trail_hours: {
        type: 'number', default: '24', label: 'Retención trail en horas (Gratis)',
        category: 'plan_gratis', min: 1, max: 8760,
    },
    plan_gratis_max_photos: {
        type: 'number', default: '30', label: 'Fotos/mes (Gratis, -1=ilimitadas)',
        category: 'plan_gratis', min: -1, max: 100000,
    },
    plan_gratis_price_ars: {
        type: 'number', default: '0', label: 'Precio mensual ARS (Gratis)',
        category: 'plan_gratis', min: 0, max: 10000000,
    },
    plan_gratis_price_usd: {
        type: 'number', default: '0', label: 'Precio mensual USD (Gratis)',
        category: 'plan_gratis', min: 0, max: 10000,
    },
    // ─── Plan: Pro ──────────────────────────────────────────────────────────────
    plan_pro_monthly_credits: {
        type: 'number', default: '300', label: 'Créditos mensuales (Pro)',
        category: 'plan_pro', min: 0, max: 100000,
    },
    plan_pro_max_campaigns: {
        type: 'number', default: '5', label: 'Campañas máximas (Pro)',
        category: 'plan_pro', min: 1, max: 1000,
    },
    plan_pro_trail_hours: {
        type: 'number', default: '168', label: 'Retención trail en horas (Pro)',
        category: 'plan_pro', min: 1, max: 8760,
    },
    plan_pro_max_photos: {
        type: 'number', default: '-1', label: 'Fotos/mes (Pro, -1=ilimitadas)',
        category: 'plan_pro', min: -1, max: 100000,
    },
    plan_pro_price_ars: {
        type: 'number', default: '29999', label: 'Precio mensual ARS (Pro)',
        category: 'plan_pro', min: 0, max: 10000000,
    },
    plan_pro_price_usd: {
        type: 'number', default: '19.99', label: 'Precio mensual USD (Pro)',
        category: 'plan_pro', min: 0, max: 10000,
    },
    // ─── Plan: Empresas ─────────────────────────────────────────────────────────
    plan_empresas_monthly_credits: {
        type: 'number', default: '1500', label: 'Créditos mensuales (Empresas)',
        category: 'plan_empresas', min: 0, max: 100000,
    },
    plan_empresas_max_campaigns: {
        type: 'number', default: '-1', label: 'Campañas máximas (Empresas, -1=ilimitadas)',
        category: 'plan_empresas', min: -1, max: 1000,
    },
    plan_empresas_trail_hours: {
        type: 'number', default: '360', label: 'Retención trail en horas (Empresas)',
        category: 'plan_empresas', min: 1, max: 8760,
    },
    plan_empresas_max_photos: {
        type: 'number', default: '-1', label: 'Fotos/mes (Empresas, -1=ilimitadas)',
        category: 'plan_empresas', min: -1, max: 100000,
    },
    plan_empresas_price_ars: {
        type: 'number', default: '99999', label: 'Precio mensual ARS (Empresas)',
        category: 'plan_empresas', min: 0, max: 10000000,
    },
    plan_empresas_price_usd: {
        type: 'number', default: '69.99', label: 'Precio mensual USD (Empresas)',
        category: 'plan_empresas', min: 0, max: 10000,
    },
    // ─── Packs de créditos ──────────────────────────────────────────────────────
    credit_pack_1_size: {
        type: 'number', default: '100', label: 'Pack 1 - Cantidad de créditos',
        category: 'pricing', min: 10, max: 10000,
    },
    credit_pack_1_price_ars: {
        type: 'number', default: '15000', label: 'Pack 1 - Precio ARS',
        category: 'pricing', min: 100, max: 10000000,
    },
    credit_pack_2_size: {
        type: 'number', default: '300', label: 'Pack 2 - Cantidad de créditos',
        category: 'pricing', min: 10, max: 10000,
    },
    credit_pack_2_price_ars: {
        type: 'number', default: '40000', label: 'Pack 2 - Precio ARS',
        category: 'pricing', min: 100, max: 10000000,
    },
    credit_pack_3_size: {
        type: 'number', default: '500', label: 'Pack 3 - Cantidad de créditos',
        category: 'pricing', min: 10, max: 10000,
    },
    credit_pack_3_price_ars: {
        type: 'number', default: '60000', label: 'Pack 3 - Precio ARS',
        category: 'pricing', min: 100, max: 10000000,
    },
};
// ─── In-memory cache ────────────────────────────────────────────────────────
let cache = {};
let cacheLoaded = false;
function ensureCache() {
    return __awaiter(this, void 0, void 0, function* () {
        if (cacheLoaded)
            return;
        const rows = yield db_1.default.systemConfig.findMany();
        cache = {};
        for (const r of rows) {
            cache[r.key] = r.value;
        }
        cacheLoaded = true;
    });
}
function invalidateCache() {
    cacheLoaded = false;
    cache = {};
}
// ─── Read config ────────────────────────────────────────────────────────────
function getConfig(key) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const def = CONFIG_DEFINITIONS[key];
        if (!def)
            throw new Error(`Unknown config key: ${key}`);
        yield ensureCache();
        return (_a = cache[key]) !== null && _a !== void 0 ? _a : def.default;
    });
}
function getConfigNumber(key) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const val = yield getConfig(key);
        const num = Number(val);
        return isNaN(num) ? Number((_b = (_a = CONFIG_DEFINITIONS[key]) === null || _a === void 0 ? void 0 : _a.default) !== null && _b !== void 0 ? _b : '0') : num;
    });
}
function getAllConfig() {
    return __awaiter(this, void 0, void 0, function* () {
        yield ensureCache();
        return Object.entries(CONFIG_DEFINITIONS).map(([key, def]) => {
            var _a;
            return (Object.assign(Object.assign(Object.assign({ key, value: (_a = cache[key]) !== null && _a !== void 0 ? _a : def.default, label: def.label, category: def.category, type: def.type }, (def.min !== undefined && { min: def.min })), (def.max !== undefined && { max: def.max })), (def.maxLength !== undefined && { maxLength: def.maxLength })));
        });
    });
}
function sanitizeString(val, maxLen) {
    // Strip HTML tags and control characters, trim, enforce length
    return val
        .replace(/<[^>]*>/g, '')
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
        .trim()
        .slice(0, maxLen);
}
function validateConfigValue(key, value) {
    var _a;
    const def = CONFIG_DEFINITIONS[key];
    if (!def) {
        return { key, message: `Clave desconocida: ${key}` };
    }
    if (typeof value !== 'string') {
        return { key, message: 'El valor debe ser un string' };
    }
    if (value.length > 1000) {
        return { key, message: 'Valor demasiado largo (máx 1000 caracteres)' };
    }
    switch (def.type) {
        case 'number': {
            const num = Number(value);
            if (isNaN(num) || !isFinite(num)) {
                return { key, message: `Debe ser un número válido` };
            }
            if (def.min !== undefined && num < def.min) {
                return { key, message: `Mínimo: ${def.min}` };
            }
            if (def.max !== undefined && num > def.max) {
                return { key, message: `Máximo: ${def.max}` };
            }
            break;
        }
        case 'boolean': {
            if (value !== 'true' && value !== 'false') {
                return { key, message: 'Debe ser "true" o "false"' };
            }
            break;
        }
        case 'string': {
            const maxLen = (_a = def.maxLength) !== null && _a !== void 0 ? _a : 255;
            if (value.length > maxLen) {
                return { key, message: `Máximo ${maxLen} caracteres` };
            }
            // Check for suspicious patterns (script injection attempts)
            if (/<script/i.test(value) || /javascript:/i.test(value) || /on\w+\s*=/i.test(value)) {
                return { key, message: 'Contenido no permitido' };
            }
            break;
        }
    }
    return null;
}
function setConfig(key, rawValue) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const def = CONFIG_DEFINITIONS[key];
        if (!def) {
            return { key, message: `Clave desconocida: ${key}` };
        }
        // Sanitize string values
        const value = def.type === 'string'
            ? sanitizeString(rawValue, (_a = def.maxLength) !== null && _a !== void 0 ? _a : 255)
            : rawValue.trim();
        const err = validateConfigValue(key, value);
        if (err)
            return err;
        yield db_1.default.systemConfig.upsert({
            where: { key },
            update: { value, label: def.label, category: def.category },
            create: { key, value, label: def.label, category: def.category },
        });
        // Update cache
        cache[key] = value;
        return null;
    });
}
function setConfigBatch(updates) {
    return __awaiter(this, void 0, void 0, function* () {
        // Validate all first, fail fast
        const errors = [];
        for (const { key, value } of updates) {
            const err = validateConfigValue(key, value);
            if (err)
                errors.push(err);
        }
        if (errors.length > 0)
            return errors;
        // Apply all
        for (const { key, value } of updates) {
            const applyErr = yield setConfig(key, value);
            if (applyErr)
                errors.push(applyErr);
        }
        return errors;
    });
}
// ─── Seed defaults (run on startup) ─────────────────────────────────────────
function seedConfigDefaults() {
    return __awaiter(this, void 0, void 0, function* () {
        // Migrate old plan names to new ones (free→gratis, starter→pro, growth/pro→empresas)
        const PLAN_MIGRATION = {
            free: 'gratis',
            starter: 'pro',
            growth: 'empresas',
        };
        for (const [oldName, newName] of Object.entries(PLAN_MIGRATION)) {
            const count = yield db_1.default.company.updateMany({
                where: { planName: oldName },
                data: { planName: newName },
            });
            if (count.count > 0) {
                console.log(`[config] Migrated ${count.count} companies from plan "${oldName}" to "${newName}"`);
            }
        }
        // Seed config defaults
        let created = 0;
        for (const [key, def] of Object.entries(CONFIG_DEFINITIONS)) {
            const existing = yield db_1.default.systemConfig.findUnique({ where: { key } });
            if (!existing) {
                yield db_1.default.systemConfig.create({
                    data: { key, value: def.default, label: def.label, category: def.category },
                });
                created++;
            }
        }
        if (created > 0)
            invalidateCache();
        return created;
    });
}
// ─── Dynamic plan limits (reads from config, falls back to defaults) ────────
const plans_1 = require("../utils/plans");
function getDynamicPlanLimits(planName) {
    return __awaiter(this, void 0, void 0, function* () {
        const defaults = plans_1.PLAN_DEFAULTS[planName] || plans_1.PLAN_DEFAULTS.gratis;
        const prefix = `plan_${planName}_`;
        yield ensureCache();
        const getNum = (suffix, fallback) => {
            const val = cache[prefix + suffix];
            if (val === undefined)
                return fallback;
            const n = Number(val);
            return isNaN(n) ? fallback : n;
        };
        return {
            monthlyCredits: getNum('monthly_credits', defaults.monthlyCredits),
            maxCampaigns: getNum('max_campaigns', defaults.maxCampaigns),
            trailRetentionHours: getNum('trail_hours', defaults.trailRetentionHours),
            maxPhotosPerMonth: getNum('max_photos', defaults.maxPhotosPerMonth),
            shareLinks: defaults.shareLinks, // always true for all plans
            stopDetection: defaults.stopDetection, // always true for all plans
        };
    });
}
