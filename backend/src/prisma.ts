import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? [] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

// Cache in globalThis for ALL environments — prevents new client creation
// on Vercel warm invocations (multiple requests share one Node.js process)
globalForPrisma.prisma = prisma;

export default prisma;

