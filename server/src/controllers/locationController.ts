import { Request, Response } from 'express';
import prisma from '../db';

export const ingestLocations = async (req: Request, res: Response) => {
    const { driverId, locations } = req.body; // locations is array of points

    try {
        // Validate driver exists
        const driver = await prisma.driver.findUnique({
            where: { id: driverId }
        });

        if (!driver) return res.status(401).json({ error: 'Invalid Driver ID' });

        // Bulk insert
        // locations structure: { lat, lng, acc, batt, ts, isOffline }
        const entries = locations.map((loc: any) => ({
            driverId,
            campaignId: driver.campaignId,
            latitude: loc.latitude,
            longitude: loc.longitude,
            accuracy: loc.accuracy,
            batteryLevel: loc.batteryLevel,
            timestamp: new Date(loc.timestamp),
            isOfflineSync: loc.isOfflineSync || false
        }));

        const result = await prisma.location.createMany({
            data: entries
        });

        res.json({ success: true, count: result.count });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to ingest locations' });
    }
};
