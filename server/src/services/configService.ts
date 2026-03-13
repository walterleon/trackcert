import prisma from '../db';

// ─── Config key definitions (whitelist) ─────────────────────────────────────
// Only these keys can exist. Each has a type, default, label, category, and
// optional min/max constraints. This prevents arbitrary key creation and
// ensures strict type validation on every update.

interface ConfigDef {
  type: 'number' | 'string' | 'boolean';
  default: string;
  label: string;
  category: string;
  min?: number;
  max?: number;
  maxLength?: number;
}

const CONFIG_DEFINITIONS: Record<string, ConfigDef> = {
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
};

// ─── In-memory cache ────────────────────────────────────────────────────────
let cache: Record<string, string> = {};
let cacheLoaded = false;

async function ensureCache(): Promise<void> {
  if (cacheLoaded) return;
  const rows = await prisma.systemConfig.findMany();
  cache = {};
  for (const r of rows) {
    cache[r.key] = r.value;
  }
  cacheLoaded = true;
}

export function invalidateCache(): void {
  cacheLoaded = false;
  cache = {};
}

// ─── Read config ────────────────────────────────────────────────────────────

export async function getConfig(key: string): Promise<string> {
  const def = CONFIG_DEFINITIONS[key];
  if (!def) throw new Error(`Unknown config key: ${key}`);
  await ensureCache();
  return cache[key] ?? def.default;
}

export async function getConfigNumber(key: string): Promise<number> {
  const val = await getConfig(key);
  const num = Number(val);
  return isNaN(num) ? Number(CONFIG_DEFINITIONS[key]?.default ?? '0') : num;
}

export async function getAllConfig(): Promise<Array<{
  key: string;
  value: string;
  label: string;
  category: string;
  type: string;
  min?: number;
  max?: number;
  maxLength?: number;
}>> {
  await ensureCache();
  return Object.entries(CONFIG_DEFINITIONS).map(([key, def]) => ({
    key,
    value: cache[key] ?? def.default,
    label: def.label,
    category: def.category,
    type: def.type,
    ...(def.min !== undefined && { min: def.min }),
    ...(def.max !== undefined && { max: def.max }),
    ...(def.maxLength !== undefined && { maxLength: def.maxLength }),
  }));
}

// ─── Write config (with strict validation) ──────────────────────────────────

export interface ConfigValidationError {
  key: string;
  message: string;
}

function sanitizeString(val: string, maxLen: number): string {
  // Strip HTML tags and control characters, trim, enforce length
  return val
    .replace(/<[^>]*>/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim()
    .slice(0, maxLen);
}

export function validateConfigValue(key: string, value: string): ConfigValidationError | null {
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
      const maxLen = def.maxLength ?? 255;
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

export async function setConfig(key: string, rawValue: string): Promise<ConfigValidationError | null> {
  const def = CONFIG_DEFINITIONS[key];
  if (!def) {
    return { key, message: `Clave desconocida: ${key}` };
  }

  // Sanitize string values
  const value = def.type === 'string'
    ? sanitizeString(rawValue, def.maxLength ?? 255)
    : rawValue.trim();

  const err = validateConfigValue(key, value);
  if (err) return err;

  await prisma.systemConfig.upsert({
    where: { key },
    update: { value, label: def.label, category: def.category },
    create: { key, value, label: def.label, category: def.category },
  });

  // Update cache
  cache[key] = value;

  return null;
}

export async function setConfigBatch(
  updates: Array<{ key: string; value: string }>
): Promise<ConfigValidationError[]> {
  // Validate all first, fail fast
  const errors: ConfigValidationError[] = [];
  for (const { key, value } of updates) {
    const err = validateConfigValue(key, value);
    if (err) errors.push(err);
  }
  if (errors.length > 0) return errors;

  // Apply all
  for (const { key, value } of updates) {
    const applyErr = await setConfig(key, value);
    if (applyErr) errors.push(applyErr);
  }

  return errors;
}

// ─── Seed defaults (run on startup) ─────────────────────────────────────────

export async function seedConfigDefaults(): Promise<number> {
  // Migrate old plan names to new ones (free→gratis, starter→pro, growth/pro→empresas)
  const PLAN_MIGRATION: Record<string, string> = {
    free: 'gratis',
    starter: 'pro',
    growth: 'empresas',
  };
  for (const [oldName, newName] of Object.entries(PLAN_MIGRATION)) {
    const count = await prisma.company.updateMany({
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
    const existing = await prisma.systemConfig.findUnique({ where: { key } });
    if (!existing) {
      await prisma.systemConfig.create({
        data: { key, value: def.default, label: def.label, category: def.category },
      });
      created++;
    }
  }
  if (created > 0) invalidateCache();
  return created;
}

// ─── Dynamic plan limits (reads from config, falls back to defaults) ────────

import { type PlanLimits, PLAN_DEFAULTS } from '../utils/plans';

export async function getDynamicPlanLimits(planName: string): Promise<PlanLimits> {
  const defaults = PLAN_DEFAULTS[planName] || PLAN_DEFAULTS.gratis;
  const prefix = `plan_${planName}_`;

  await ensureCache();

  const getNum = (suffix: string, fallback: number): number => {
    const val = cache[prefix + suffix];
    if (val === undefined) return fallback;
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
}
