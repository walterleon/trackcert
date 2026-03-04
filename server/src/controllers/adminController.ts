import { Response } from 'express';
import prisma from '../db';
import { AuthRequest } from '../middleware/auth';

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

export const updateCompany = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { planName, credits, role } = req.body;
  try {
    const company = await prisma.company.update({
      where: { id },
      data: {
        ...(planName !== undefined && { planName }),
        ...(credits !== undefined && { credits: Number(credits) }),
        ...(role !== undefined && { role }),
      },
    });
    res.json(company);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
};

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
