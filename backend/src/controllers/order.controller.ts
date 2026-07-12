import { Request, Response } from 'express';
import { PrismaClient, OrderStatus } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { getIO } from '../io';
import { z } from 'zod';

const prisma = new PrismaClient();

const orderItemInputSchema = z.object({
  menuItemId: z.string().uuid(),
  quantity: z.number().int().positive(),
  notes: z.string().optional().nullable(),
});

const placeOrderSchema = z.object({
  tableNumber: z.string().optional().nullable(),
  items: z.array(orderItemInputSchema).min(1, 'Order must contain at least 1 item'),
});

const updateStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus),
});

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

    // Fetch the menu items from the DB to get official prices
    const menuItemIds = body.items.map((i) => i.menuItemId);
    const dbItems = await prisma.menuItem.findMany({
      where: { id: { in: menuItemIds } }
    });

    const dbItemsMap = new Map(dbItems.map((item) => [item.id, item]));

    // Build the transactions
    const resultOrder = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          restaurantId: restaurant.id,
          tableNumber: body.tableNumber || null,
          status: OrderStatus.RECEIVED,
        }
      });

      const orderItemsData = body.items.map((itemInput) => {
        const menuItem = dbItemsMap.get(itemInput.menuItemId);
        if (!menuItem) {
          throw new Error(`Menu item not found for ID: ${itemInput.menuItemId}`);
        }
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
      console.error('Failed to emit WebSocket event', wsError);
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
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' });
  }
}

export async function getOrders(req: AuthenticatedRequest, res: Response) {
  try {
    const { id: restaurantId } = req.params;

    if (!req.user || (req.user.role !== 'SUPER_ADMIN' && req.user.restaurantId !== restaurantId)) {
      return res.status(403).json({ error: 'Not authorized to view these orders' });
    }

    const orders = await prisma.order.findMany({
      where: { restaurantId },
      orderBy: { createdAt: 'desc' },
      include: {
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

    if (!req.user || (req.user.role !== 'SUPER_ADMIN' && req.user.restaurantId !== order.restaurantId)) {
      return res.status(403).json({ error: 'Not authorized to modify this order' });
    }

    const updated = await prisma.order.update({
      where: { id },
      data: { status: body.status },
      include: {
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
      io.to(`restaurant_${order.restaurantId}`).emit('order_updated', updated);
    } catch (wsError) {
      console.error(wsError);
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
