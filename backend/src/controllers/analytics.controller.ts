import { Response } from 'express';
import prisma from '../prisma';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

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

export async function getRestaurantAnalytics(req: AuthenticatedRequest, res: Response) {
  try {
    const { id: restaurantId } = req.params;

    const isAuth = await isAuthorizedForRestaurant(req.user, restaurantId);
    if (!isAuth) {
      return res.status(403).json({ error: 'Not authorized to view these analytics' });
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // Run only 2 lean queries in parallel instead of 6 redundant round-trips
    const [events, nonCancelledOrders] = await Promise.all([
      // 1. All QR scan events with lean columns
      prisma.qRScanEvent.findMany({
        where: { restaurantId },
        select: { source: true, timestamp: true },
      }),
      // 2. All non-cancelled orders with order items and menu item names
      prisma.order.findMany({
        where: { restaurantId, status: { not: 'CANCELLED' } },
        select: {
          createdAt: true,
          items: {
            select: {
              quantity: true,
              priceAtOrder: true,
              menuItem: {
                select: { id: true, name: true }
              }
            }
          }
        },
      }),
    ]);

    // --- Compute metrics in single-pass memory (sub-millisecond) ---
    const totalViews = events.length;
    let totalScans = 0;
    const dailyDataMap = new Map<string, { date: string; views: number; scans: number }>();
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      dailyDataMap.set(dateStr, { date: dateStr, views: 0, scans: 0 });
    }

    events.forEach((event) => {
      const isQr = event.source === 'qr';
      if (isQr) totalScans++;
      if (event.timestamp >= thirtyDaysAgo) {
        const dateStr = event.timestamp.toISOString().split('T')[0];
        const entry = dailyDataMap.get(dateStr);
        if (entry) {
          if (isQr) entry.scans++;
          entry.views++;
        }
      }
    });

    const conversionRate = totalViews > 0 ? parseFloat(((totalScans / totalViews) * 100).toFixed(1)) : 0;
    const totalOrders = nonCancelledOrders.length;

    let todayEarnings = 0;
    let totalEarnings = 0;
    const productMap = new Map<string, { name: string; qtySold: number; totalRevenue: number }>();
    const topItemQtyMap = new Map<string, { name: string; quantity: number }>();

    for (const order of nonCancelledOrders) {
      const isToday = order.createdAt >= startOfToday;
      let orderTotal = 0;

      for (const item of order.items) {
        const revenue = Number(item.priceAtOrder) * item.quantity;
        orderTotal += revenue;

        const itemName = item.menuItem?.name || 'Unknown Item';
        const existingProd = productMap.get(itemName);
        if (existingProd) {
          existingProd.qtySold += item.quantity;
          existingProd.totalRevenue += revenue;
        } else {
          productMap.set(itemName, { name: itemName, qtySold: item.quantity, totalRevenue: revenue });
        }

        const itemId = item.menuItem?.id || itemName;
        const existingTop = topItemQtyMap.get(itemId);
        if (existingTop) {
          existingTop.quantity += item.quantity;
        } else {
          topItemQtyMap.set(itemId, { name: itemName, quantity: item.quantity });
        }
      }

      totalEarnings += orderTotal;
      if (isToday) {
        todayEarnings += orderTotal;
      }
    }

    const viewsTrend = Array.from(dailyDataMap.values());
    const productEarnings = Array.from(productMap.values()).sort((a, b) => b.totalRevenue - a.totalRevenue);
    const topItems = Array.from(topItemQtyMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5)
      .map((t) => ({ name: t.name, value: t.quantity }));

    res.setHeader('Cache-Control', 'private, max-age=5, stale-while-revalidate=15');

    return res.json({
      summary: {
        totalViews,
        totalScans,
        conversionRate,
        totalOrders,
        todayEarnings: parseFloat(todayEarnings.toFixed(2)),
        totalEarnings: parseFloat(totalEarnings.toFixed(2)),
      },
      viewsTrend,
      topItems,
      productEarnings,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getPlatformAnalytics(req: AuthenticatedRequest, res: Response) {

  try {
    if (!req.user || req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Access denied. Super Admin role required.' });
    }

    // 1. Core platform metrics & total revenue
    const totalRestaurants = await prisma.restaurant.count();
    const totalViews = await prisma.qRScanEvent.count();
    const totalScans = await prisma.qRScanEvent.count({ where: { source: 'qr' } });
    
    const allPlatformOrders = await prisma.order.findMany({
      where: { status: { not: 'CANCELLED' } },
      include: { items: true }
    });

    const totalOrders = allPlatformOrders.length;
    const totalPlatformRevenue = allPlatformOrders.reduce((sum, order) => {
      const orderTotal = order.items.reduce((itemSum, i) => itemSum + (Number(i.priceAtOrder) * i.quantity), 0);
      return sum + orderTotal;
    }, 0);

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const todayPlatformOrders = allPlatformOrders.filter(o => new Date(o.createdAt) >= startOfToday);
    const todayPlatformRevenue = todayPlatformOrders.reduce((sum, order) => {
      const orderTotal = order.items.reduce((itemSum, i) => itemSum + (Number(i.priceAtOrder) * i.quantity), 0);
      return sum + orderTotal;
    }, 0);

    const averageOrderValue = totalOrders > 0 ? parseFloat((totalPlatformRevenue / totalOrders).toFixed(2)) : 0;

    // 2. Restaurants details listing with per-cafe revenue
    const restaurants = await prisma.restaurant.findMany({
      include: {
        owner: {
          select: { email: true, name: true }
        },
        orders: {
          where: { status: { not: 'CANCELLED' } },
          include: { items: true }
        },
        _count: {
          select: { scanEvents: true, orders: true, categories: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const restaurantsList = restaurants.map((r) => {
      const cafeRevenue = r.orders.reduce((sum, order) => {
        const orderTotal = order.items.reduce((itemSum, i) => itemSum + (Number(i.priceAtOrder) * i.quantity), 0);
        return sum + orderTotal;
      }, 0);

      return {
        id: r.id,
        name: r.name,
        slug: r.slug,
        ownerEmail: r.owner.email,
        ownerName: r.owner.name,
        isActive: r.isActive,
        isAcceptingOrders: r.isAcceptingOrders,
        createdAt: r.createdAt,
        viewsCount: r._count.scanEvents,
        ordersCount: r._count.orders,
        revenue: parseFloat(cafeRevenue.toFixed(2)),
      };
    });

    // 3. Platform traffic trend (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const events = await prisma.qRScanEvent.findMany({
      where: { timestamp: { gte: thirtyDaysAgo } },
      orderBy: { timestamp: 'asc' }
    });

    const dailyDataMap = new Map<string, { date: string; views: number; scans: number }>();
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      dailyDataMap.set(dateStr, { date: dateStr, views: 0, scans: 0 });
    }

    events.forEach((event) => {
      const dateStr = event.timestamp.toISOString().split('T')[0];
      const existing = dailyDataMap.get(dateStr);
      if (existing) {
        if (event.source === 'qr') {
          existing.scans++;
        }
        existing.views++;
      }
    });

    const platformTrend = Array.from(dailyDataMap.values());

    return res.json({
      summary: {
        totalRestaurants,
        totalViews,
        totalScans,
        totalOrders,
        totalPlatformRevenue: parseFloat(totalPlatformRevenue.toFixed(2)),
        todayPlatformRevenue: parseFloat(todayPlatformRevenue.toFixed(2)),
        averageOrderValue,
      },
      restaurants: restaurantsList,
      trafficTrend: platformTrend,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
