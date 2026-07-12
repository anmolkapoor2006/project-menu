import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import QRCode from 'qrcode';
import { z } from 'zod';

const prisma = new PrismaClient();

const updateRestaurantSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  address: z.string().optional(),
  contactNumber: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function updateRestaurant(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    
    // Check permission
    if (!req.user || (req.user.role !== 'SUPER_ADMIN' && req.user.restaurantId !== id)) {
      return res.status(403).json({ error: 'You are not authorized to update this restaurant' });
    }

    const body = updateRestaurantSchema.parse(req.body);
    const logoUrl = req.file ? `/uploads/${req.file.filename}` : undefined;

    const existing = await prisma.restaurant.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    const updateData: any = { ...body };
    if (logoUrl) {
      updateData.logoUrl = logoUrl;
    }

    const updated = await prisma.restaurant.update({
      where: { id },
      data: updateData,
    });

    return res.json({
      message: 'Restaurant profile updated successfully',
      restaurant: updated,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getQRCode(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;

    // Check permission
    if (!req.user || (req.user.role !== 'SUPER_ADMIN' && req.user.restaurantId !== id)) {
      return res.status(403).json({ error: 'You are not authorized to view this QR code' });
    }

    const restaurant = await prisma.restaurant.findUnique({ where: { id } });
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const publicUrl = `${frontendUrl}/menu/${restaurant.slug}?src=qr`;

    const qrDataUrl = await QRCode.toDataURL(publicUrl, {
      width: 512,
      margin: 2,
      color: {
        dark: '#1e1b4b',
        light: '#ffffff',
      },
    });

    return res.json({
      qrCodeUrl: qrDataUrl,
      publicUrl,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
