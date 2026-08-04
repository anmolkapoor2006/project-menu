import prisma from './prisma';
import * as bcrypt from 'bcryptjs';

async function seedUser() {
  try {
    let user = await prisma.user.findUnique({
      where: { email: 'sunil212127@gmail.com' }
    });

    const passwordHash = await bcrypt.hash('123456', 10);

    if (!user) {
      user = await prisma.user.create({
        data: {
          name: 'anmol kapoor',
          email: 'sunil212127@gmail.com',
          passwordHash,
          role: 'RESTAURANT_ADMIN',
        }
      });
      console.log('Created user sunil212127@gmail.com');
    }

    let rest = await prisma.restaurant.findFirst({
      where: { ownerId: user.id }
    });

    if (!rest) {
      rest = await prisma.restaurant.create({
        data: {
          name: "anmol's cafe",
          slug: "anmols-cafe",
          ownerId: user.id,
          contactNumber: '9261444707',
          address: 'Main Market, City Center',
          logoUrl: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=500',
          isActive: true,
          isAcceptingOrders: true
        }
      });
      console.log("Created restaurant anmol's cafe");

      const cat1 = await prisma.menuCategory.create({
        data: {
          name: 'Hot Drinks & Coffee',
          restaurantId: rest.id,
          displayOrder: 1,
        }
      });

      await prisma.menuItem.createMany({
        data: [
          {
            categoryId: cat1.id,
            name: 'Special Cappuccino',
            description: 'Freshly ground arabica beans with steamed foaming milk.',
            price: '149.00',
            isVeg: true,
            isAvailable: true,
            badge: 'bestseller',
            imageUrl: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=500',
            displayOrder: 1,
          },
          {
            categoryId: cat1.id,
            name: 'Hot Chocolate Fudge',
            description: 'Rich dark chocolate syrup blended with steaming milk.',
            price: '179.00',
            isVeg: true,
            isAvailable: true,
            badge: 'popular',
            imageUrl: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=500',
            displayOrder: 2,
          }
        ]
      });
    }

    console.log('Successfully configured user sunil212127@gmail.com and anmol\'s cafe in Mumbai DB!');

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

seedUser();
