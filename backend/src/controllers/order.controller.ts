import { Request, Response } from 'express';
import { OrderStatus } from '@prisma/client';
import prisma from '../prisma';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { getIO } from '../io';
import { z } from 'zod';

const orderItemInputSchema = z.object({
  menuItemId: z.string().min(1, 'Menu item ID is required'),
  quantity: z.preprocess((val) => Number(val), z.number().int().positive('Quantity must be at least 1')),
  notes: z.string().optional().nullable(),
});

const placeOrderSchema = z.object({
  customerName: z.string().min(1, 'Please enter your name so the cafe can call you when ready'),
  tableNumber: z.string().optional().nullable(),
  paymentMethod: z.enum(['COUNTER', 'UPI']).optional().default('COUNTER'),
  items: z.array(orderItemInputSchema).min(1, 'Order must contain at least 1 item'),
});

const updateStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus),
});

// Helper threshold for 15-minute unverified UPI payments
const EXPIRY_MS = 15 * 60 * 1000;

export async function placeOrder(req: Request, res: Response) {
  try {
    const { slug } = req.params;
    const body = placeOrderSchema.parse(req.body);

    const restaurant = await prisma.restaurant.findUnique({
      where: { slug }
    });

    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    if (!restaurant.isAcceptingOrders) {
      return res.status(400).json({ error: 'The kitchen is currently paused and not accepting new orders right now. Please speak to staff.' });
    }

    const initialStatus = body.paymentMethod === 'UPI' 
      ? OrderStatus.PAYMENT_PENDING_VERIFICATION 
      : OrderStatus.RECEIVED;

    // Fetch the menu items from DB scoped to this restaurant
    const uniqueItemIds = Array.from(new Set(body.items.map((i) => i.menuItemId)));
    const dbItems = await prisma.menuItem.findMany({
      where: {
        id: { in: uniqueItemIds },
        category: { restaurantId: restaurant.id }
      }
    });

    // Validate all items exist and belong to this restaurant
    const dbItemsMap = new Map(dbItems.map((item) => [item.id, item]));
    const missingItemId = uniqueItemIds.find((id) => !dbItemsMap.has(id));
    if (missingItemId) {
      return res.status(400).json({ error: 'One or more menu items are unavailable or invalid. Please refresh the menu and try again.' });
    }

    // Build the transaction
    const resultOrder = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          restaurantId: restaurant.id,
          customerName: body.customerName ? body.customerName.trim() : null,
          tableNumber: body.tableNumber ? body.tableNumber.trim() : null,
          paymentMethod: body.paymentMethod || 'COUNTER',
          status: initialStatus,
        }
      });

      const orderItemsData = body.items.map((itemInput) => {
        const menuItem = dbItemsMap.get(itemInput.menuItemId)!;
        return {
          orderId: order.id,
          menuItemId: itemInput.menuItemId,
          quantity: itemInput.quantity,
          priceAtOrder: menuItem.price,
          notes: itemInput.notes || null,
        };
      });

      await tx.orderItem.createMany({
        data: orderItemsData,
      });

      const fullOrder = await tx.order.findUnique({
        where: { id: order.id },
        include: {
          restaurant: {
            select: { id: true, name: true, upiId: true, upiPayeeName: true, upiQrImageUrl: true }
          },
          items: {
            include: {
              menuItem: {
                select: { name: true, imageUrl: true }
              }
            }
          }
        }
      });

      return fullOrder;
    });

    // Notify Cafe Admin via WebSockets
    try {
      const io = getIO();
      io.to(`restaurant_${restaurant.id}`).emit('new_order', resultOrder);
    } catch (wsError) {
      // Socket.io may not be initialized on serverless — non-fatal
    }

    return res.status(201).json({
      message: 'Order placed successfully',
      order: resultOrder,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getOrderById(req: Request, res: Response) {
  try {
    const { id } = req.params;

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        restaurant: {
          select: { id: true, name: true, upiId: true, upiPayeeName: true, upiQrImageUrl: true }
        },
        items: {
          include: {
            menuItem: {
              select: { name: true, imageUrl: true }
            }
          }
        }
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    return res.json({ order });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function isAuthorizedForRestaurant(user: any, restaurantId: string): Promise<boolean> {
  if (!user) return false;
  if (user.role === 'SUPER_ADMIN') return true;
  if (user.restaurantId === restaurantId) return true;
  const userId = user.id || user.userId;
  if (userId) {
    const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
    if (restaurant && restaurant.ownerId === userId) return true;
  }
  return false;
}

export async function getOrders(req: AuthenticatedRequest, res: Response) {
  try {
    const { id: restaurantId } = req.params;

    const isAuth = await isAuthorizedForRestaurant(req.user, restaurantId);
    if (!isAuth) {
      return res.status(403).json({ error: 'Not authorized to view these orders' });
    }

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const orders = await prisma.order.findMany({
      where: { restaurantId },
      orderBy: { createdAt: 'desc' },
      include: {
        restaurant: {
          select: { id: true, name: true, upiId: true, upiPayeeName: true, upiQrImageUrl: true }
        },
        items: {
          include: {
            menuItem: {
              select: { name: true, imageUrl: true }
            }
          }
        }
      }
    });

    return res.json({ orders });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateOrderStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const body = updateStatusSchema.parse(req.body);

    const order = await prisma.order.findUnique({
      where: { id }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const isAuth = await isAuthorizedForRestaurant(req.user, order.restaurantId);
    if (!isAuth) {
      return res.status(403).json({ error: 'Not authorized to modify this order' });
    }

    const updated = await prisma.order.update({
      where: { id },
      data: { status: body.status },
      include: {
        restaurant: {
          select: { id: true, name: true, upiId: true, upiPayeeName: true, upiQrImageUrl: true }
        },
        items: {
          include: {
            menuItem: {
              select: { name: true, imageUrl: true }
            }
          }
        }
      }
    });

    try {
      const io = getIO();
      // Emit update to restaurant room (kitchen dashboard & live tracking)
      io.to(`restaurant_${order.restaurantId}`).emit('order_updated', updated);
      console.log(`[Socket.io] Emitted order_updated to restaurant_${order.restaurantId}:`, updated.id, updated.status);
    } catch (wsError) {
      console.warn('[Socket.io] Could not emit order_updated:', wsError);
    }


    return res.json({ message: 'Order status updated successfully', order: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
