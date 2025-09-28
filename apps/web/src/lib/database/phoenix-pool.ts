/**
 * Phoenix Advanced Database Connection Pool
 * High-performance connection management with load balancing and failover
 */

import { PrismaClient, Prisma } from '@prisma/client'
import { phoenixMonitor } from './phoenix-monitoring'

interface PoolConfig {
  minConnections: number
  maxConnections: number
  acquireTimeoutMillis: number
  createTimeoutMillis: number
  idleTimeoutMillis: number
  reapIntervalMillis: number
  createRetryIntervalMillis: number
  enableReadReplicas: boolean
  readReplicaUrls?: string[]
  writeUrl: string
  healthCheckIntervalMs: number
  circuitBreakerConfig: {
    failureThreshold: number
    resetTimeoutMs: number
    monitoringPeriodMs: number
  }
}

interface ConnectionStats {
  active: number
  idle: number
  pending: number
  total: number
  utilization: number
  errors: number
  avgResponseTime: number
}

enum ConnectionType {
  READ = 'read',
  WRITE = 'write'
}

interface Connection {
  id: string
  client: PrismaClient
  type: ConnectionType
  createdAt: Date
  lastUsed: Date
  isHealthy: boolean
  errorCount: number
  totalQueries: number
  avgResponseTime: number
}

class CircuitBreaker {
  private failures = 0
  private lastFailureTime = 0
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED'

  constructor(
    private failureThreshold: number,
    private resetTimeoutMs: number
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.resetTimeoutMs) {
        this.state = 'HALF_OPEN'
      } else {
        throw new Error('Circuit breaker is OPEN')
      }
    }

    try {
      const result = await operation()
      if (this.state === 'HALF_OPEN') {
        this.reset()
      }
      return result
    } catch (error) {
      this.recordFailure()
      throw error
    }
  }

  private recordFailure(): void {
    this.failures++
    this.lastFailureTime = Date.now()
    
    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN'
    }
  }

  private reset(): void {
    this.failures = 0
    this.state = 'CLOSED'
  }

  getState(): string {
    return this.state
  }
}

export class PhoenixConnectionPool {
  private static instance: PhoenixConnectionPool
  private connections: Map<string, Connection> = new Map()
  private waitingQueue: Array<{
    type: ConnectionType
    resolve: (connection: Connection) => void
    reject: (error: Error) => void
    timestamp: number
  }> = []
  
  private config: PoolConfig
  private circuitBreaker: CircuitBreaker
  private healthCheckTimer?: NodeJS.Timeout
  private cleanupTimer?: NodeJS.Timeout
  
  private stats = {
    totalConnections: 0,
    activeConnections: 0,
    acquiredConnections: 0,
    failedConnections: 0,
    timeouts: 0,
    circuitBreakerTrips: 0
  }

  static getInstance(config?: PoolConfig): PhoenixConnectionPool {
    if (!PhoenixConnectionPool.instance && config) {
      PhoenixConnectionPool.instance = new PhoenixConnectionPool(config)
    }
    return PhoenixConnectionPool.instance
  }

  private constructor(config: PoolConfig) {
    this.config = config
    this.circuitBreaker = new CircuitBreaker(
      config.circuitBreakerConfig.failureThreshold,
      config.circuitBreakerConfig.resetTimeoutMs
    )
    
    this.initializePool()
    this.startHealthChecks()
    this.startCleanupProcess()
  }

  // Get a connection for read or write operations
  async getConnection(type: ConnectionType = ConnectionType.READ): Promise<Connection> {
    return this.circuitBreaker.execute(async () => {
      const start = performance.now()
      
      try {
        // Try to get an existing idle connection
        const availableConnection = this.findAvailableConnection(type)
        if (availableConnection) {
          availableConnection.lastUsed = new Date()
          this.stats.acquiredConnections++
          return availableConnection
        }

        // Check if we can create a new connection
        if (this.connections.size < this.config.maxConnections) {
          const newConnection = await this.createConnection(type)
          this.stats.acquiredConnections++
          return newConnection
        }

        // Wait for a connection to become available
        return await this.waitForConnection(type)
      } catch (error) {
        this.stats.failedConnections++
        phoenixMonitor.recordQuery('pool.getConnection', performance.now() - start, false, undefined, error as Error)
        throw error
      }
    })
  }

  // Release a connection back to the pool
  releaseConnection(connection: Connection): void {
    if (!this.connections.has(connection.id)) {
      return // Connection not in pool
    }

    connection.lastUsed = new Date()
    
    // Process waiting queue
    const waiting = this.waitingQueue.find(w => w.type === connection.type)
    if (waiting) {
      this.waitingQueue = this.waitingQueue.filter(w => w !== waiting)
      waiting.resolve(connection)
      return
    }

    // Mark as available for reuse
    this.stats.activeConnections--
  }

  // Execute a query with automatic connection management
  async executeQuery<T>(
    queryName: string,
    query: (client: PrismaClient) => Promise<T>,
    type: ConnectionType = ConnectionType.READ
  ): Promise<T> {
    const connection = await this.getConnection(type)
    const start = performance.now()
    
    try {
      const result = await query(connection.client)
      const executionTime = performance.now() - start
      
      // Update connection stats
      connection.totalQueries++
      connection.avgResponseTime = (
        (connection.avgResponseTime * (connection.totalQueries - 1) + executionTime) 
        / connection.totalQueries
      )
      
      phoenixMonitor.recordQuery(queryName, executionTime, true)
      return result
    } catch (error) {
      const executionTime = performance.now() - start
      connection.errorCount++
      phoenixMonitor.recordQuery(queryName, executionTime, false, undefined, error as Error)
      
      // Mark connection as unhealthy if too many errors
      if (connection.errorCount > 5) {
        connection.isHealthy = false
      }
      
      throw error
    } finally {
      this.releaseConnection(connection)
    }
  }

  // Execute read-only query with read replica routing
  async executeReadQuery<T>(
    queryName: string,
    query: (client: PrismaClient) => Promise<T>
  ): Promise<T> {
    return this.executeQuery(queryName, query, ConnectionType.READ)
  }

  // Execute write query on master
  async executeWriteQuery<T>(
    queryName: string,
    query: (client: PrismaClient) => Promise<T>
  ): Promise<T> {
    return this.executeQuery(queryName, query, ConnectionType.WRITE)
  }

  // Execute transaction with write connection
  async executeTransaction<T>(
    queryName: string,
    transaction: (client: PrismaClient) => Promise<T>
  ): Promise<T> {
    const connection = await this.getConnection(ConnectionType.WRITE)
    const start = performance.now()
    
    try {
      const result = await connection.client.$transaction(async (tx) => {
        return await transaction(tx as PrismaClient)
      }, {
        maxWait: this.config.acquireTimeoutMillis,
        timeout: this.config.createTimeoutMillis
      })
      
      const executionTime = performance.now() - start
      phoenixMonitor.recordQuery(`${queryName}:transaction`, executionTime, true)
      return result
    } catch (error) {
      const executionTime = performance.now() - start
      phoenixMonitor.recordQuery(`${queryName}:transaction`, executionTime, false, undefined, error as Error)
      throw error
    } finally {
      this.releaseConnection(connection)
    }
  }

  // Get pool statistics
  getStats(): ConnectionStats & typeof this.stats {
    const activeConnections = Array.from(this.connections.values())
      .filter(c => Date.now() - c.lastUsed.getTime() < 5000).length
    
    const totalConnections = this.connections.size
    const utilization = totalConnections > 0 ? (activeConnections / this.config.maxConnections) * 100 : 0
    
    const avgResponseTime = Array.from(this.connections.values())
      .reduce((sum, c) => sum + c.avgResponseTime, 0) / totalConnections || 0

    return {
      active: activeConnections,
      idle: totalConnections - activeConnections,
      pending: this.waitingQueue.length,
      total: totalConnections,
      utilization,
      errors: Array.from(this.connections.values()).reduce((sum, c) => sum + c.errorCount, 0),
      avgResponseTime,
      ...this.stats
    }
  }

  // Health check for all connections
  async healthCheck(): Promise<{ healthy: number; unhealthy: number; total: number }> {
    const connections = Array.from(this.connections.values())
    const healthPromises = connections.map(async (connection) => {
      try {
        await connection.client.$queryRaw`SELECT 1`
        connection.isHealthy = true
        connection.errorCount = Math.max(0, connection.errorCount - 1) // Gradual recovery
        return true
      } catch (error) {
        connection.isHealthy = false
        connection.errorCount++
        return false
      }
    })

    const results = await Promise.all(healthPromises)
    const healthy = results.filter(r => r).length
    const unhealthy = results.length - healthy

    // Remove persistently unhealthy connections
    connections.forEach(connection => {
      if (!connection.isHealthy && connection.errorCount > 10) {
        this.removeConnection(connection)
      }
    })

    return { healthy, unhealthy, total: connections.length }
  }

  // Graceful shutdown
  async shutdown(): Promise<void> {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer)
    }
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
    }

    // Wait for pending operations to complete
    while (this.waitingQueue.length > 0) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    // Disconnect all connections
    const disconnectPromises = Array.from(this.connections.values()).map(async (connection) => {
      try {
        await connection.client.$disconnect()
      } catch (error) {
        console.error(`Error disconnecting connection ${connection.id}:`, error)
      }
    })

    await Promise.all(disconnectPromises)
    this.connections.clear()
  }

  // Private methods
  private async initializePool(): Promise<void> {
    // Create minimum number of connections
    const initialConnections = Math.min(this.config.minConnections, this.config.maxConnections)
    
    for (let i = 0; i < initialConnections; i++) {
      try {
        await this.createConnection(i % 2 === 0 ? ConnectionType.WRITE : ConnectionType.READ)
      } catch (error) {
        console.error('Failed to create initial connection:', error)
      }
    }
  }

  private async createConnection(type: ConnectionType): Promise<Connection> {
    const connectionId = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const databaseUrl = type === ConnectionType.READ && this.config.enableReadReplicas && this.config.readReplicaUrls?.length
      ? this.config.readReplicaUrls[Math.floor(Math.random() * this.config.readReplicaUrls.length)]
      : this.config.writeUrl

    const client = new PrismaClient({
      datasources: {
        db: { url: databaseUrl }
      },
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error']
    })

    try {
      // Test connection
      await client.$connect()
      await client.$queryRaw`SELECT 1`

      const connection: Connection = {
        id: connectionId,
        client,
        type,
        createdAt: new Date(),
        lastUsed: new Date(),
        isHealthy: true,
        errorCount: 0,
        totalQueries: 0,
        avgResponseTime: 0
      }

      this.connections.set(connectionId, connection)
      this.stats.totalConnections++
      
      return connection
    } catch (error) {
      await client.$disconnect()
      throw new Error(`Failed to create ${type} connection: ${error}`)
    }
  }

  private findAvailableConnection(type: ConnectionType): Connection | null {
    return Array.from(this.connections.values()).find(
      connection => 
        connection.type === type && 
        connection.isHealthy &&
        Date.now() - connection.lastUsed.getTime() > 1000 // Not recently used
    ) || null
  }

  private async waitForConnection(type: ConnectionType): Promise<Connection> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.stats.timeouts++
        reject(new Error(`Connection acquisition timeout for ${type}`))
      }, this.config.acquireTimeoutMillis)

      this.waitingQueue.push({
        type,
        resolve: (connection) => {
          clearTimeout(timeout)
          resolve(connection)
        },
        reject: (error) => {
          clearTimeout(timeout)
          reject(error)
        },
        timestamp: Date.now()
      })
    })
  }

  private removeConnection(connection: Connection): void {
    this.connections.delete(connection.id)
    connection.client.$disconnect().catch(() => {}) // Ignore errors on disconnect
    this.stats.totalConnections--
  }

  private startHealthChecks(): void {
    this.healthCheckTimer = setInterval(async () => {
      try {
        await this.healthCheck()
      } catch (error) {
        console.error('Health check failed:', error)
      }
    }, this.config.healthCheckIntervalMs)
  }

  private startCleanupProcess(): void {
    this.cleanupTimer = setInterval(() => {
      const now = Date.now()
      
      // Remove connections that have been idle too long
      Array.from(this.connections.values()).forEach(connection => {
        if (now - connection.lastUsed.getTime() > this.config.idleTimeoutMillis) {
          this.removeConnection(connection)
        }
      })

      // Clean up expired waiting queue entries
      this.waitingQueue = this.waitingQueue.filter(waiting => {
        if (now - waiting.timestamp > this.config.acquireTimeoutMillis) {
          waiting.reject(new Error('Connection wait timeout'))
          return false
        }
        return true
      })
    }, this.config.reapIntervalMillis)
  }
}

// Default configuration
export const defaultPoolConfig: PoolConfig = {
  minConnections: 5,
  maxConnections: 20,
  acquireTimeoutMillis: 30000,
  createTimeoutMillis: 30000,
  idleTimeoutMillis: 30000,
  reapIntervalMillis: 10000,
  createRetryIntervalMillis: 100,
  enableReadReplicas: false,
  readReplicaUrls: [],
  writeUrl: process.env.DATABASE_URL || '',
  healthCheckIntervalMs: 60000,
  circuitBreakerConfig: {
    failureThreshold: 5,
    resetTimeoutMs: 60000,
    monitoringPeriodMs: 300000
  }
}

// Initialize with environment-based configuration
export const phoenixPool = PhoenixConnectionPool.getInstance({
  ...defaultPoolConfig,
  maxConnections: process.env.NODE_ENV === 'production' ? 25 : 10,
  enableReadReplicas: process.env.READ_REPLICA_URL ? true : false,
  readReplicaUrls: process.env.READ_REPLICA_URL ? [process.env.READ_REPLICA_URL] : []
})