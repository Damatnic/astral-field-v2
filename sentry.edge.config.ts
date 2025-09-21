// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
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

    // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
    tracesSampleRate: 1,


    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: process.env.NODE_ENV === 'development',

    // Environment configuration
    environment: process.env.NODE_ENV || 'development',

    // Release tracking
    release: process.env.NEXT_PUBLIC_APP_VERSION || '2.1.0',

    // Performance monitoring for edge runtime
    beforeSend(event) {
      // Don't send events in development
      if (process.env.NODE_ENV === 'development') {
        console.log('Sentry edge event:', event);
        return null;
      }
      return event;
    },

    // Additional tags
    initialScope: {
      tags: {
        component: 'edge',
        platform: 'nextjs',
      },
    },
  });
} else {
  console.warn('Sentry edge initialization skipped - invalid or missing DSN configuration');
}
