import { Response } from 'express';
import prisma from '../db';
import { AuthRequest } from '../middleware/auth';
import { VALID_PLAN_NAMES } from '../utils/plans';
import {
  getAllConfig,
  setConfigBatch,
  validateConfigValue,
} from '../services/configService';

// ─── Stats ──────────────────────────────────────────────────────────────────

export const getStats = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [companies, campaigns, drivers, locations, photos] = await Promise.all([
      prisma.company.count(),
      prisma.campaign.count(),
      prisma.driver.count(),
      prisma.location.count(),
      prisma.photo.count(),
    ]);
    res.json({ companies, campaigns, drivers, locations, photos });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ─── Companies ──────────────────────────────────────────────────────────────

export const getCompanies = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const companies = await prisma.company.findMany({
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
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
};

const VALID_ROLES = ['COMPANY', 'SUPER_ADMIN'];

export const updateCompany = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { planName, credits, bonusCredits, role } = req.body;

  // Strict validation — no arbitrary values
  if (planName !== undefined && !VALID_PLAN_NAMES.includes(planName)) {
    res.status(400).json({ error: `Plan inválido. Opciones: ${VALID_PLAN_NAMES.join(', ')}` });
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
    const company = await prisma.company.update({
      where: { id },
      data: {
        ...(planName !== undefined && { planName }),
        ...(credits !== undefined && { credits: Number(credits) }),
        ...(bonusCredits !== undefined && { bonusCredits: Number(bonusCredits) }),
        ...(role !== undefined && { role }),
      },
    });
    res.json(company);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ─── Campaigns ──────────────────────────────────────────────────────────────

export const getAllActiveCampaigns = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const campaigns = await prisma.campaign.findMany({
      where: { isActive: true },
      include: {
        company: { select: { name: true } },
        _count: { select: { drivers: true, locations: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(campaigns);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ─── System Config ──────────────────────────────────────────────────────────

export const getSystemConfig = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const config = await getAllConfig();
    res.json(config);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateSystemConfig = async (req: AuthRequest, res: Response): Promise<void> => {
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
    if (typeof entry?.key !== 'string' || typeof entry?.value !== 'string') {
      res.status(400).json({ error: 'Cada entrada debe tener "key" (string) y "value" (string)' });
      return;
    }
  }

  // Validate values against definitions
  const preErrors = [];
  for (const { key, value } of updates) {
    const err = validateConfigValue(key, value);
    if (err) preErrors.push(err);
  }
  if (preErrors.length > 0) {
    res.status(400).json({ error: 'Errores de validación', details: preErrors });
    return;
  }

  try {
    const errors = await setConfigBatch(updates);
    if (errors.length > 0) {
      res.status(400).json({ error: 'Errores al guardar', details: errors });
      return;
    }
    res.json({ success: true, updated: updates.length });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
};
