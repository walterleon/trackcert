import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import prisma from '../db';
import { AuthRequest } from '../middleware/auth';

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

// ─── Company: delete photo ──────────────────────────────────────────────────

export const deletePhoto = async (req: AuthRequest, res: Response): Promise<void> => {
  const { campaignId, photoId } = req.params;
  const companyId = req.company!.companyId;

  try {
    const photo = await prisma.photo.findFirst({
      where: { id: photoId, campaignId, companyId },
    });

    if (!photo) {
      res.status(404).json({ error: 'Photo not found' });
      return;
    }

    // Delete file from disk
    const filePath = photo.filePath || path.join(process.cwd(), 'uploads', path.basename(photo.fileUrl));
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (fsErr) {
      console.error('deletePhoto: failed to remove file', filePath, fsErr);
    }

    // Delete from database
    await prisma.photo.delete({ where: { id: photoId } });

    res.json({ success: true });
  } catch (error) {
    console.error('deletePhoto error:', error);
    res.status(500).json({ error: 'Failed to delete photo' });
  }
};
