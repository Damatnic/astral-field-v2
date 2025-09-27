import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { createServer } from 'http'
import { Server as SocketServer } from 'socket.io'
import pino from 'pino'
import { PrismaClient } from '@prisma/client'
import Redis from 'ioredis'

// Phoenix optimization imports
import { dbPool, prisma } from '../../../lib/database-pool'
import { cacheManager } from '../../../lib/cache-manager'
// import { queryOptimizer } from '../../../lib/query-optimizer'
// import { initializeWebSocketManager } from '../../../lib/websocket-manager'

import { authMiddleware } from './middleware/auth'
import { errorHandler } from './middleware/error'
import { requestLogger } from './middleware/logger'
// import { validateRequest } from './middleware/validation'

import { authRoutes } from './routes/auth'
import { leagueRoutes } from './routes/leagues'
import { playerRoutes } from './routes/players' 
import { draftRoutes } from './routes/draft'
import { tradeRoutes } from './routes/trades'
import { waiverRoutes } from './routes/waivers'
import { lineupRoutes } from './routes/lineups'
import { aiRoutes } from './routes/ai'
import { mlIntelligenceRoutes } from './routes/ml-intelligence'
import { adminRoutes } from './routes/admin'
import { healthRoutes } from './routes/health'

import { setupWebSocket } from './services/websocket'

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development' ? {
    target: 'pino-pretty',
    options: { colorize: true }
  } : undefined
})

const app = express()
const httpServer = createServer(app)
const io = new SocketServer(httpServer, {
  cors: {
    origin: process.env.WEB_URL || "http://localhost:3000",
    credentials: true
  }
})

// Use optimized database and cache instances
export { prisma } from '../../../lib/database-pool'
export { cacheManager as redis } from '../../../lib/cache-manager'

// Guardian Security: Enhanced security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  frameguard: { action: 'deny' },
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}))

// Guardian Security: Advanced multi-tier rate limiting
const createRateLimit = (windowMs: number, max: number, skipSuccessfulRequests = false) => 
  rateLimit({
    windowMs,
    max: process.env.NODE_ENV === 'production' ? max : max * 10,
    message: { 
      error: 'Too many requests, please try again later.',
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests,
    keyGenerator: (req) => {
      // Use combination of IP and user agent for better tracking
      const ip = req.ip || req.headers['x-forwarded-for'] || req.headers['x-real-ip']
      const userAgent = req.headers['user-agent'] || 'unknown'
      return `${ip}-${Buffer.from(userAgent).toString('base64').slice(0, 10)}`
    },
    skip: (req) => {
      // Skip rate limiting for health checks
      return req.path === '/api/health'
    }
  })

// Global rate limiter
const globalLimiter = createRateLimit(15 * 60 * 1000, 100) // 100 requests per 15 minutes
app.use(globalLimiter)

// Strict rate limiter for auth endpoints
const authLimiter = createRateLimit(60 * 1000, 5, true) // 5 requests per minute for auth
app.use('/api/auth', authLimiter)

// CORS
app.use(cors({
  origin: [
    process.env.WEB_URL || "http://localhost:3000",
    process.env.ADMIN_URL || "http://localhost:3001"
  ],
  credentials: true,
  optionsSuccessStatus: 200
}))

// Body parsing
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Logging
app.use(requestLogger)

// Health check (no auth required)
app.use('/api/health', healthRoutes)

// Authentication routes (no auth required)
app.use('/api/auth', authRoutes)

// Protected routes
app.use('/api/leagues', authMiddleware, leagueRoutes)
app.use('/api/players', authMiddleware, playerRoutes)
app.use('/api/draft', authMiddleware, draftRoutes)
app.use('/api/trades', authMiddleware, tradeRoutes)
app.use('/api/waivers', authMiddleware, waiverRoutes) 
app.use('/api/lineups', authMiddleware, lineupRoutes)
app.use('/api/ai', authMiddleware, aiRoutes)
app.use('/api/ml', authMiddleware, mlIntelligenceRoutes)

// Admin routes (admin auth required)
app.use('/api/admin', authMiddleware, adminRoutes)

// WebSocket setup
setupWebSocket(io)

// Error handling
app.use(errorHandler)

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method
  })
})

const PORT = process.env.PORT || 3001

async function startServer() {
  try {
    // Test database connection
    await prisma.$connect()
    logger.info('Database connection established')

    // Test Redis connection
    await redis.ping()
    logger.info('Redis connection established')

    httpServer.listen(PORT, () => {
      logger.info(`AstralField API v3.0 running on port ${PORT}`)
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`)
      logger.info(`WebSocket enabled for real-time features`)
    })

  } catch (error) {
    logger.error('Failed to start server:', error)
    process.exit(1)
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully')
  httpServer.close(() => {
    prisma.$disconnect()
    redis.disconnect()
    process.exit(0)
  })
})

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully')
  httpServer.close(() => {
    prisma.$disconnect()
    redis.disconnect()
    process.exit(0)
  })
})

startServer()

export { app, io, logger }