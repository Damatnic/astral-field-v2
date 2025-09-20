import { z } from 'zod';

/**
 * Specify your server-side environment variables schema here.
 * This way you can ensure the app isn't built with invalid env vars.
 */
const serverSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().url(),
  
  // Authentication
  NEXTAUTH_URL: z.string().url().optional(),
  NEXTAUTH_SECRET: z.string().min(32).optional(),
  
  // Session configuration
  SESSION_SECRET: z.string().min(32).optional(),
  SESSION_DURATION_DAYS: z.coerce.number().min(1).max(365).default(7),
  
  // Rate limiting
  RATE_LIMIT_ENABLED: z.coerce.boolean().default(true),
  
  // API Keys (optional for development)
  SLEEPER_API_KEY: z.string().optional(),
  NFL_API_KEY: z.string().optional(),
  
  // Email configuration (optional)
  EMAIL_FROM: z.string().email().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  
  // Feature flags
  ENABLE_ANALYTICS: z.coerce.boolean().default(false),
  ENABLE_SENTRY: z.coerce.boolean().default(false),
  SENTRY_DSN: z.string().url().optional(),
});

/**
 * Specify your client-side environment variables schema here.
 * This way you can ensure the app isn't built with invalid env vars.
 * To expose them to the client, prefix them with `NEXT_PUBLIC_`.
 */
const clientSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_API_URL: z.string().url().optional(),
  NEXT_PUBLIC_ENABLE_ANALYTICS: z.coerce.boolean().default(false),
  NEXT_PUBLIC_GA_ID: z.string().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
});

/**
 * You can't destruct `process.env` as a regular object, so you have to do
 * it manually here. This is because Next.js evaluates this at build time,
 * and only used environment variables are included in the build.
 */
const processEnv = {
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL,
  
  // Authentication
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  
  // Session
  SESSION_SECRET: process.env.SESSION_SECRET,
  SESSION_DURATION_DAYS: process.env.SESSION_DURATION_DAYS,
  
  // Rate limiting
  RATE_LIMIT_ENABLED: process.env.RATE_LIMIT_ENABLED,
  
  // APIs
  SLEEPER_API_KEY: process.env.SLEEPER_API_KEY,
  NFL_API_KEY: process.env.NFL_API_KEY,
  
  // Email
  EMAIL_FROM: process.env.EMAIL_FROM,
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASSWORD: process.env.SMTP_PASSWORD,
  
  // Features
  ENABLE_ANALYTICS: process.env.ENABLE_ANALYTICS,
  ENABLE_SENTRY: process.env.ENABLE_SENTRY,
  SENTRY_DSN: process.env.SENTRY_DSN,
  
  // Client vars
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_ENABLE_ANALYTICS: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS,
  NEXT_PUBLIC_GA_ID: process.env.NEXT_PUBLIC_GA_ID,
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
};

// Don't touch the part below
// --------------------------

const merged = serverSchema.merge(clientSchema);
const parsed = merged.safeParse(processEnv);

if (parsed.success === false) {
  console.error(
    '❌ Invalid environment variables:',
    parsed.error.flatten().fieldErrors
  );
  
  // Only throw in production - in dev, we can work with partial config
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Invalid environment variables');
  }
}

export const env = parsed.success ? parsed.data : ({} as z.infer<typeof merged>);

// Type-safe environment variables
export type Env = z.infer<typeof merged>;

// Helper to check if running in production
export const isProduction = env.NODE_ENV === 'production';

// Helper to check if running in development
export const isDevelopment = env.NODE_ENV === 'development';

// Helper to get database URL with fallback
export function getDatabaseUrl(): string {
  if (!env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not defined');
  }
  return env.DATABASE_URL;
}

// Helper to get session secret with fallback
export function getSessionSecret(): string {
  return env.SESSION_SECRET || env.NEXTAUTH_SECRET || 'dev-secret-change-in-production';
}

// Helper to check if feature is enabled
export function isFeatureEnabled(feature: 'analytics' | 'sentry' | 'rateLimit'): boolean {
  switch (feature) {
    case 'analytics':
      return env.ENABLE_ANALYTICS === true;
    case 'sentry':
      return env.ENABLE_SENTRY === true && !!env.SENTRY_DSN;
    case 'rateLimit':
      return env.RATE_LIMIT_ENABLED !== false;
    default:
      return false;
  }
}