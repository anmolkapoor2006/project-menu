import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Create Super Admin
  const adminEmail = 'admin@qrmenu.com';
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail }
  });

  if (!existingAdmin) {
    const adminPasswordHash = await bcrypt.hash('AdminPassword123', 10);
    const superAdmin = await prisma.user.create({
      data: {
        name: 'Super Admin',
        email: adminEmail,
        passwordHash: adminPasswordHash,
        role: Role.SUPER_ADMIN,
      }
    });
    console.log(`Super Admin created: ${superAdmin.email}`);
  } else {
    console.log('Super Admin already exists.');
  }

  // 2. Create Restaurant Admins and Restaurants
  const cafeAdmin1Email = 'cafe1@qrmenu.com';
  const existingCafeAdmin1 = await prisma.user.findUnique({
    where: { email: cafeAdmin1Email }
  });

  if (!existingCafeAdmin1) {
    const cafeAdmin1PasswordHash = await bcrypt.hash('password123', 10);
    const user1 = await prisma.user.create({
      data: {
        name: 'John Doe',
        email: cafeAdmin1Email,
        passwordHash: cafeAdmin1PasswordHash,
        role: Role.RESTAURANT_ADMIN,
        restaurants: {
          create: {
            name: 'Cafe Central',
            slug: 'cafe-central',
            address: '123 Main Street',
            contactNumber: '1234567890',
            isActive: true,
          }
        }
      }
    });
    console.log(`Restaurant Admin 1 & Restaurant created: ${user1.email}`);
  }

  const cafeAdmin2Email = 'cafe2@qrmenu.com';
  const existingCafeAdmin2 = await prisma.user.findUnique({
    where: { email: cafeAdmin2Email }
  });

  if (!existingCafeAdmin2) {
    const cafeAdmin2PasswordHash = await bcrypt.hash('password123', 10);
    const user2 = await prisma.user.create({
      data: {
        name: 'Jane Smith',
        email: cafeAdmin2Email,
        passwordHash: cafeAdmin2PasswordHash,
        role: Role.RESTAURANT_ADMIN,
        restaurants: {
          create: {
            name: 'Restro Delight',
            slug: 'restro-delight',
            address: '456 Oak Avenue',
            contactNumber: '0987654321',
            isActive: true,
          }
        }
      }
    });
    console.log(`Restaurant Admin 2 & Restaurant created: ${user2.email}`);
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
