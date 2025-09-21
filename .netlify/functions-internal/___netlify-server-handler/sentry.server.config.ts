// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
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

    // Enable logs to be sent to Sentry
    enableLogs: true,

    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: process.env.NODE_ENV === 'development',

    // Environment configuration
    environment: process.env.NODE_ENV || 'development',

    // Release tracking
    release: process.env.NEXT_PUBLIC_APP_VERSION || '2.1.0',

    // Performance monitoring for server-side
    beforeSend(event) {
      // Don't send events in development
      if (process.env.NODE_ENV === 'development') {
        console.log('Sentry server event:', event);
        return null;
      }
      return event;
    },

    // Additional tags
    initialScope: {
      tags: {
        component: 'server',
        platform: 'nextjs',
      },
    },
  });
} else {
  console.warn('Sentry server initialization skipped - invalid or missing DSN configuration');
}
