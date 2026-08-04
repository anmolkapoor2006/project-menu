import { Response } from 'express';
import prisma from '../prisma';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export async function getRestaurantAnalytics(req: AuthenticatedRequest, res: Response) {
  try {
    const { id: restaurantId } = req.params;

    if (!req.user || (req.user.role !== 'SUPER_ADMIN' && req.user.restaurantId !== restaurantId)) {
      return res.status(403).json({ error: 'Not authorized to view these analytics' });
    }

    // 1. Fetch total views & scans
    const events = await prisma.qRScanEvent.findMany({
      where: { restaurantId }
    });

    const totalViews = events.length;
    const totalScans = events.filter((e) => e.source === 'qr').length;
    const conversionRate = totalViews > 0 ? parseFloat(((totalScans / totalViews) * 100).toFixed(1)) : 0;

    // 2. Fetch daily view trend (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const trendEvents = await prisma.qRScanEvent.findMany({
      where: {
        restaurantId,
        timestamp: { gte: thirtyDaysAgo }
      },
      orderBy: { timestamp: 'asc' }
    });

    // Group trendEvents by day
    const dailyDataMap = new Map<string, { date: string; views: number; scans: number }>();
    // Pre-populate last 30 days with 0s
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
        if (event.source === 'qr') {
          existing.scans++;
        }
        existing.views++;
      }
    });

    const viewsTrend = Array.from(dailyDataMap.values());

    // 3. Top items sold
    const topItemsData = await prisma.orderItem.groupBy({
      by: ['menuItemId'],
      where: {
        order: { restaurantId, status: { not: 'CANCELLED' } }
      },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5,
    });

    const topItemDetails = await prisma.menuItem.findMany({
      where: {
        id: { in: topItemsData.map((d) => d.menuItemId) }
      },
      select: { id: true, name: true }
    });

    const itemDetailsMap = new Map(topItemDetails.map((item) => [item.id, item.name]));

    const topItems = topItemsData.map((data) => ({
      name: itemDetailsMap.get(data.menuItemId) || 'Unknown Item',
      value: data._sum.quantity || 0
    }));

    // 4. Calculate Earnings (Today & All Time)
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const todayOrders = await prisma.order.findMany({
      where: {
        restaurantId,
        status: { not: 'CANCELLED' },
        createdAt: { gte: startOfToday }
      },
      include: {
        items: true
      }
    });

    const todayEarnings = todayOrders.reduce((sum, order) => {
      const orderTotal = order.items.reduce((itemSum, item) => itemSum + (Number(item.priceAtOrder) * item.quantity), 0);
      return sum + orderTotal;
    }, 0);

    const allOrders = await prisma.order.findMany({
      where: {
        restaurantId,
        status: { not: 'CANCELLED' }
      },
      include: {
        items: true
      }
    });

    const totalEarnings = allOrders.reduce((sum, order) => {
      const orderTotal = order.items.reduce((itemSum, item) => itemSum + (Number(item.priceAtOrder) * item.quantity), 0);
      return sum + orderTotal;
    }, 0);

    // 5. Per-Product Earnings Breakdown
    const orderItems = await prisma.orderItem.findMany({
      where: {
        order: {
          restaurantId,
          status: { not: 'CANCELLED' }
        }
      },
      include: {
        menuItem: {
          select: { name: true }
        }
      }
    });

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

    // 6. Total orders count
    const totalOrders = allOrders.length;

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
