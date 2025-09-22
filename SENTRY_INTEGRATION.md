# Sentry Integration Guide

This document explains how Sentry error tracking has been integrated into the OTP Backend application.

## Overview

Sentry is now integrated to automatically capture and track errors, providing real-time error monitoring and performance insights for the application.

## Configuration

### Environment Variables

Add the following environment variables to your `.env` file:

```env
# Sentry Configuration (Error Tracking)
SENTRY_DSN=your_sentry_dsn_here
SENTRY_ENABLED=true
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_PROFILES_SAMPLE_RATE=0.1
SENTRY_RELEASE=otp-backend@1.0.0
```

### Configuration Options

- **SENTRY_DSN**: Your Sentry project DSN (Data Source Name)
- **SENTRY_ENABLED**: Enable/disable Sentry (set to `false` for development if needed)
- **SENTRY_TRACES_SAMPLE_RATE**: Percentage of transactions to trace (0.1 = 10%)
- **SENTRY_PROFILES_SAMPLE_RATE**: Percentage of transactions to profile (0.1 = 10%)
- **SENTRY_RELEASE**: Release version for tracking deployments

## Features Implemented

### 1. Automatic Error Capture

- **Winston Logger Integration**: All `error` and `warn` level logs are automatically sent to Sentry
- **Global Error Handler**: Unhandled errors are captured with request context
- **Service-Specific Errors**: Shopify, database, and validation errors are tagged appropriately

### 2. Data Privacy & Security

- **Sensitive Data Filtering**: Passwords, OTPs, tokens, and secrets are automatically redacted
- **Request Context**: Captures relevant request information without exposing sensitive data
- **Environment-Aware**: Different behavior for development vs production environments

### 3. Error Categorization

Errors are automatically tagged with:
- **Error Type**: `SHOPIFY_ERROR`, `DATABASE_ERROR`, `VALIDATION_ERROR`, etc.
- **Service**: Which service/component generated the error
- **Context**: Additional context about where the error occurred

### 4. Performance Monitoring

- **Transaction Tracing**: HTTP requests are traced for performance insights
- **Custom Sampling**: Health check endpoints are sampled at a lower rate (1%)
- **Performance Profiling**: CPU and memory profiling for performance optimization

## Usage Examples

### Manual Error Capture

```javascript
const { captureException, captureMessage } = require('./config/sentry');

// Capture an exception with context
try {
  // Some risky operation
} catch (error) {
  captureException(error, {
    tags: {
      operation: 'user_signup',
      service: 'customer'
    },
    extra: {
      userId: user.id,
      timestamp: new Date().toISOString()
    }
  });
}

// Capture a message
captureMessage('Important event occurred', 'info', {
  tags: { event: 'user_action' },
  extra: { details: 'Additional context' }
});
```

### Adding Breadcrumbs

```javascript
const { addBreadcrumb } = require('./config/sentry');

addBreadcrumb({
  message: 'User initiated OTP request',
  category: 'user_action',
  level: 'info',
  data: {
    phoneNumber: '[REDACTED]',
    timestamp: new Date().toISOString()
  }
});
```

## Integration Points

### 1. Application Startup (`src/app.js`)
- Sentry is initialized before any other modules
- Global error handler captures unhandled exceptions

### 2. Winston Logger (`src/config/logger.js`)
- Custom Sentry transport sends logs to Sentry
- Automatic filtering of sensitive data

### 3. Error Handler (`src/utils/errorHandler.js`)
- All error handling methods now send errors to Sentry
- Contextual information is added for better debugging

### 4. Service Layer
- Database errors, Shopify errors, and validation errors are automatically captured
- Service-specific tags help with error categorization

## Monitoring & Alerts

Once configured, Sentry will provide:

1. **Real-time Error Notifications**: Get notified immediately when errors occur
2. **Error Trends**: Track error frequency and patterns over time
3. **Performance Insights**: Monitor API response times and bottlenecks
4. **Release Tracking**: See how errors correlate with deployments
5. **User Impact**: Understand how many users are affected by issues

## Best Practices

1. **Set Appropriate Sample Rates**: Don't capture 100% of transactions in production
2. **Use Tags Consistently**: Consistent tagging helps with filtering and alerting
3. **Filter Sensitive Data**: Always ensure sensitive information is redacted
4. **Monitor Performance Impact**: Sentry adds minimal overhead but monitor in production
5. **Set Up Alerts**: Configure Sentry alerts for critical errors

## Troubleshooting

### Sentry Not Capturing Errors

1. Check that `SENTRY_ENABLED=true` in your environment
2. Verify your `SENTRY_DSN` is correct
3. Check console logs for Sentry initialization messages
4. Ensure errors are being logged at `warn` or `error` level

### Too Many Events

1. Reduce `SENTRY_TRACES_SAMPLE_RATE` and `SENTRY_PROFILES_SAMPLE_RATE`
2. Add more specific filtering in the `beforeSend` function
3. Use Sentry's quota management features

### Missing Context

1. Ensure errors are being captured through the proper error handlers
2. Add more breadcrumbs for better context
3. Include relevant tags and extra data when manually capturing errors

## Development vs Production

- **Development**: Sentry can be disabled or set to debug mode for detailed logging
- **Production**: Enable Sentry with appropriate sample rates and filtering
- **Staging**: Use a separate Sentry project for staging environment

## Security Considerations

- Sensitive data is automatically filtered before sending to Sentry
- Request bodies and headers are sanitized
- User data is not included in error reports by default
- All filtering happens client-side before data leaves your server
