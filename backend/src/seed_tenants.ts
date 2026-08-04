import prisma from './prisma';

async function seedTenants() {
  try {
    // 1. Create or find owner for the-daily-roast
    let userA = await prisma.user.findUnique({ where: { email: 'anmol@thedailyroast.com' } });
    if (!userA) {
      userA = await prisma.user.create({
        data: {
          name: 'Anmol Kapoor',
          email: 'anmol@thedailyroast.com',
          passwordHash: '$2a$10$eZ9Lz6rJz3O9v2Xz.yGz.eXz.yGz.eXz.yGz.eXz.yGz.eXz.yGz.',
          role: 'RESTAURANT_ADMIN',
        }
      });
    }

    let restA = await prisma.restaurant.findUnique({ where: { slug: 'the-daily-roast' } });
    if (!restA) {
      restA = await prisma.restaurant.create({
        data: {
          name: 'The Daily Roast Cafe',
          slug: 'the-daily-roast',
          ownerId: userA.id,
          contactNumber: '9876543210',
          address: '42 MG Road, Indiranagar, Bengaluru',
          logoUrl: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=500',
        }
      });

      const cat1 = await prisma.menuCategory.create({
        data: {
          name: 'Artisanal Coffee & Pizzas',
          restaurantId: restA.id,
          displayOrder: 1,
        }
      });

      await prisma.menuItem.createMany({
        data: [
          {
            categoryId: cat1.id,
            name: 'Classic OTC Pizza',
            description: 'Onion, Tomato, Capsicum with melted mozzarella cheese.',
            price: '299.00',
            isVeg: true,
            isAvailable: true,
            badge: 'bestseller',
            imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500',
            displayOrder: 1,
          },
          {
            categoryId: cat1.id,
            name: 'Hazelnut Cold Coffee',
            description: 'Double shot espresso blended with hazelnut syrup and ice cream.',
            price: '189.00',
            isVeg: true,
            isAvailable: true,
            badge: 'special',
            imageUrl: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=500',
            displayOrder: 2,
          }
        ]
      });
    }

    // 2. Create or find owner for pizza-corner
    let userB = await prisma.user.findUnique({ where: { email: 'sunil@pizzacorner.com' } });
    if (!userB) {
      userB = await prisma.user.create({
        data: {
          name: 'Sunil Kumar',
          email: 'sunil@pizzacorner.com',
          passwordHash: '$2a$10$eZ9Lz6rJz3O9v2Xz.yGz.eXz.yGz.eXz.yGz.eXz.yGz.eXz.yGz.',
          role: 'RESTAURANT_ADMIN',
        }
      });
    }

    let restB = await prisma.restaurant.findUnique({ where: { slug: 'pizza-corner' } });
    if (!restB) {
      restB = await prisma.restaurant.create({
        data: {
          name: 'Pizza Corner Express',
          slug: 'pizza-corner',
          ownerId: userB.id,
          contactNumber: '9123456789',
          address: '15 Park Street, Connaught Place, New Delhi',
          logoUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500',
        }
      });

      const cat2 = await prisma.menuCategory.create({
        data: {
          name: 'Gourmet Pizzas',
          restaurantId: restB.id,
          displayOrder: 1,
        }
      });

      await prisma.menuItem.createMany({
        data: [
          {
            categoryId: cat2.id,
            name: 'Pepperoni Feast Pizza',
            description: 'Loaded with double spicy pepperoni and extra cheese.',
            price: '449.00',
            isVeg: false,
            isAvailable: true,
            badge: 'bestseller',
            imageUrl: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=500',
            displayOrder: 1,
          }
        ]
      });
    }

    console.log('Successfully seeded the-daily-roast & pizza-corner into Mumbai DB!');

  } catch (err) {
    console.error('Error seeding specific tenants:', err);
  } finally {
    await prisma.$disconnect();
  }
}

seedTenants();
