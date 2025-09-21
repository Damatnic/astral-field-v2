// This file configures the initialization of Sentry on the browser side.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

// Only initialize Sentry if we have a valid DSN
const sentryDSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
const hasValidDSN = sentryDSN && 
                    !sentryDSN.includes('placeholder') && 
                    sentryDSN.startsWith('https://');

if (hasValidDSN) {
  Sentry.init({
    dsn: sentryDSN,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 1,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: process.env.NODE_ENV === 'development',

  replaysOnErrorSampleRate: 1.0,

  // This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  replaysSessionSampleRate: 0.1,

  // You can remove this option if you're not planning to use the Sentry Session Replay feature:
  integrations: [
    Sentry.replayIntegration({
      // Additional Replay configuration goes in here, for example:
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Performance monitoring for client-side
  beforeSend(event) {
    // Don't send events in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Sentry event:', event);
      return null;
    }
    return event;
  },

  // Environment configuration
  environment: process.env.NODE_ENV || 'development',

  // Release tracking
  release: process.env.NEXT_PUBLIC_APP_VERSION || '2.1.0',

    // Additional tags
    initialScope: {
      tags: {
        component: 'client',
        platform: 'nextjs',
      },
    },
  });
} else {
  console.warn('Sentry client initialization skipped - invalid or missing DSN configuration');
}