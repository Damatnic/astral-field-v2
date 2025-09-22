/**
 * Optimized Database Client with Connection Pooling
 * Features: Neon serverless compatibility, soft deletes, connection pooling
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
  prisma: ReturnType<typeof createPrismaClient> | undefined;
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

// Create Prisma client with soft delete middleware using Prisma v6 extensions
function createPrismaClient() {
  const baseClient = new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
    errorFormat: 'pretty',
  } as any);

  // Use Prisma v6 extensions for soft delete middleware
  return baseClient.$extends({
    name: 'SoftDeleteMiddleware',
    query: {
      $allModels: {
        async delete({ model, args, query }: any) {
          // Convert delete to update with soft delete
          return (baseClient as any)[model].update({
            ...args,
            data: { deletedAt: new Date() }
          });
        },
        async deleteMany({ model, args, query }: any) {
          // Convert deleteMany to updateMany with soft delete
          return (baseClient as any)[model].updateMany({
            ...args,
            data: { deletedAt: new Date() }
          });
        },
        async findUnique({ args, query }: any) {
          // Exclude soft deleted records
          args.where = { ...args.where, deletedAt: null };
          return query(args);
        },
        async findFirst({ args, query }: any) {
          // Exclude soft deleted records
          args.where = { ...args.where, deletedAt: null };
          return query(args);
        },
        async findMany({ args, query }: any) {
          // Exclude soft deleted records
          if (args.where !== undefined) {
            if (args.where.deletedAt === undefined) {
              args.where = { ...args.where, deletedAt: null };
            }
          } else {
            args.where = { deletedAt: null };
          }
          return query(args);
        }
      }
    }
  });
}

// Configure Prisma Client with optimizations
export const prisma =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

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
  fn: (tx: any) => Promise<T>
): Promise<T> {
  return prisma.$transaction(fn, {
    maxWait: 5000,
    timeout: 10000,
  });
}

// Batch operations for better performance
export const batchOperations = {
  async createMany<T>(model: string, data: any[]): Promise<number> {
    const result = await (prisma as any)[model].createMany({
      data,
      skipDuplicates: true,
    });
    return result.count;
  },

  async updateMany<T>(model: string, where: any, data: any): Promise<number> {
    const result = await (prisma as any)[model].updateMany({
      where,
      data,
    });
    return result.count;
  },

  async deleteMany(model: string, where: any): Promise<number> {
    const result = await (prisma as any)[model].updateMany({
      where,
      data: { deletedAt: new Date() },
    });
    return result.count;
  },
};

// Optimized query patterns
export const optimizedQueries = {
  // Paginated query with cursor
  async paginate(
    model: string,
    {
      cursor,
      take = 20,
      where = {},
      orderBy = { id: 'asc' },
      include = {},
    }: any
  ) {
    const items = await (prisma as any)[model].findMany({
      take: take + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      where,
      orderBy,
      include,
    });

    const hasMore = items.length > take;
    const edges = hasMore ? items.slice(0, -1) : items;
    const endCursor = edges.length > 0 ? edges[edges.length - 1].id : null;

    return {
      edges,
      pageInfo: {
        hasNextPage: hasMore,
        endCursor,
      },
    };
  },

  // Bulk upsert operation
  async bulkUpsert(model: string, data: any[], uniqueKeys: string[]) {
    const operations = data.map((item) => {
      const where = uniqueKeys.reduce((acc, key) => {
        acc[key] = item[key];
        return acc;
      }, {} as any);

      return (prisma as any)[model].upsert({
        where,
        update: item,
        create: item,
      });
    });

    return prisma.$transaction(operations);
  },
};

// Export Prisma types
export * from '@prisma/client';