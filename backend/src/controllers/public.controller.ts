import { Request, Response } from 'express';
import prisma from '../prisma';
import { getIO } from '../io';

export async function getPublicMenu(req: Request, res: Response) {
  try {
    const { slug } = req.params;

    const restaurant = await prisma.restaurant.findUnique({
      where: { slug, isActive: true },
      include: {
        categories: {
          orderBy: { displayOrder: 'asc' },
          include: {
            items: {
              orderBy: { displayOrder: 'asc' },
            },
          },
        },
      },
    });

    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found or inactive' });
    }

    return res.json({ restaurant });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function logViewEvent(req: Request, res: Response) {
  try {
    const { slug } = req.params;
    const { src } = req.query;

    const restaurant = await prisma.restaurant.findUnique({
      where: { slug },
    });

    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    const source = src === 'qr' ? 'qr' : 'direct_link';
    const userAgent = req.headers['user-agent'] || null;

    const scanEvent = await prisma.qRScanEvent.create({
      data: {
        restaurantId: restaurant.id,
        source,
        userAgent,
      },
    });

    return res.status(201).json({ message: 'View event logged successfully', event: scanEvent });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function callStaff(req: Request, res: Response) {
  try {
    const { slug } = req.params;
    const { tableNumber, requestType } = req.body;

    const restaurant = await prisma.restaurant.findUnique({
      where: { slug }
    });

    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    try {
      const io = getIO();
      io.to(`restaurant_${restaurant.id}`).emit('staff_call', {
        tableNumber: tableNumber || 'Counter',
        requestType: requestType || 'Call Waiter',
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Socket emit staff_call warning:', e);
    }

    return res.json({ message: 'Staff notified successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
