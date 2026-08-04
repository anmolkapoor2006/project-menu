import { Response } from 'express';
import prisma from '../prisma';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export async function createAnnouncement(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user || req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Super Admin access required to create broadcasts' });
    }

    const { message, type } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Announcement message is required' });
    }

    // Deactivate previous active broadcasts
    try {
      await prisma.announcement.updateMany({
        where: { isActive: true },
        data: { isActive: false }
      });
    } catch (e) {
      console.warn('Deactivate previous announcement warning:', e);
    }

    const announcement = await prisma.announcement.create({
      data: {
        message,
        type: type || 'INFO',
        isActive: true,
      }
    });

    return res.status(201).json({ message: 'Broadcast announcement created', announcement });
  } catch (error: any) {
    console.error('Failed to create announcement:', error);
    return res.status(500).json({ error: error?.message || 'Failed to create announcement in database' });
  }
}

export async function getActiveAnnouncement(req: any, res: Response) {
  try {
    const announcement = await prisma.announcement.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({ announcement: announcement || null });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function deleteAnnouncement(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user || req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Super Admin access required' });
    }

    const { id } = req.params;
    await prisma.announcement.delete({ where: { id } });

    return res.json({ message: 'Announcement deleted successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
