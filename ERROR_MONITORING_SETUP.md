# Comprehensive Error Tracking and Monitoring System

This document provides a complete guide for the production-ready error tracking and monitoring system implemented for the Astral Field fantasy football platform.

## System Overview

The error monitoring system provides:
- **Comprehensive Error Capture**: Client-side, server-side, and database error tracking
- **Intelligent Classification**: Automatic error categorization and severity assessment
- **Real-time Monitoring**: Live error tracking with alerting and notifications
- **Advanced Analytics**: Detailed error metrics, trends, and insights
- **User-Friendly Fallbacks**: Graceful error handling with recovery mechanisms
- **Privacy & Security**: Sanitized error data with GDPR compliance

## Architecture Components

### 1. Core Error Tracking Service (`/src/lib/error-tracking.ts`)
- Central error tracking with classification and prioritization
- Error deduplication using fingerprinting
- Rate limiting to prevent spam
- Error budgets and thresholds
- Integration with Sentry for external monitoring

### 2. Client-Side Error Handling
- **ErrorProvider** (`/src/components/error/ErrorProvider.tsx`): Comprehensive client-side error capture
- **Enhanced ErrorBoundary** (`/src/components/ErrorBoundary.tsx`): React error boundary with tracking
- **Fallback Components** (`/src/components/error/FallbackComponents.tsx`): User-friendly error UI states

### 3. Server-Side Error Middleware (`/src/lib/api-error-middleware.ts`)
- API route error tracking with structured logging
- Request/response correlation
- Performance monitoring
- Security event logging

### 4. Database Error Tracking (`/src/lib/db-error-wrapper.ts`)
- Enhanced Prisma client with error tracking
- Database operation monitoring
- Connection health tracking
- Query performance analysis

### 5. Real-Time Alerting (`/src/lib/error-alerting.ts`)
- Configurable alert rules
- Multiple notification channels (webhook, email, Slack, etc.)
- Alert suppression and cooldowns
- System health monitoring

### 6. Analytics Dashboard (`/src/app/admin/errors/page.tsx`)
- Real-time error metrics
- Trend analysis and visualization
- Error breakdown by category, severity, component
- Export capabilities

## Setup Instructions

### 1. Environment Variables

Add the following environment variables to your `.env` file:

```bash
# Sentry Configuration (already configured)
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn_here

# Error Monitoring Configuration
LOG_LEVEL=info
NEXT_PUBLIC_APP_VERSION=2.1.0

# Alert Webhook URLs (optional)
CRITICAL_ALERT_WEBHOOK=https://your-webhook-url.com/critical
ERROR_RATE_WEBHOOK=https://your-webhook-url.com/error-rate
DB_ERROR_WEBHOOK=https://your-webhook-url.com/database
SECURITY_ALERT_WEBHOOK=https://your-webhook-url.com/security

# Database URL (already configured)
DATABASE_URL=your_database_url_here
```

### 2. Database Setup

Run the database migration to create error tracking tables:

```bash
# Apply the error logging schema
psql $DATABASE_URL -f prisma/migrations/001_add_error_logging_tables.sql
```

### 3. Client-Side Integration

Wrap your app with the ErrorProvider in your main layout:

```tsx
// In your root layout.tsx or _app.tsx
import { ErrorProvider } from '@/components/error/ErrorProvider';
import { Toaster } from 'react-hot-toast';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <ErrorProvider
          enableToastNotifications={true}
          enableOfflineDetection={true}
          maxErrorsBeforeReload={10}
        >
          {children}
          <Toaster position="top-right" />
        </ErrorProvider>
      </body>
    </html>
  );
}
```

### 4. API Route Integration

Wrap your API routes with error handling middleware:

```tsx
// Example API route with error tracking
import { withErrorHandling, createSuccessResponse } from '@/lib/api-error-middleware';

async function handler(request: NextRequest) {
  // Your API logic here
  const data = await someOperation();
  
  return createSuccessResponse(data, {
    requestId: request.headers.get('x-request-id') || undefined
  });
}

export const GET = withErrorHandling(handler, {
  enableDetailedErrors: process.env.NODE_ENV === 'development',
  enablePerformanceLogging: true,
  enableSecurityLogging: true
});
```

### 5. Database Operation Integration

Replace direct Prisma calls with tracked operations:

```tsx
// Instead of direct Prisma usage
// const user = await prisma.user.findUnique({ where: { id } });

// Use tracked database operations
import { trackedDB } from '@/lib/db-error-wrapper';

const user = await trackedDB.user.findUnique(
  { where: { id } },
  { 
    userId: currentUserId,
    requestId: request.headers.get('x-request-id') || undefined,
    metadata: { operation: 'get-user-profile' }
  }
);
```

### 6. Component Error Handling

Use error reporting hooks in your components:

```tsx
import { useErrorReporting, useAsyncErrorHandler } from '@/components/error/ErrorProvider';

function MyComponent() {
  const { reportError, reportUserError } = useErrorReporting();
  const { handleAsyncError } = useAsyncErrorHandler();

  const handleUserAction = async () => {
    const result = await handleAsyncError(
      async () => {
        // Your async operation
        return await fetchSomeData();
      },
      {
        category: ErrorCategory.USER_ERROR,
        context: { component: 'MyComponent', action: 'fetch-data' },
        showToast: true,
        fallbackValue: null
      }
    );

    if (!result) {
      reportUserError('Failed to load data. Please try again.');
    }
  };

  return (
    <div>
      {/* Your component JSX */}
      <button onClick={handleUserAction}>Load Data</button>
    </div>
  );
}
```

## Error Categories and Severity Levels

### Severity Levels
- **CRITICAL**: System-breaking errors requiring immediate attention
- **HIGH**: Serious errors affecting functionality or many users
- **MEDIUM**: Moderate errors with workarounds available
- **LOW**: Minor issues or warnings

### Error Categories
- **SYSTEM_ERROR**: Internal system failures
- **USER_ERROR**: User input or action errors
- **NETWORK_ERROR**: Connection and API failures
- **DATABASE_ERROR**: Database operation failures
- **AUTHENTICATION_ERROR**: Login and auth failures
- **AUTHORIZATION_ERROR**: Permission and access errors
- **VALIDATION_ERROR**: Data validation failures
- **BUSINESS_LOGIC_ERROR**: Application logic errors
- **PERFORMANCE_ERROR**: Slow operations and timeouts
- **INTEGRATION_ERROR**: External service failures

## Monitoring and Alerting

### Default Alert Rules

1. **Critical Errors**: Any critical error triggers immediate alert
2. **High Error Rate**: >10 errors/hour triggers alert
3. **Database Errors**: >5 database errors in 15 minutes
4. **Auth Error Spike**: >10 auth errors in 10 minutes (potential attack)

### Alert Actions

- **Webhook**: POST to configured webhook URLs
- **Log**: Structured logging with appropriate severity
- **Email**: Send email notifications (configure separately)
- **Slack**: Post to Slack channels (configure separately)

### Webhook Payload Format

```json
{
  "alertId": "alert_12345",
  "severity": "critical",
  "message": "Critical Errors: 1 errors detected (12.0 errors/hour)",
  "triggeredAt": "2025-01-15T10:30:00Z",
  "details": {
    "errorCount": 1,
    "errorRate": 12.0,
    "timeWindow": 5,
    "topErrors": [
      {
        "message": "Database connection failed",
        "severity": "critical",
        "category": "database_error",
        "count": 1,
        "component": "user-service"
      }
    ]
  },
  "environment": "production",
  "timestamp": "2025-01-15T10:30:00Z"
}
```

## Dashboard Access

The error monitoring dashboard is available at `/admin/errors` and provides:

- **Real-time Metrics**: Error counts, rates, and trends
- **Error Breakdown**: By severity, category, and component
- **Top Errors**: Most frequent error patterns
- **System Health**: Overall platform health status
- **Time Range Filters**: 1h, 6h, 24h, 7d, 30d views
- **Export Functionality**: Download error reports as JSON

## Performance Considerations

### Database Optimization
- Indexes on frequently queried columns
- Hourly aggregation of metrics
- Automatic cleanup of old error logs
- Connection pooling and monitoring

### Rate Limiting
- 100 error reports per minute per IP
- 10 errors per 5 minutes per fingerprint
- Webhook retry logic with exponential backoff

### Memory Management
- Error queue size limits (1000 errors max)
- Local storage cleanup (50 errors max)
- Automatic resolution of old errors

## Privacy and Security

### Data Sanitization
- Sensitive fields automatically redacted
- Stack traces truncated in production
- User data anonymized where possible
- GDPR-compliant data handling

### Security Features
- Rate limiting to prevent abuse
- Request ID correlation for tracking
- Security event logging
- Webhook URL validation

## Best Practices

### Error Handling
1. **Be Specific**: Use appropriate error categories and severity levels
2. **Provide Context**: Include relevant metadata and user information
3. **User-Friendly Messages**: Show helpful error messages to users
4. **Recovery Options**: Provide retry mechanisms and fallback options

### Monitoring
1. **Set Appropriate Thresholds**: Avoid alert fatigue with reasonable limits
2. **Monitor Trends**: Look for patterns and recurring issues
3. **Regular Reviews**: Weekly error analysis and cleanup
4. **Team Notifications**: Ensure alerts reach the right people

### Performance
1. **Async Error Reporting**: Don't block user operations
2. **Batch Operations**: Group error reports where possible
3. **Efficient Queries**: Use database indexes for fast lookups
4. **Cache Results**: Cache dashboard data where appropriate

## Troubleshooting

### Common Issues

1. **High Error Rates**: Check for bugs in recent deployments
2. **Database Errors**: Monitor connection pool and query performance
3. **Alert Spam**: Adjust thresholds and cooldown periods
4. **Missing Errors**: Verify error tracking is properly integrated

### Debug Tools

- Browser console for client-side errors
- Server logs for API errors
- Database query logs for DB issues
- Sentry dashboard for external monitoring

## Maintenance

### Regular Tasks
- Weekly error report reviews
- Monthly alert rule optimization
- Quarterly performance analysis
- Annual security audit

### Cleanup
- Archive resolved errors older than 90 days
- Compress historical metrics data
- Remove unused alert configurations
- Update error message templates

## Integration with External Services

### Sentry
- Automatic error reporting to Sentry
- Release tracking and deployment correlation
- Performance monitoring integration
- User feedback collection

### Webhooks
- Slack/Teams integration for team notifications
- PagerDuty integration for on-call alerts
- Custom monitoring tool integration
- ITSM system integration

This comprehensive error monitoring system provides production-ready visibility into your application's health, enabling proactive issue resolution and improved user experience.