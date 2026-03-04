import { Request, Response } from 'express';
import prisma from '../db';

export const ingestLocations = async (req: Request, res: Response): Promise<void> => {
  const { driverId, locations } = req.body;

  if (!driverId || !Array.isArray(locations) || locations.length === 0) {
    res.status(400).json({ error: 'driverId and non-empty locations array required' });
    return;
  }

  try {
    const driver = await prisma.driver.findUnique({ where: { id: driverId } });
    if (!driver) {
      res.status(401).json({ error: 'Invalid driver ID' });
      return;
    }

    const entries = locations.map((loc: any) => ({
      driverId,
      campaignId: driver.campaignId,
      latitude: loc.latitude,
      longitude: loc.longitude,
      accuracy: loc.accuracy ?? null,
      batteryLevel: loc.batteryLevel ?? null,
      timestamp: new Date(loc.timestamp),
      isOfflineSync: loc.isOfflineSync || false,
    }));

    const result = await prisma.location.createMany({ data: entries });

    // Update driver last seen
    await prisma.driver.update({
      where: { id: driverId },
      data: { lastSeenAt: new Date(), isActive: true },
    });

    // Broadcast last location to campaign room via Socket.io
    const lastLoc = entries[entries.length - 1];
    const io = req.app.get('io');
    if (io) {
      io.to(`campaign:${driver.campaignId}`).emit('driver-moved', {
        driverId,
        alias: driver.alias,
        campaignId: driver.campaignId,
        latitude: lastLoc.latitude,
        longitude: lastLoc.longitude,
        accuracy: lastLoc.accuracy,
        batteryLevel: lastLoc.batteryLevel,
        timestamp: lastLoc.timestamp,
      });
    }

    res.json({ success: true, count: result.count });
  } catch (error) {
    console.error('ingestLocations error:', error);
    res.status(500).json({ error: 'Failed to ingest locations' });
  }
};
