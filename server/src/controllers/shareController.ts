import { Request, Response } from 'express';
import prisma from '../db';
import { hasCredits } from '../services/creditService';

export const getShareTrails = async (req: Request, res: Response): Promise<void> => {
  const { token } = req.params;
  const { pin, since: sinceParam } = req.query;

  if (!pin) {
    res.status(400).json({ error: 'PIN is required' });
    return;
  }

  try {
    const campaign = await prisma.campaign.findUnique({
      where: { shareToken: token },
      include: { company: { select: { credits: true, bonusCredits: true, role: true } } },
    });
    if (!campaign) {
      res.status(404).json({ error: 'Share link not found or expired' });
      return;
    }
    if (campaign.sharePin !== String(pin)) {
      res.status(401).json({ error: 'Invalid PIN' });
      return;
    }
    if (!hasCredits(campaign.company)) {
      res.status(402).json({ error: 'Sin créditos disponibles', code: 'NO_CREDITS' });
      return;
    }

    const since = sinceParam
      ? new Date(sinceParam as string)
      : new Date(Date.now() - 2 * 60 * 60 * 1000);

    const locations = await prisma.location.findMany({
      where: { campaignId: campaign.id, timestamp: { gte: since } },
      orderBy: { timestamp: 'asc' },
      select: { driverId: true, latitude: true, longitude: true, timestamp: true },
    });

    const trails: Record<string, Array<{ lat: number; lng: number; ts: string }>> = {};
    for (const loc of locations) {
      if (!trails[loc.driverId]) trails[loc.driverId] = [];
      if (trails[loc.driverId].length < 500) {
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

export const getShareData = async (req: Request, res: Response): Promise<void> => {
  const { token } = req.params;
  const { pin } = req.query;

  if (!pin) {
    res.status(400).json({ error: 'PIN is required' });
    return;
  }

  try {
    const campaign = await prisma.campaign.findUnique({
      where: { shareToken: token },
      include: {
        company: { select: { name: true, credits: true, bonusCredits: true, role: true } },
        drivers: {
          where: { isActive: true },
          include: {
            locations: {
              orderBy: { timestamp: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    if (!campaign) {
      res.status(404).json({ error: 'Share link not found or expired' });
      return;
    }

    if (campaign.sharePin !== String(pin)) {
      res.status(401).json({ error: 'Invalid PIN' });
      return;
    }

    if (!hasCredits(campaign.company)) {
      res.status(402).json({ error: 'Sin créditos disponibles', code: 'NO_CREDITS' });
      return;
    }

    res.json({
      campaignId: campaign.id,
      title: campaign.title,
      companyName: campaign.company.name,
      isActive: campaign.isActive,
      drivers: campaign.drivers.map((d) => ({
        id: d.id,
        alias: d.alias,
        lastSeenAt: d.lastSeenAt,
        lastLocation: d.locations[0] ?? null,
      })),
    });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
};
