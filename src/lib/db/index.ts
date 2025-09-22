/**
 * Database connection with Prisma Client
 * Optimized for production with connection pooling
 */

import { PrismaClient } from '@prisma/client';
// Optional Neon dependencies for production
let Pool: any;
let PrismaNeon: any;

try {
  const neonServerless = require('@neondatabase/serverless');
  const prismaAdapterNeon = require('@prisma/adapter-neon');
  Pool = neonServerless.Pool;
  PrismaNeon = prismaAdapterNeon.PrismaNeon;
} catch (error) {
  // Neon dependencies not available
  Pool = null;
  PrismaNeon = null;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Create Neon connection pool for edge runtime compatibility (if available)
let adapter: any = undefined;
if (Pool && PrismaNeon && process.env.DATABASE_URL) {
  try {
    const connectionString = process.env.DATABASE_URL;
    const pool = new Pool({ connectionString });
    adapter = new PrismaNeon(pool);
  } catch (error) {
    console.warn('Failed to create Neon adapter:', error);
    adapter = undefined;
  }
}

// Configure Prisma Client with optimizations
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
    errorFormat: 'pretty',
  } as any);

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Middleware for soft deletes
prisma.$use(async (params, next) => {
  // Soft delete handling
  if (params.model && params.action === 'delete') {
    params.action = 'update';
    params.args['data'] = { deletedAt: new Date() };
  }
  
  if (params.model && params.action === 'deleteMany') {
    params.action = 'updateMany';
    if (params.args.data !== undefined) {
      params.args.data['deletedAt'] = new Date();
    } else {
      params.args['data'] = { deletedAt: new Date() };
    }
  }
  
  // Exclude soft deleted records from queries
  if (params.model && (params.action === 'findUnique' || params.action === 'findFirst')) {
    params.args.where = { ...params.args.where, deletedAt: null };
  }
  
  if (params.model && (params.action === 'findMany')) {
    if (params.args.where !== undefined) {
      if (params.args.where.deletedAt === undefined) {
        params.args.where = { ...params.args.where, deletedAt: null };
      }
    } else {
      params.args['where'] = { deletedAt: null };
    }
  }
  
  return next(params);
});

// Connection health check
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

// Transaction helper
export async function withTransaction<T>(
  fn: (tx: PrismaClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    return fn(tx as PrismaClient);
  });
}

// Cleanup function for serverless
export async function disconnect(): Promise<void> {
  await prisma.$disconnect();
}

export default prisma;