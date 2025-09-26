import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { createServer } from 'http'
import { Server as SocketServer } from 'socket.io'
import pino from 'pino'
import { PrismaClient } from '@prisma/client'
import Redis from 'ioredis'

import { authMiddleware } from './middleware/auth'
import { errorHandler } from './middleware/error'
import { requestLogger } from './middleware/logger'
import { validateRequest } from './middleware/validation'

import { authRoutes } from './routes/auth'
import { leagueRoutes } from './routes/leagues'
import { playerRoutes } from './routes/players' 
import { draftRoutes } from './routes/draft'
import { tradeRoutes } from './routes/trades'
import { waiverRoutes } from './routes/waivers'
import { lineupRoutes } from './routes/lineups'
import { aiRoutes } from './routes/ai'
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

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
})

export const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  retryDelayOnFailure: 100,
  maxRetriesPerRequest: 3
})

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}))

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
})

app.use(limiter)

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