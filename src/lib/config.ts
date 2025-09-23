/**
 * Centralized Environment Configuration
 * This module provides type-safe access to all environment variables
 * and validates required configuration on startup.
 */

export interface AppConfig {
  // Environment
  NODE_ENV: 'development' | 'production' | 'test';
  
  // Database
  DATABASE_URL: string;
  DIRECT_DATABASE_URL?: string;
  
  // Authentication
  NEXTAUTH_URL: string;
  NEXTAUTH_SECRET: string;
  AUTH0_DOMAIN?: string;
  AUTH0_CLIENT_ID?: string;
  AUTH0_CLIENT_SECRET?: string;
  AUTH0_AUDIENCE?: string;
  
  // External APIs
  ESPN_BASE_URL: string;
  ESPN_FANTASY_URL: string;
  
  // Application
  APP_URL: string;
  PORT: number;
  
  // Feature Flags
  ENABLE_LIVE_SCORING: boolean;
  ENABLE_NEWS_FEED: boolean;
  ENABLE_PLAYER_SYNC: boolean;
  
  // Refresh Intervals (milliseconds)
  SCORE_REFRESH_INTERVAL: number;
  NEWS_REFRESH_INTERVAL: number;
  PLAYER_REFRESH_INTERVAL: number;
  
  // Security
  RATE_LIMIT_WINDOW: number;
  RATE_LIMIT_MAX: number;
}

function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue;
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getEnvBool(key: string, defaultValue: boolean = false): boolean {
  const value = process.env[key];
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true';
}

function getEnvNumber(key: string, defaultValue?: number): number {
  const value = process.env[key];
  if (!value) {
    if (defaultValue !== undefined) return defaultValue;
    throw new Error(`Missing required environment variable: ${key}`);
  }
  const num = parseInt(value, 10);
  if (isNaN(num)) {
    throw new Error(`Invalid number for environment variable ${key}: ${value}`);
  }
  return num;
}

// Load and validate configuration
export const config: AppConfig = {
  // Environment
  NODE_ENV: (process.env.NODE_ENV as any) || 'development',
  
  // Database - Required
  DATABASE_URL: getEnvVar('DATABASE_URL'),
  DIRECT_DATABASE_URL: process.env.DIRECT_DATABASE_URL,
  
  // Authentication - Required for production
  NEXTAUTH_URL: getEnvVar('NEXTAUTH_URL', 'http://localhost:3007'),
  NEXTAUTH_SECRET: getEnvVar('NEXTAUTH_SECRET', process.env.NODE_ENV === 'development' ? 'dev-secret-key-minimum-32-characters-long' : undefined),
  
  // Auth0 - Optional
  AUTH0_DOMAIN: process.env.AUTH0_DOMAIN,
  AUTH0_CLIENT_ID: process.env.AUTH0_CLIENT_ID,
  AUTH0_CLIENT_SECRET: process.env.AUTH0_CLIENT_SECRET,
  AUTH0_AUDIENCE: process.env.AUTH0_AUDIENCE,
  
  // External APIs - With defaults
  ESPN_BASE_URL: getEnvVar('ESPN_BASE_URL', 'https://site.api.espn.com/apis/site/v2/sports/football/nfl'),
  ESPN_FANTASY_URL: getEnvVar('ESPN_FANTASY_URL', 'https://fantasy.espn.com/apis/v3/games/ffl'),
  
  // Application
  APP_URL: getEnvVar('NEXT_PUBLIC_APP_URL', 'http://localhost:3007'),
  PORT: getEnvNumber('PORT', 3007),
  
  // Feature Flags
  ENABLE_LIVE_SCORING: getEnvBool('ENABLE_LIVE_SCORING', true),
  ENABLE_NEWS_FEED: getEnvBool('ENABLE_NEWS_FEED', true),
  ENABLE_PLAYER_SYNC: getEnvBool('ENABLE_PLAYER_SYNC', true),
  
  // Refresh Intervals (milliseconds)
  SCORE_REFRESH_INTERVAL: getEnvNumber('SCORE_REFRESH_INTERVAL', 30000), // 30 seconds
  NEWS_REFRESH_INTERVAL: getEnvNumber('NEWS_REFRESH_INTERVAL', 300000), // 5 minutes
  PLAYER_REFRESH_INTERVAL: getEnvNumber('PLAYER_REFRESH_INTERVAL', 86400000), // 24 hours
  
  // Security
  RATE_LIMIT_WINDOW: getEnvNumber('RATE_LIMIT_WINDOW', 900000), // 15 minutes
  RATE_LIMIT_MAX: getEnvNumber('RATE_LIMIT_MAX', 100), // 100 requests per window
};

/**
 * Validate configuration on module load
 */
export function validateConfig(): void {
  const errors: string[] = [];
  
  // Validate production requirements
  if (config.NODE_ENV === 'production') {
    if (!config.NEXTAUTH_SECRET || config.NEXTAUTH_SECRET.length < 32) {
      errors.push('NEXTAUTH_SECRET must be at least 32 characters in production');
    }
    
    if (!config.DATABASE_URL.startsWith('postgresql://')) {
      errors.push('DATABASE_URL must be a valid PostgreSQL connection string');
    }
    
    if (!config.APP_URL.startsWith('https://')) {
      errors.push('APP_URL must use HTTPS in production');
    }
  }
  
  // Validate URL formats
  try {
    new URL(config.APP_URL);
  } catch (error) {
    errors.push(`Invalid APP_URL format: ${config.APP_URL}`);
  }
  
  try {
    new URL(config.ESPN_BASE_URL);
  } catch (error) {
    errors.push(`Invalid ESPN_BASE_URL format: ${config.ESPN_BASE_URL}`);
  }
  
  try {
    new URL(config.ESPN_FANTASY_URL);
  } catch (error) {
    errors.push(`Invalid ESPN_FANTASY_URL format: ${config.ESPN_FANTASY_URL}`);
  }
  
  // Validate ranges
  if (config.PORT < 1 || config.PORT > 65535) {
    errors.push(`PORT must be between 1 and 65535, got: ${config.PORT}`);
  }
  
  if (config.SCORE_REFRESH_INTERVAL < 1000) {
    errors.push('SCORE_REFRESH_INTERVAL must be at least 1000ms');
  }
  
  if (config.NEWS_REFRESH_INTERVAL < 60000) {
    errors.push('NEWS_REFRESH_INTERVAL must be at least 60000ms (1 minute)');
  }
  
  if (config.PLAYER_REFRESH_INTERVAL < 3600000) {
    errors.push('PLAYER_REFRESH_INTERVAL must be at least 3600000ms (1 hour)');
  }
  
  if (errors.length > 0) {
    console.error('❌ Configuration validation failed:');
    errors.forEach(error => console.error(`  - ${error}`));
    
    if (config.NODE_ENV === 'production') {
      throw new Error('Invalid configuration in production environment');
    } else {
      console.warn('⚠️  Continuing with invalid configuration in development mode');
    }
  } else {
    console.log('✅ Configuration validation passed');
  }
}

/**
 * Get database configuration
 */
export function getDatabaseConfig() {
  return {
    url: config.DATABASE_URL,
    directUrl: config.DIRECT_DATABASE_URL,
    log: config.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    maxConnections: config.NODE_ENV === 'production' ? 50 : 10,
  };
}

/**
 * Get authentication configuration
 */
export function getAuthConfig() {
  return {
    secret: config.NEXTAUTH_SECRET,
    url: config.NEXTAUTH_URL,
    auth0: config.AUTH0_DOMAIN ? {
      domain: config.AUTH0_DOMAIN,
      clientId: config.AUTH0_CLIENT_ID!,
      clientSecret: config.AUTH0_CLIENT_SECRET!,
      audience: config.AUTH0_AUDIENCE,
    } : null,
  };
}

/**
 * Get feature flags
 */
export function getFeatureFlags() {
  return {
    liveScoring: config.ENABLE_LIVE_SCORING,
    newsFeed: config.ENABLE_NEWS_FEED,
    playerSync: config.ENABLE_PLAYER_SYNC,
  };
}

/**
 * Get refresh intervals
 */
export function getRefreshIntervals() {
  return {
    scores: config.SCORE_REFRESH_INTERVAL,
    news: config.NEWS_REFRESH_INTERVAL,
    players: config.PLAYER_REFRESH_INTERVAL,
  };
}

/**
 * Get external API configuration
 */
export function getApiConfig() {
  return {
    espn: {
      baseUrl: config.ESPN_BASE_URL,
      fantasyUrl: config.ESPN_FANTASY_URL,
    },
  };
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return config.NODE_ENV === 'production';
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
  return config.NODE_ENV === 'development';
}

/**
 * Check if running in test
 */
export function isTest(): boolean {
  return config.NODE_ENV === 'test';
}

// Validate configuration on module load (except in test environment)
if (!isTest()) {
  validateConfig();
}

export default config;