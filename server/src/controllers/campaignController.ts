import { Request, Response } from 'express';
import prisma from '../db';

export const validateCampaign = async (req: Request, res: Response) => {
    const { campaignId, validationCode, alias } = req.body;

    try {
        const campaign = await prisma.campaign.findUnique({
            where: { id: campaignId },
        });

        if (!campaign) {
            return res.status(404).json({ error: 'Campaign not found' });
        }

        if (campaign.validationCode !== validationCode) {
            return res.status(401).json({ error: 'Invalid validation code' });
        }

        if (!campaign.isActive) {
            return res.status(403).json({ error: 'Campaign is not active' });
        }

        // Create or find driver logic (simplified: always create new session for transient drivers)
        // In production, might want to reuse driver IDs if we had a proper login.
        // For this requirements: "No registro complejo", "Input de nombre/alias".
        const driver = await prisma.driver.create({
            data: {
                alias,
                campaignId: campaign.id,
            },
        });

        res.json({
            success: true,
            token: driver.id, // Using driver ID as simple token for now
            driverId: driver.id,
            campaignTitle: campaign.title
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getCampaignStatus = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const campaign = await prisma.campaign.findUnique({
            where: { id },
            include: {
                drivers: {
                    include: {
                        locations: {
                            orderBy: { timestamp: 'desc' },
                            take: 1
                        }
                    }
                }
            }
        });
        res.json(campaign);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching campaign' });
    }
}
