import { Request, Response } from 'express';
import prisma from '../db';

export const uploadPhoto = async (req: Request, res: Response): Promise<void> => {
  const { driverId, latitude, longitude, accuracy } = req.body;
  const file = req.file;

  if (!file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }
  if (!driverId || latitude === undefined || longitude === undefined) {
    res.status(400).json({ error: 'driverId, latitude and longitude are required' });
    return;
  }

  try {
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      include: { campaign: true },
    });

    if (!driver) {
      res.status(401).json({ error: 'Invalid driver' });
      return;
    }

    const fileUrl = `/uploads/${file.filename}`;

    const photo = await prisma.photo.create({
      data: {
        driverId,
        campaignId: driver.campaignId,
        companyId: driver.campaign.companyId,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        accuracy: accuracy != null ? parseFloat(accuracy) : undefined,
        filePath: file.path,
        fileUrl,
      },
    });

    // Update driver last seen
    await prisma.driver.update({
      where: { id: driverId },
      data: { lastSeenAt: new Date() },
    });

    // Notify campaign room in real time
    const io = req.app.get('io');
    if (io) {
      io.to(`campaign:${driver.campaignId}`).emit('photo-uploaded', {
        driverId,
        alias: driver.alias,
        photo: { ...photo },
      });
    }

    res.json({ success: true, photo });
  } catch (error) {
    console.error('uploadPhoto error:', error);
    res.status(500).json({ error: 'Failed to upload photo' });
  }
};
