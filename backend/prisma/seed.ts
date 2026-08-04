import { PrismaClient, Role, OrderStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing existing data (cascading deletes will handle relations)...');
  
  // Clean up existing data to allow fresh seeds
  await prisma.user.deleteMany({
    where: {
      email: {
        in: [
          'admin@qrmenu.com',
          'cafe1@qrmenu.com',
          'cafe2@qrmenu.com',
          'sushi@qrmenu.com',
          'burger@qrmenu.com'
        ]
      }
    }
  });

  console.log('Seeding database...');

  const passwordHash = await bcrypt.hash('password123', 10);
  const adminPasswordHash = await bcrypt.hash('AdminPassword123', 10);

  // 1. Create Super Admin
  const superAdmin = await prisma.user.create({
    data: {
      name: 'Super Admin',
      email: 'admin@qrmenu.com',
      passwordHash: adminPasswordHash,
      role: Role.SUPER_ADMIN,
    }
  });
  console.log(`Super Admin created: ${superAdmin.email}`);

  // 2. Define Restaurant Data
  const restaurantsToCreate = [
    {
      admin: {
        name: 'John Doe',
        email: 'cafe1@qrmenu.com',
        passwordHash,
        role: Role.RESTAURANT_ADMIN,
      },
      restaurant: {
        name: 'Cafe Central',
        slug: 'cafe-central',
        address: '123 Main Street, Downtown',
        contactNumber: '1234567890',
        logoUrl: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=500',
        isActive: true,
      },
      menu: [
        {
          category: 'Coffee & Tea',
          displayOrder: 1,
          items: [
            { name: 'Espresso', description: 'Strong, rich, and concentrated black coffee shot.', price: 2.50, isVeg: true, displayOrder: 1, imageUrl: 'https://images.unsplash.com/photo-1510707513156-466fa1f515d3?w=500' },
            { name: 'Cappuccino', description: 'Espresso with steamed milk and thick foam.', price: 3.75, isVeg: true, displayOrder: 2, imageUrl: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=500' },
            { name: 'Iced Matcha Latte', description: 'Premium stone-ground Japanese matcha whisked with cold milk and ice.', price: 4.50, isVeg: true, displayOrder: 3, imageUrl: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=500' }
          ]
        },
        {
          category: 'Bakery & Snacks',
          displayOrder: 2,
          items: [
            { name: 'Butter Croissant', description: 'Flaky, buttery, freshly baked French pastry.', price: 3.00, isVeg: true, displayOrder: 1, imageUrl: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=500' },
            { name: 'Chocolate Chip Muffin', description: 'Moist muffin loaded with rich chocolate chips.', price: 3.50, isVeg: true, displayOrder: 2, imageUrl: 'https://images.unsplash.com/photo-1607958996333-41aef7caefaa?w=500' },
            { name: 'Avocado Sourdough Toast', description: 'Mashed seasoned avocado, cherry tomatoes, and microgreens on toasted sourdough.', price: 8.50, isVeg: true, displayOrder: 3, imageUrl: 'https://images.unsplash.com/photo-1541532713592-79a0317b6b77?w=500' }
          ]
        }
      ]
    },
    {
      admin: {
        name: 'Jane Smith',
        email: 'cafe2@qrmenu.com',
        passwordHash,
        role: Role.RESTAURANT_ADMIN,
      },
      restaurant: {
        name: 'Restro Delight',
        slug: 'restro-delight',
        address: '456 Oak Avenue, Uptown',
        contactNumber: '0987654321',
        logoUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500',
        isActive: true,
      },
      menu: [
        {
          category: 'Appetizers',
          displayOrder: 1,
          items: [
            { name: 'Garlic Bread with Cheese', description: 'Toasted baguette slices brushed with garlic butter and topped with melted mozzarella.', price: 5.50, isVeg: true, displayOrder: 1, imageUrl: 'https://images.unsplash.com/photo-1573140247632-f8fd74997d5c?w=500' },
            { name: 'Buffalo Chicken Wings', description: 'Crispy fried wings tossed in spicy buffalo sauce, served with blue cheese dip.', price: 9.99, isVeg: false, displayOrder: 2, imageUrl: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=500' }
          ]
        },
        {
          category: 'Mains',
          displayOrder: 2,
          items: [
            { name: 'Margherita Wood-Fired Pizza', description: 'Classic pizza with San Marzano tomato sauce, fresh mozzarella, and fresh basil.', price: 12.99, isVeg: true, displayOrder: 1, imageUrl: 'https://images.unsplash.com/photo-1604382355076-af4b0eb60143?w=500' },
            { name: 'Truffle Mushroom Fettuccine', description: 'Fettuccine pasta tossed in creamy wild mushroom sauce with black truffle oil.', price: 16.50, isVeg: true, displayOrder: 2, imageUrl: 'https://images.unsplash.com/photo-1645112411341-6c4fd023714a?w=500' },
            { name: 'Pan-Seared Herb Salmon', description: 'Fresh Atlantic salmon fillet served with asparagus, garlic mashed potatoes, and lemon butter sauce.', price: 21.00, isVeg: false, displayOrder: 3, imageUrl: 'https://images.unsplash.com/photo-1485962398705-ef6a13c41e8f?w=500' }
          ]
        }
      ]
    },
    {
      admin: {
        name: 'Hiroshi Sato',
        email: 'sushi@qrmenu.com',
        passwordHash,
        role: Role.RESTAURANT_ADMIN,
      },
      restaurant: {
        name: 'Sakura Sushi',
        slug: 'sakura-sushi',
        address: '789 Blossom Path, Little Tokyo',
        contactNumber: '5550192837',
        logoUrl: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=500',
        isActive: true,
      },
      menu: [
        {
          category: 'Sushi Rolls',
          displayOrder: 1,
          items: [
            { name: 'California Roll', description: 'Crab mix, avocado, cucumber, rolled with sesame seeds.', price: 7.99, isVeg: false, displayOrder: 1, imageUrl: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=500' },
            { name: 'Spicy Tuna Roll', description: 'Minced spicy tuna, cucumber, topped with spicy mayo and green onions.', price: 8.99, isVeg: false, displayOrder: 2, imageUrl: 'https://images.unsplash.com/photo-1553621042-f6e147245754?w=500' },
            { name: 'Vegetarian Maki', description: 'Asparagus, pickled radish, cucumber, and avocado.', price: 6.50, isVeg: true, displayOrder: 3, imageUrl: 'https://images.unsplash.com/photo-1583623025817-d180a2221d0a?w=500' }
          ]
        },
        {
          category: 'Hot Dishes',
          displayOrder: 2,
          items: [
            { name: 'Chicken Katsu Curry', description: 'Crispy breaded chicken cutlet served with Japanese curry sauce and white rice.', price: 14.50, isVeg: false, displayOrder: 1, imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500' },
            { name: 'Miso Ramen', description: 'Rich miso broth, ramen noodles, soft-boiled egg, bamboo shoots, and green onions.', price: 13.00, isVeg: true, displayOrder: 2, imageUrl: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=500' }
          ]
        }
      ]
    },
    {
      admin: {
        name: 'Bob Miller',
        email: 'burger@qrmenu.com',
        passwordHash,
        role: Role.RESTAURANT_ADMIN,
      },
      restaurant: {
        name: 'Burger Bunker',
        slug: 'burger-bunker',
        address: '321 Grill Lane, Westside',
        contactNumber: '5559876543',
        logoUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500',
        isActive: true,
      },
      menu: [
        {
          category: 'Gourmet Burgers',
          displayOrder: 1,
          items: [
            { name: 'Classic Bacon Cheeseburger', description: 'Angus beef patty, cheddar, crispy bacon, lettuce, tomato, bunker sauce, toasted brioche bun.', price: 10.99, isVeg: false, displayOrder: 1, imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500' },
            { name: 'BBQ Pulled Pork Burger', description: 'Slow-cooked pulled pork, tangy BBQ sauce, coleslaw, onion rings, brioche bun.', price: 12.50, isVeg: false, displayOrder: 2, imageUrl: 'https://images.unsplash.com/photo-1625813506062-0aeb1d7a094b?w=500' },
            { name: 'Beyond Truffle Burger', description: 'Plant-based Beyond patty, truffle aioli, wild arugula, caramelized onions, vegan cheese.', price: 13.50, isVeg: true, displayOrder: 3, imageUrl: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=500' }
          ]
        },
        {
          category: 'Sides & Fries',
          displayOrder: 2,
          items: [
            { name: 'Loaded Waffle Fries', description: 'Crispy waffle fries smothered in liquid cheddar, sour cream, and chives.', price: 5.50, isVeg: true, displayOrder: 1, imageUrl: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=500' },
            { name: 'Crispy Onion Rings', description: 'Beer-battered onion rings fried golden brown, served with chipotle ranch.', price: 4.50, isVeg: true, displayOrder: 2, imageUrl: 'https://images.unsplash.com/photo-1639024471283-2bc7b3c6a267?w=500' }
          ]
        }
      ]
    }
  ];

  const currentDate = new Date();

  for (const item of restaurantsToCreate) {
    // A. Create Restaurant Admin User
    const user = await prisma.user.create({
      data: {
        name: item.admin.name,
        email: item.admin.email,
        passwordHash: item.admin.passwordHash,
        role: item.admin.role,
      }
    });

    // B. Create Restaurant owned by this user
    const restaurant = await prisma.restaurant.create({
      data: {
        ...item.restaurant,
        ownerId: user.id,
      }
    });

    console.log(`Restaurant created: "${restaurant.name}" owned by ${user.email}`);

    // C. Populate Menu Categories & Items
    const menuItemsList: any[] = [];
    for (const catData of item.menu) {
      const category = await prisma.menuCategory.create({
        data: {
          restaurantId: restaurant.id,
          name: catData.category,
          displayOrder: catData.displayOrder,
        }
      });

      for (const itemData of catData.items) {
        const menuItem = await prisma.menuItem.create({
          data: {
            categoryId: category.id,
            name: itemData.name,
            description: itemData.description,
            price: itemData.price,
            isVeg: itemData.isVeg,
            displayOrder: itemData.displayOrder,
            imageUrl: itemData.imageUrl,
            isAvailable: true,
          }
        });
        menuItemsList.push(menuItem);
      }
    }

    // D. Simulate Analytics: QRScanEvents over the last 30 days
    console.log(`  Generating historical scan events for "${restaurant.name}"...`);
    const scanEventsData: any[] = [];
    for (let day = 0; day < 30; day++) {
      const date = new Date(currentDate);
      date.setDate(date.getDate() - day);
      
      // Random number of scans per day: 1 to 15
      const scansCount = Math.floor(Math.random() * 15) + 1;
      for (let s = 0; s < scansCount; s++) {
        // Distribute hours randomly
        const eventDate = new Date(date);
        eventDate.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));
        
        scanEventsData.push({
          restaurantId: restaurant.id,
          source: Math.random() > 0.3 ? 'qr' : 'direct_link',
          userAgent: Math.random() > 0.5 
            ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1'
            : 'Mozilla/5.0 (Linux; Android 13; SM-S901B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36',
          timestamp: eventDate,
        });
      }
    }
    await prisma.qRScanEvent.createMany({
      data: scanEventsData,
    });

    // E. Simulate Orders over the last 30 days
    console.log(`  Generating historical orders for "${restaurant.name}"...`);
    const statuses = [OrderStatus.SERVED, OrderStatus.SERVED, OrderStatus.SERVED, OrderStatus.SERVED, OrderStatus.CANCELLED];
    const tableNumbers = ['T1', 'T2', 'T3', 'T4', 'Bar 1', 'Table 12'];

    for (let orderIndex = 0; orderIndex < 25; orderIndex++) {
      const date = new Date(currentDate);
      date.setDate(date.getDate() - Math.floor(Math.random() * 30));
      date.setHours(Math.floor(Math.random() * 14) + 10, Math.floor(Math.random() * 60)); // Open 10 AM to 12 AM

      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const tableNumber = tableNumbers[Math.floor(Math.random() * tableNumbers.length)];

      const order = await prisma.order.create({
        data: {
          restaurantId: restaurant.id,
          tableNumber,
          status,
          createdAt: date,
          updatedAt: date,
        }
      });

      // Add 1 to 4 random menu items to this order
      const itemsCount = Math.floor(Math.random() * 4) + 1;
      const selectedItems = [...menuItemsList].sort(() => 0.5 - Math.random()).slice(0, itemsCount);
      
      const orderItemsData = selectedItems.map((menuItem) => ({
        orderId: order.id,
        menuItemId: menuItem.id,
        quantity: Math.floor(Math.random() * 3) + 1,
        priceAtOrder: menuItem.price,
        notes: Math.random() > 0.8 ? 'No onions, please.' : null,
        createdAt: date,
      }));

      await prisma.orderItem.createMany({
        data: orderItemsData,
      });
    }
  }

  console.log('Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
