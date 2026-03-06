import { Request, Response } from 'express';
import prisma from '../db';
import { AuthRequest } from '../middleware/auth';
import {
  generateCampaignCode,
  generateValidationCode,
  generateShareToken,
  generateSharePin,
} from '../utils/codes';
import { getPlanLimits } from '../utils/planLimits';

// ─── Company: list campaigns ──────────────────────────────────────────────────

export const listCampaigns = async (req: AuthRequest, res: Response): Promise<void> => {
  const companyId = req.company!.companyId;
  try {
    const campaigns = await prisma.campaign.findMany({
      where: { companyId },
      include: {
        _count: { select: { drivers: true, locations: true, photos: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(campaigns);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ─── Company: create campaign ─────────────────────────────────────────────────

export const createCampaign = async (req: AuthRequest, res: Response): Promise<void> => {
  const companyId = req.company!.companyId;
  const { title, description, startDate, endDate } = req.body;

  if (!title) {
    res.status(400).json({ error: 'Title is required' });
    return;
  }

  try {
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    const limits = getPlanLimits(company?.planName || 'free');
    const activeCampaigns = await prisma.campaign.count({
      where: { companyId, isActive: true },
    });

    if (activeCampaigns >= limits.maxCampaigns) {
      res.status(403).json({
        error: `Your plan allows up to ${limits.maxCampaigns} active campaign(s). Upgrade to create more.`,
      });
      return;
    }

    // Generate unique campaign code
    let campaignCode: string;
    let exists = true;
    do {
      campaignCode = generateCampaignCode();
      exists = !!(await prisma.campaign.findUnique({ where: { campaignCode } }));
    } while (exists);

    const campaign = await prisma.campaign.create({
      data: {
        companyId,
        title,
        description,
        campaignCode,
        validationCode: generateValidationCode(),
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      },
    });

    res.status(201).json(campaign);
  } catch (error) {
    console.error('createCampaign error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ─── Company: get campaign detail ─────────────────────────────────────────────

export const getCampaign = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const companyId = req.company!.companyId;
  try {
    const campaign = await prisma.campaign.findFirst({
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
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ─── Company: update campaign ─────────────────────────────────────────────────

export const updateCampaign = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const companyId = req.company!.companyId;
  const { title, description, isActive, startDate, endDate } = req.body;
  try {
    const campaign = await prisma.campaign.findFirst({ where: { id, companyId } });
    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }
    const updated = await prisma.campaign.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(isActive !== undefined && { isActive }),
        ...(startDate !== undefined && { startDate: new Date(startDate) }),
        ...(endDate !== undefined && { endDate: new Date(endDate) }),
      },
    });
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ─── Company: generate share link ─────────────────────────────────────────────

export const generateShareLink = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const companyId = req.company!.companyId;
  try {
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    const limits = getPlanLimits(company?.planName || 'free');

    if (!limits.canShareLink) {
      res.status(403).json({
        error: 'Share links require Starter plan or higher. Upgrade to unlock.',
      });
      return;
    }

    const campaign = await prisma.campaign.findFirst({ where: { id, companyId } });
    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }

    const shareToken = generateShareToken();
    const sharePin = generateSharePin();

    await prisma.campaign.update({ where: { id }, data: { shareToken, sharePin } });

    const baseUrl = process.env.APP_URL || 'http://localhost:5173';
    res.json({
      shareUrl: `${baseUrl}/track/${shareToken}`,
      sharePin,
      shareToken,
    });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ─── Driver: auth with campaignCode + validationCode ─────────────────────────

export const validateCampaign = async (req: Request, res: Response): Promise<void> => {
  const { campaignCode, validationCode, alias, deviceId } = req.body;

  if (!campaignCode || !validationCode || !alias) {
    res.status(400).json({ error: 'campaignCode, validationCode and alias are required' });
    return;
  }

  try {
    const campaign = await prisma.campaign.findUnique({ where: { campaignCode } });
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
      driver = await prisma.driver.upsert({
        where: { deviceId_campaignId: { deviceId, campaignId: campaign.id } },
        update: { alias, isActive: true, lastSeenAt: new Date() },
        create: { alias, campaignId: campaign.id, deviceId },
      });
    } else {
      // Legacy clients without deviceId: create new driver
      driver = await prisma.driver.create({
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
  } catch (error) {
    console.error('validateCampaign error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ─── Legacy: get campaign status (public, by UUID) ────────────────────────────

export const getCampaignStatus = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const campaign = await prisma.campaign.findUnique({
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
  } catch {
    res.status(500).json({ error: 'Error fetching campaign' });
  }
};
