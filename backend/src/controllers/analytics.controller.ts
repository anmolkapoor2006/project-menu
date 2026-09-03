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

    // Run ALL queries in parallel — ~5x faster than sequential
    const [events, trendEvents, topItemsData, allOrders, todayOrders, orderItems] = await Promise.all([
      // 1. All QR scan events
      prisma.qRScanEvent.findMany({ where: { restaurantId } }),
      // 2. Last 30-day trend events
      prisma.qRScanEvent.findMany({
        where: { restaurantId, timestamp: { gte: thirtyDaysAgo } },
        orderBy: { timestamp: 'asc' },
      }),
      // 3. Top items by quantity
      prisma.orderItem.groupBy({
        by: ['menuItemId'],
        where: { order: { restaurantId, status: { not: 'CANCELLED' } } },
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      }),
      // 4. All non-cancelled orders with items
      prisma.order.findMany({
        where: { restaurantId, status: { not: 'CANCELLED' } },
        include: { items: true },
      }),
      // 5. Today's orders
      prisma.order.findMany({
        where: { restaurantId, status: { not: 'CANCELLED' }, createdAt: { gte: startOfToday } },
        include: { items: true },
      }),
      // 6. All order items for product breakdown
      prisma.orderItem.findMany({
        where: { order: { restaurantId, status: { not: 'CANCELLED' } } },
        include: { menuItem: { select: { name: true } } },
      }),
    ]);

    // --- Compute metrics ---
    const totalViews = events.length;
    const totalScans = events.filter((e) => e.source === 'qr').length;
    const conversionRate = totalViews > 0 ? parseFloat(((totalScans / totalViews) * 100).toFixed(1)) : 0;
    const totalOrders = allOrders.length;

    const todayEarnings = todayOrders.reduce((sum, order) =>
      sum + order.items.reduce((s, i) => s + Number(i.priceAtOrder) * i.quantity, 0), 0);
    const totalEarnings = allOrders.reduce((sum, order) =>
      sum + order.items.reduce((s, i) => s + Number(i.priceAtOrder) * i.quantity, 0), 0);

    // 30-day trend
    const dailyDataMap = new Map<string, { date: string; views: number; scans: number }>();
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      dailyDataMap.set(dateStr, { date: dateStr, views: 0, scans: 0 });
    }
    trendEvents.forEach((event) => {
      const dateStr = event.timestamp.toISOString().split('T')[0];
      const existing = dailyDataMap.get(dateStr);
      if (existing) {
        if (event.source === 'qr') existing.scans++;
        existing.views++;
      }
    });
    const viewsTrend = Array.from(dailyDataMap.values());

    // Top items
    const topItemDetails = await prisma.menuItem.findMany({
      where: { id: { in: topItemsData.map((d) => d.menuItemId) } },
      select: { id: true, name: true },
    });
    const itemDetailsMap = new Map(topItemDetails.map((item) => [item.id, item.name]));
    const topItems = topItemsData.map((data) => ({
      name: itemDetailsMap.get(data.menuItemId) || 'Unknown Item',
      value: data._sum.quantity || 0,
    }));

    // Product earnings breakdown
    const productMap = new Map<string, { name: string; qtySold: number; totalRevenue: number }>();
    orderItems.forEach((item) => {
      const name = item.menuItem?.name || 'Unknown Item';
      const revenue = Number(item.priceAtOrder) * item.quantity;
      const existing = productMap.get(name);
      if (existing) {
        existing.qtySold += item.quantity;
        existing.totalRevenue += revenue;
      } else {
        productMap.set(name, { name, qtySold: item.quantity, totalRevenue: revenue });
      }
    });
    const productEarnings = Array.from(productMap.values()).sort((a, b) => b.totalRevenue - a.totalRevenue);

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
