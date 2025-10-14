import { PrismaClient, Prisma } from '@prisma/client'

// Phoenix: Global type for Prisma instance
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Phoenix: Performance-optimized logging configuration
const getLogConfig = (): Prisma.LogLevel[] => {
  if (process.env.NODE_ENV === 'development') {
    return ['error', 'warn', 'info']
  }
  return ['error']
}

// Catalyst: Ultra-high-performance connection configuration
const getOptimizedConnectionString = (): string => {
  const baseUrl = process.env.DATABASE_URL || ''
  
  // Catalyst: Advanced connection pooling parameters
  const poolParams = new URLSearchParams({
    // Connection pool size - optimized for Vercel limits
    'connection_limit': process.env.NODE_ENV === 'production' ? '25' : '5',
    'pool_timeout': '20',
    'socket_timeout': '60',
    
    // Query optimization
    'statement_cache_size': '512',
    'prepared_statement_cache_size': '256',
    
    // Performance optimizations
    'pgbouncer': 'true',
    'connect_timeout': '15',
    'schema_cache': 'true',
    
    // Connection reuse
    'application_name': 'astralfield-v3'
  })

  if (baseUrl.includes('?')) {
    return `${baseUrl}&${poolParams.toString()}`
  } else {
    return `${baseUrl}?${poolParams.toString()}`
  }
}

const prismaConfig: Prisma.PrismaClientOptions = {
  log: getLogConfig(),
  errorFormat: 'minimal',
  
  // Catalyst: Advanced connection pool optimization
  datasources: {
    db: {
      url: getOptimizedConnectionString()
    }
  },

  // Catalyst: Transaction optimization with extended settings
  transactionOptions: {
    maxWait: 8000,     // 8 seconds max wait for high-concurrency
    timeout: 25000,    // 25 seconds timeout for complex operations
    isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted
  }
}

// Phoenix: Singleton pattern with optimized configuration
export const prisma = 
  globalForPrisma.prisma ?? 
  new PrismaClient(prismaConfig)

// Phoenix: Connection health monitoring
let connectionHealth = {
  isConnected: false,
  lastCheck: Date.now(),
  errorCount: 0
}

// Phoenix: Health check function
export const checkDatabaseHealth = async (): Promise<boolean> => {
  try {
    await prisma.$queryRaw`SELECT 1`
    connectionHealth = {
      isConnected: true,
      lastCheck: Date.now(),
      errorCount: 0
    }
    return true
  } catch (error) {
    connectionHealth = {
      isConnected: false,
      lastCheck: Date.now(),
      errorCount: connectionHealth.errorCount + 1
    }
    if (process.env.NODE_ENV === 'development') {
      console.error('Database health check failed:', error);
    }
    return false
  }
}

// Phoenix: Optimized query helpers
export const withRetry = async <T>(
  operation: () => Promise<T>,
  retries: number = 3,
  delay: number = 1000
): Promise<T> => {
  for (let i = 0; i < retries; i++) {
    try {
      return await operation()
    } catch (error) {
      if (i === retries - 1) throw error
      
      console.warn(`Database operation failed, retrying... (${i + 1}/${retries})`)
      await new Promise(resolve => setTimeout(resolve, delay * (i + 1)))
    }
  }
  throw new Error('Retry limit exceeded')
}

// Phoenix: Bulk operation helper
export const bulkOperation = async <T>(
  items: T[],
  operation: (batch: T[]) => Promise<any>,
  batchSize: number = 100
): Promise<any[]> => {
  const results = []
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    const result = await operation(batch)
    results.push(result)
  }
  
  return results
}

// Phoenix: Query performance monitoring
export const timedQuery = async <T>(
  queryName: string,
  query: () => Promise<T>
): Promise<T> => {
  const start = performance.now()
  
  try {
    const result = await query()
    const duration = performance.now() - start
    
    if (duration > 100) {
      console.warn(`Slow query detected: ${queryName} took ${duration.toFixed(2)}ms`)
    }
    
    return result
  } catch (error) {
    const duration = performance.now() - start
    console.error(`Query failed: ${queryName} after ${duration.toFixed(2)}ms`, error)
    throw error
  }
}

// Phoenix: Development-only global assignment
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// Phoenix: Graceful shutdown handling with duplicate prevention
let shutdownHandlersRegistered = false

const gracefulShutdown = async () => {

  try {
    await prisma.$disconnect()
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error during database shutdown:', error);
    }
  }
}

// Only set up process handlers in Node.js runtime (not edge runtime) and prevent duplicates
if (typeof process !== 'undefined' && process.on && !shutdownHandlersRegistered) {
  // Remove any existing listeners to prevent memory leaks
  process.removeAllListeners('SIGINT')
  process.removeAllListeners('SIGTERM') 
  process.removeAllListeners('beforeExit')
  
  // Add new listeners
  process.on('SIGINT', gracefulShutdown)
  process.on('SIGTERM', gracefulShutdown)
  process.on('beforeExit', gracefulShutdown)
  
  shutdownHandlersRegistered = true
}