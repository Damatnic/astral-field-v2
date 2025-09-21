#!/usr/bin/env node
import { config } from 'dotenv';
import { createServer } from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { AdvancedMatchupService, getMatchupService } from './matchup-service-advanced';
import { 
  MatchupFilters, 
  PaginationOptions,
  ScoreUpdateInput,
  ServiceConfig,
  Environment 
} from './types/matchup.types';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { z } from 'zod';
import * as Sentry from '@sentry/node';
import * as Tracing from '@sentry/tracing';
import { ProfilingIntegration } from '@sentry/profiling-node';
import { StatsD } from 'hot-shots';
import WebSocket from 'ws';
import { createBullBoard } from '@bull-board/api';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { ExpressAdapter } from '@bull-board/express';
import Queue from 'bull';
import Redis from 'ioredis';
import { Kafka, Producer, Consumer } from 'kafkajs';

// Load environment configuration
config({ path: '.env.local' });

// Configuration schema
const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  SENTRY_DSN: z.string().optional(),
  STATSD_HOST: z.string().default('localhost'),
  STATSD_PORT: z.coerce.number().default(8125),
  KAFKA_BROKERS: z.string().default('localhost:9092'),
  ENABLE_WEBSOCKET: z.coerce.boolean().default(true),
  ENABLE_METRICS: z.coerce.boolean().default(true),
  ENABLE_TRACING: z.coerce.boolean().default(true),
  MAX_REQUEST_SIZE: z.string().default('10mb'),
  CORS_ORIGIN: z.string().default('*'),
  API_KEY: z.string().optional(),
  JWT_SECRET: z.string().optional(),
});

const config = envSchema.parse(process.env);

// Initialize Sentry
if (config.SENTRY_DSN) {
  Sentry.init({
    dsn: config.SENTRY_DSN,
    environment: config.NODE_ENV,
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.Express({ app: express() }),
      new ProfilingIntegration(),
    ],
    tracesSampleRate: config.NODE_ENV === 'production' ? 0.1 : 1.0,
    profilesSampleRate: 0.1,
  });
}

// Initialize StatsD for metrics
const statsd = new StatsD({
  host: config.STATSD_HOST,
  port: config.STATSD_PORT,
  prefix: 'matchup_service.',
  errorHandler: (error) => {
    console.error('StatsD Error:', error);
  },
});

// Initialize Redis
const redis = new Redis(config.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => Math.min(times * 50, 2000),
});

// Initialize Kafka
let kafka: Kafka | null = null;
let producer: Producer | null = null;
let consumer: Consumer | null = null;

if (config.KAFKA_BROKERS) {
  kafka = new Kafka({
    clientId: 'matchup-service',
    brokers: config.KAFKA_BROKERS.split(','),
    retry: {
      retries: 5,
      initialRetryTime: 100,
    },
  });
  
  producer = kafka.producer();
  consumer = kafka.consumer({ groupId: 'matchup-service-group' });
}

// Initialize Queue
const matchupQueue = new Queue('matchup-processing', config.REDIS_URL, {
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: false,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
});

// Queue processors
matchupQueue.process('update-scores', async (job) => {
  const service = getMatchupService();
  const result = await service.updateScores(job.data);
  
  // Publish to Kafka
  if (producer) {
    await producer.send({
      topic: 'matchup-updates',
      messages: [{
        key: job.data.matchupId,
        value: JSON.stringify(result),
        timestamp: Date.now().toString(),
      }],
    });
  }
  
  return result;
});

matchupQueue.process('calculate-stats', async (job) => {
  const service = getMatchupService();
  return await service.calculateAdvancedStats(job.data);
});

// Setup Bull Board for queue monitoring
const serverAdapter = new ExpressAdapter();
createBullBoard({
  queues: [new BullAdapter(matchupQueue)],
  serverAdapter,
});

// Create Express app
const app = express();
const server = createServer(app);

// Logger setup
const logger = pino({
  level: config.NODE_ENV === 'production' ? 'info' : 'debug',
  transport: config.NODE_ENV !== 'production' ? {
    target: 'pino-pretty',
    options: { colorize: true }
  } : undefined,
});

// Middleware
app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
}));

app.use(cors({
  origin: config.CORS_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
}));

app.use(compression());
app.use(express.json({ limit: config.MAX_REQUEST_SIZE }));
app.use(express.urlencoded({ extended: true, limit: config.MAX_REQUEST_SIZE }));

app.use(pinoHttp({
  logger,
  autoLogging: {
    ignore: (req) => req.url === '/health' || req.url === '/metrics',
  },
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      query: req.query,
      headers: {
        ...req.headers,
        authorization: req.headers.authorization ? '[REDACTED]' : undefined,
      },
    }),
  },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', limiter);

// Authentication middleware
const authenticate = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  
  if (config.API_KEY && apiKey !== config.API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  next();
};

// Request validation middleware
const validateRequest = (schema: z.ZodSchema) => {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation error',
          details: error.errors,
        });
      }
      next(error);
    }
  };
};

// Initialize service
const matchupService = getMatchupService({
  nodeEnv: config.NODE_ENV as Environment,
  enableCache: true,
  cacheTtl: 300000,
  poolSize: 10,
});

// API Routes
app.get('/health', async (req, res) => {
  const health = await matchupService.healthCheck();
  const statusCode = health.status === 'healthy' ? 200 : 
                     health.status === 'degraded' ? 503 : 500;
  
  statsd.gauge('health.status', statusCode === 200 ? 1 : 0);
  
  res.status(statusCode).json(health);
});

app.get('/metrics', authenticate, async (req, res) => {
  const metrics = matchupService.getMetrics();
  res.json(metrics);
});

app.get('/api/matchups', authenticate, async (req, res, next) => {
  try {
    statsd.increment('api.matchups.requests');
    const startTime = Date.now();
    
    const filters: MatchupFilters = {
      leagueId: req.query.leagueId as string,
      teamId: req.query.teamId as string,
      week: req.query.week ? parseInt(req.query.week as string) : undefined,
      status: req.query.status as any,
      isPlayoff: req.query.isPlayoff === 'true',
    };
    
    const pagination: PaginationOptions = {
      page: parseInt(req.query.page as string) || 1,
      limit: Math.min(parseInt(req.query.limit as string) || 10, 100),
      sortBy: req.query.sortBy as any,
      sortOrder: req.query.sortOrder as any,
    };
    
    const result = await matchupService.fetchMatchups(filters, pagination);
    
    statsd.timing('api.matchups.response_time', Date.now() - startTime);
    statsd.increment(`api.matchups.${result.success ? 'success' : 'failure'}`);
    
    if (result.success) {
      res.json(result.data);
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    next(error);
  }
});

app.get('/api/matchups/stats', authenticate, async (req, res, next) => {
  try {
    statsd.increment('api.stats.requests');
    
    const filters: MatchupFilters = {
      leagueId: req.query.leagueId as string,
      week: req.query.week ? parseInt(req.query.week as string) : undefined,
    };
    
    const result = await matchupService.calculateAdvancedStats(filters);
    
    if (result.success) {
      res.json(result.data);
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    next(error);
  }
});

app.post('/api/matchups/scores', 
  authenticate,
  validateRequest(z.object({
    matchupId: z.string(),
    homeScore: z.number().optional(),
    awayScore: z.number().optional(),
    updateType: z.enum(['MANUAL', 'AUTOMATIC', 'IMPORT']),
  })),
  async (req, res, next) => {
    try {
      statsd.increment('api.scores.updates');
      
      // Queue the update for processing
      const job = await matchupQueue.add('update-scores', req.body);
      
      res.status(202).json({
        message: 'Score update queued',
        jobId: job.id,
      });
    } catch (error) {
      next(error);
    }
  }
);

app.get('/api/teams/:teamId/performance', authenticate, async (req, res, next) => {
  try {
    const result = await matchupService.getTeamPerformance(req.params.teamId);
    
    if (result.success) {
      res.json(result.data);
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    next(error);
  }
});

app.get('/api/weeks/:week/stats', authenticate, async (req, res, next) => {
  try {
    const week = parseInt(req.params.week);
    const leagueId = req.query.leagueId as string;
    
    const result = await matchupService.getWeeklyStats(week, leagueId);
    
    if (result.success) {
      res.json(result.data);
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    next(error);
  }
});

// Queue monitoring dashboard
serverAdapter.setBasePath('/admin/queues');
app.use('/admin/queues', authenticate, serverAdapter.getRouter());

// WebSocket support for real-time updates
if (config.ENABLE_WEBSOCKET) {
  const wss = new WebSocket.Server({ server, path: '/ws' });
  
  wss.on('connection', (ws, req) => {
    logger.info({ url: req.url }, 'WebSocket connection established');
    
    const unsubscribe = matchupService.subscribe(
      {}, // Subscribe to all events
      (event) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(event));
        }
      }
    );
    
    ws.on('close', () => {
      logger.info('WebSocket connection closed');
      unsubscribe();
    });
    
    ws.on('error', (error) => {
      logger.error({ error }, 'WebSocket error');
    });
    
    // Send ping every 30 seconds to keep connection alive
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      }
    }, 30000);
    
    ws.on('close', () => clearInterval(pingInterval));
  });
}

// Error handling
app.use(Sentry.Handlers.errorHandler());

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error({
    error: err,
    request: {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body,
    },
  }, 'Unhandled error');
  
  statsd.increment('errors.unhandled');
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation error',
      details: err.details,
    });
  }
  
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: 'Unauthorized',
    });
  }
  
  res.status(500).json({
    error: 'Internal server error',
    message: config.NODE_ENV === 'production' ? undefined : err.message,
    stack: config.NODE_ENV === 'production' ? undefined : err.stack,
  });
});

// Graceful shutdown
const shutdown = async (signal: string) => {
  logger.info({ signal }, 'Shutting down server...');
  
  // Stop accepting new connections
  server.close(async () => {
    logger.info('HTTP server closed');
    
    // Close all connections
    try {
      await matchupQueue.close();
      await redis.quit();
      
      if (producer) await producer.disconnect();
      if (consumer) await consumer.disconnect();
      
      await matchupService.shutdown();
      statsd.close();
      
      logger.info('All connections closed successfully');
      process.exit(0);
    } catch (error) {
      logger.error({ error }, 'Error during shutdown');
      process.exit(1);
    }
  });
  
  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Start server
async function startServer() {
  try {
    // Connect to Kafka
    if (producer) {
      await producer.connect();
      logger.info('Connected to Kafka producer');
    }
    
    if (consumer) {
      await consumer.connect();
      await consumer.subscribe({ topic: 'matchup-events', fromBeginning: false });
      
      await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          logger.debug({ topic, partition, message }, 'Received Kafka message');
          // Process incoming events
        },
      });
      
      logger.info('Connected to Kafka consumer');
    }
    
    // Start HTTP server
    server.listen(config.PORT, () => {
      logger.info({
        port: config.PORT,
        environment: config.NODE_ENV,
        features: {
          websocket: config.ENABLE_WEBSOCKET,
          metrics: config.ENABLE_METRICS,
          tracing: config.ENABLE_TRACING,
        },
      }, 'Server started successfully');
      
      // Log all available endpoints
      logger.info('Available endpoints:');
      logger.info('  GET  /health');
      logger.info('  GET  /metrics');
      logger.info('  GET  /api/matchups');
      logger.info('  GET  /api/matchups/stats');
      logger.info('  POST /api/matchups/scores');
      logger.info('  GET  /api/teams/:teamId/performance');
      logger.info('  GET  /api/weeks/:week/stats');
      logger.info('  GET  /admin/queues (Queue Dashboard)');
      if (config.ENABLE_WEBSOCKET) {
        logger.info('  WS   /ws (WebSocket)');
      }
    });
  } catch (error) {
    logger.fatal({ error }, 'Failed to start server');
    process.exit(1);
  }
}

// Start the server
startServer();

export default app;