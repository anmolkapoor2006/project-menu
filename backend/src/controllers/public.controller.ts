import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
              where: { isAvailable: true },
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
