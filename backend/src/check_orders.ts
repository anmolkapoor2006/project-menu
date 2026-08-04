import prisma from './prisma';

async function checkOrder() {
  try {
    const order = await prisma.order.findUnique({
      where: { id: 'bf4deeb4-2984-496b-b96c-be077e6db418' },
      include: {
        restaurant: { select: { name: true, slug: true } },
        items: { include: { menuItem: { select: { name: true } } } }
      }
    });

    console.log('--- DB QUERY RESULT FROM MUMBAI DATABASE ---');
    console.log(JSON.stringify(order, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

checkOrder();
