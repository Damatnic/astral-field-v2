/**
 * Production Configuration
 * Optimized settings for production deployment
 */

// Environment-specific configurations
export const PRODUCTION_CONFIG = {
  // Cache settings
  cache: {
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      connectTimeout: 10000,
      commandTimeout: 5000,
    },
    ttl: {
      static: 31536000,     // 1 year for static assets
      api: 300,             // 5 minutes for API responses
      page: 1800,           // 30 minutes for pages
      user: 900,            // 15 minutes for user data
    }
  },

  // Database settings
  database: {
    connectionLimit: 100,
    acquireTimeoutMillis: 60000,
    timeout: 60000,
    pool: {
      min: 5,
      max: 50,
      idle: 10000,
    }
  },

  // Performance monitoring
  monitoring: {
    enabled: process.env.NODE_ENV === 'production',
    sampleRate: 0.1, // Monitor 10% of requests
    slowQueryThreshold: 500, // 500ms
    slowPageLoadThreshold: 3000, // 3s
    errorThreshold: 0.05, // 5% error rate
  },

  // Rate limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
  },

  // Security headers
  security: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-eval'", "'unsafe-inline'", "https://vercel.live"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        connectSrc: [
          "'self'",
          "https://api.espn.com",
          "https://site.api.espn.com",
          "https://vercel.live",
          "wss://ws.pusherapp.com",
          "https://sockjs.pusher.com"
        ],
        frameSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    }
  },

  // CDN settings
  cdn: {
    enabled: true,
    domain: process.env.CDN_DOMAIN || 'cdn.astralfield.com',
    staticAssets: true,
    images: true,
  },

  // Feature flags for production
  features: {
    pushNotifications: true,
    liveScoring: true,
    tradeAnalysis: true,
    draftAssistance: true,
    commissionerTools: true,
    performanceMonitoring: true,
    errorReporting: true,
  }
} as const;

// Performance budget constraints
export const PERFORMANCE_BUDGET = {
  // Bundle sizes (in KB)
  javascript: {
    main: 250,      // Main bundle
    vendor: 500,    // Vendor libraries
    total: 1000,    // Total JS
  },
  
  // Asset sizes (in KB)  
  images: {
    hero: 100,      // Hero/large images
    thumbnail: 20,  // Thumbnail images
    icon: 10,       // Icons
  },
  
  // Performance metrics (in ms)
  timing: {
    firstContentfulPaint: 1500,
    largestContentfulPaint: 2500,
    firstInputDelay: 100,
    cumulativeLayoutShift: 0.1,
    timeToInteractive: 3500,
  },
  
  // Network limits
  requests: {
    total: 50,      // Total HTTP requests
    scripts: 10,    // JavaScript files
    stylesheets: 5, // CSS files
  }
} as const;

// Optimization strategies
export const OPTIMIZATION_STRATEGIES = {
  // Code splitting points
  splitPoints: [
    'draft',        // Draft-related components
    'trades',       // Trade analysis and management
    'commissioner', // Commissioner tools
    'charts',       // Data visualization
    'forms',        // Form components
  ],

  // Lazy loading targets
  lazyComponents: [
    'DraftRoom',
    'TradeProposal', 
    'CommissionerDashboard',
    'StatsChart',
    'AdvancedAnalytics',
  ],

  // Critical CSS
  criticalCSS: [
    'layout',
    'navigation',
    'hero',
    'buttons',
    'forms',
  ],

  // Preload resources
  preload: {
    fonts: [
      '/fonts/inter-var.woff2',
    ],
    scripts: [
      '/_next/static/chunks/framework.js',
      '/_next/static/chunks/main.js',
    ],
    styles: [
      '/_next/static/css/main.css',
    ]
  }
} as const;

// Deployment checklist
export const DEPLOYMENT_CHECKLIST = {
  performance: [
    'Bundle size analysis completed',
    'Lighthouse audit score > 90',
    'Core Web Vitals within budget',
    'Cache headers configured',
    'Image optimization enabled',
    'Code splitting implemented',
  ],
  
  security: [
    'HTTPS enabled',
    'Security headers configured',
    'Content Security Policy set',
    'Rate limiting enabled',
    'API authentication verified',
    'Environment variables secured',
  ],
  
  monitoring: [
    'Performance monitoring enabled',
    'Error reporting configured', 
    'Database monitoring active',
    'Alert thresholds set',
    'Health check endpoints working',
    'Log aggregation enabled',
  ],

  functionality: [
    'All critical user paths tested',
    'Database migrations applied',
    'Third-party integrations verified',
    'Backup systems confirmed',
    'Rollback plan documented',
    'Feature flags configured',
  ]
} as const;

// Environment validation
export function validateProductionEnvironment(): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required environment variables
  const required = [
    'DATABASE_URL',
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL'
  ];

  for (const envVar of required) {
    if (!process.env[envVar]) {
      errors.push(`Missing required environment variable: ${envVar}`);
    }
  }

  // Performance environment variables
  const performance = [
    'REDIS_HOST',
    'REDIS_PASSWORD',
  ];

  for (const envVar of performance) {
    if (!process.env[envVar]) {
      warnings.push(`Missing performance environment variable: ${envVar}`);
    }
  }

  // Monitoring variables
  if (!process.env.MONITORING_WEBHOOK_URL) {
    warnings.push('No monitoring webhook configured');
  }

  if (!process.env.ANALYTICS_API_URL) {
    warnings.push('No analytics API configured');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

// Production startup checks
export async function performStartupChecks(): Promise<void> {
  console.log('🚀 Performing production startup checks...');

  // Environment validation
  const envCheck = validateProductionEnvironment();
  if (!envCheck.valid) {
    console.error('❌ Environment validation failed:');
    envCheck.errors.forEach(error => console.error(`  - ${error}`));
    process.exit(1);
  }

  if (envCheck.warnings.length > 0) {
    console.warn('⚠️  Environment warnings:');
    envCheck.warnings.forEach(warning => console.warn(`  - ${warning}`));
  }

  // Database connectivity
  try {
    const { prisma } = await import('@/lib/prisma');
    await prisma.$connect();
    console.log('✅ Database connection successful');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }

  // Redis connectivity (if configured)
  if (process.env.REDIS_HOST) {
    try {
      const { cacheService } = await import('@/lib/cache/redis-client');
      const isConnected = await cacheService.ping();
      if (isConnected) {
        console.log('✅ Redis connection successful');
      } else {
        console.warn('⚠️  Redis connection failed');
      }
    } catch (error) {
      console.warn('⚠️  Redis connection error:', error);
    }
  }

  console.log('🎉 All startup checks passed!');
}

export { PRODUCTION_CONFIG as default };