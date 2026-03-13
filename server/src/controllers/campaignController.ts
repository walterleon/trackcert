import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import prisma from '../db';
import { AuthRequest } from '../middleware/auth';
import {
  generateCampaignCode,
  generateValidationCode,
  generateShareToken,
  generateSharePin,
} from '../utils/codes';
import { getPlanLimits } from '../utils/plans';

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

    // Notify campaign room via Socket.io when active status changes
    if (isActive !== undefined && isActive !== campaign.isActive) {
      const io = req.app.get('io');
      if (io) {
        io.to(`campaign:${id}`).emit(isActive ? 'campaign-resumed' : 'campaign-paused', {
          campaignId: id,
        });
      }
    }

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
    const campaign = await prisma.campaign.findFirst({ where: { id, companyId } });
    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }

    const baseUrl = process.env.APP_URL || 'http://localhost:5173';

    // If share link already exists, return it
    if (campaign.shareToken && campaign.sharePin) {
      res.json({
        shareUrl: `${baseUrl}/track/${campaign.shareToken}`,
        sharePin: campaign.sharePin,
        shareToken: campaign.shareToken,
      });
      return;
    }

    const shareToken = generateShareToken();
    const sharePin = generateSharePin();

    await prisma.campaign.update({ where: { id }, data: { shareToken, sharePin } });

    res.json({
      shareUrl: `${baseUrl}/track/${shareToken}`,
      sharePin,
      shareToken,
    });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ─── Company: delete share link ──────────────────────────────────────────────

export const deleteShareLink = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const companyId = req.company!.companyId;
  try {
    const campaign = await prisma.campaign.findFirst({ where: { id, companyId } });
    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }

    await prisma.campaign.update({
      where: { id },
      data: { shareToken: null, sharePin: null },
    });

    res.json({ success: true });
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

// ─── Company: get campaign trails ────────────────────────────────────────────

export const getCampaignTrails = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const companyId = req.company!.companyId;
  const since = req.query.since
    ? new Date(req.query.since as string)
    : new Date(Date.now() - 2 * 60 * 60 * 1000); // default 2h ago
  const limit = Math.min(Number(req.query.limit) || 500, 1000);

  try {
    const campaign = await prisma.campaign.findFirst({ where: { id, companyId } });
    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }

    const locations = await prisma.location.findMany({
      where: { campaignId: id, timestamp: { gte: since } },
      orderBy: { timestamp: 'asc' },
      select: { driverId: true, latitude: true, longitude: true, timestamp: true },
    });

    const trails: Record<string, Array<{ lat: number; lng: number; ts: string }>> = {};
    for (const loc of locations) {
      if (!trails[loc.driverId]) trails[loc.driverId] = [];
      if (trails[loc.driverId].length < limit) {
        trails[loc.driverId].push({
          lat: loc.latitude,
          lng: loc.longitude,
          ts: loc.timestamp.toISOString(),
        });
      }
    }

    res.json({ trails });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ─── Driver: check campaign status (public) ─────────────────────────────────

export const checkCampaignStatus = async (req: Request, res: Response): Promise<void> => {
  const { driverId } = req.params;
  try {
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      include: { campaign: { select: { isActive: true, title: true } } },
    });
    if (!driver) {
      res.status(404).json({ error: 'Driver not found' });
      return;
    }
    res.json({
      campaignActive: driver.campaign.isActive,
      campaignTitle: driver.campaign.title,
    });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ─── Company: delete campaign ────────────────────────────────────────────────

export const deleteCampaign = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const companyId = req.company!.companyId;

  try {
    const campaign = await prisma.campaign.findFirst({ where: { id, companyId } });
    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }

    // 1. Delete photo files from disk
    const photos = await prisma.photo.findMany({
      where: { campaignId: id },
      select: { filePath: true, fileUrl: true },
    });
    for (const photo of photos) {
      const filePath = photo.filePath || path.join(process.cwd(), 'uploads', path.basename(photo.fileUrl));
      try {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch (fsErr) {
        console.error('deleteCampaign: failed to remove photo file', filePath, fsErr);
      }
    }

    // 2. Delete all related records in correct order (foreign key constraints)
    await prisma.photo.deleteMany({ where: { campaignId: id } });
    await prisma.location.deleteMany({ where: { campaignId: id } });
    await prisma.driver.deleteMany({ where: { campaignId: id } });
    await prisma.campaign.delete({ where: { id } });

    res.json({ success: true });
  } catch (error) {
    console.error('deleteCampaign error:', error);
    res.status(500).json({ error: 'Failed to delete campaign' });
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
