import { Request, Response } from 'express';
import prisma from '../db';

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
        company: { select: { name: true } },
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
