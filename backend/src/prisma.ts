import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? [] : ['error'],
    // Reduce connection pool size for serverless — Neon handles pooling
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

// In serverless environments, reuse the client across hot invocations
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
