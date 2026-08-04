import prisma from './prisma';

async function check() {
  try {
    const restaurants = await prisma.restaurant.findMany({
      include: {
        categories: {
          include: {
            items: true
          }
        }
      }
    });

    console.log('--- RESTAURANTS IN MUMBAI DB ---');
    console.log(JSON.stringify(restaurants.map(r => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      categoriesCount: r.categories.length,
      itemsCount: r.categories.reduce((acc, c) => acc + c.items.length, 0),
      sampleItemImage: r.categories[0]?.items[0]?.imageUrl || 'none'
    })), null, 2));

    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true }
    });
    console.log('--- USERS IN MUMBAI DB ---');
    console.log(JSON.stringify(users, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

check();
