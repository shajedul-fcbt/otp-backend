/**
 * Sentry Configuration and Initialization
 */

const Sentry = require('@sentry/node');
const config = require('./environment');

/**
 * Initialize Sentry with configuration
 */
function initializeSentry() {
  if (!config.sentry.enabled) {
    console.log('Sentry is disabled or DSN not provided');
    return;
  }

  if (!config.sentry.dsn) {
    console.log('Sentry DSN not provided, skipping initialization');
    return;
  }

  try {
    console.log('Initializing Sentry with DSN:', config.sentry.dsn.substring(0, 20) + '...');
    
    // Basic Sentry configuration without complex integrations
    Sentry.init({
      dsn: config.sentry.dsn,
      environment: config.sentry.environment,
      debug: false,
      tracesSampleRate: 0, // Disable performance monitoring
      profilesSampleRate: 0,
      
      // Filter sensitive data before sending
      beforeSend: (event) => {
        // Remove sensitive data
        if (event.extra) {
          const sensitiveFields = ['password', 'otp', 'token', 'secret', 'apiToken', 'accessToken'];
          sensitiveFields.forEach(field => {
            if (event.extra[field]) {
              event.extra[field] = '[REDACTED]';
            }
          });
        }
        return event;
      }
    });

    console.log('Sentry initialized successfully');
    
    // Send a simple test message to verify Sentry is working
    setTimeout(() => {
      Sentry.captureMessage('Sentry integration test - OTP Backend started', 'info');
      
    }, 1000); // Delay to avoid initialization conflicts
    
    // Add Sentry transport to Winston logger
    try {
      const logger = require('./logger');
      if (logger && typeof logger.addSentryTransport === 'function') {
        logger.addSentryTransport();
      }
    } catch (error) {
      console.error('Failed to add Sentry transport to logger:', error.message);
    }
  } catch (error) {
    console.error('Failed to initialize Sentry:', error.message);
  }
}

/**
 * Custom Winston transport for Sentry
 */
class SentryTransport extends require('winston-transport') {
  constructor(opts = {}) {
    super(opts);
    this.name = 'sentry';
    this.level = opts.level || 'error';
    this.enabled = config.sentry.enabled;
  }

  log(info, callback) {
    if (!this.enabled) {
      callback();
      return true;
    }

    setImmediate(() => {
      try {
        const { level, message, ...meta } = info;
        
        // Map Winston levels to Sentry levels
        const sentryLevel = this.mapWinstonLevelToSentry(level);
        
        // Create Sentry scope with additional context
        Sentry.withScope((scope) => {
          scope.setLevel(sentryLevel);
          scope.setTag('logger', 'winston');
          scope.setTag('service', 'otp-backend');
          
          // Add metadata as extra context
          if (meta && Object.keys(meta).length > 0) {
            // Filter sensitive data
            const filteredMeta = this.filterSensitiveData(meta);
            scope.setContext('metadata', filteredMeta);
          }
          
          // Handle different types of log entries
          if (info.error && info.error instanceof Error) {
            // If there's an error object, capture it as an exception
            scope.setTag('source', 'error_object');
            Sentry.captureException(info.error);
          } else if (level === 'error') {
            // For error level logs without error objects, capture as message
            scope.setTag('source', 'error_message');
            Sentry.captureMessage(message, 'error');
          } else if (level === 'warn') {
            // For warnings, capture as message with warning level
            scope.setTag('source', 'warning');
            Sentry.captureMessage(message, 'warning');
          } else {
            // For other levels, capture as message with info level
            scope.setTag('source', 'info');
            Sentry.captureMessage(message, 'info');
          }
        });
      } catch (error) {
        console.error('Error sending log to Sentry:', error);
      }
    });

    callback();
    return true;
  }

  /**
   * Map Winston log levels to Sentry levels
   * @param {string} winstonLevel - Winston log level
   * @returns {string} - Sentry log level
   */
  mapWinstonLevelToSentry(winstonLevel) {
    const levelMap = {
      error: 'error',
      warn: 'warning',
      info: 'info',
      http: 'info',
      debug: 'debug'
    };
    return levelMap[winstonLevel] || 'info';
  }

  /**
   * Filter sensitive data from metadata
   * @param {object} meta - Metadata object
   * @returns {object} - Filtered metadata
   */
  filterSensitiveData(meta) {
    const sensitiveFields = ['password', 'otp', 'token', 'secret', 'apiToken', 'accessToken'];
    const filtered = { ...meta };
    
    const filterRecursive = (obj) => {
      if (typeof obj !== 'object' || obj === null) return obj;
      
      const result = Array.isArray(obj) ? [] : {};
      
      for (const [key, value] of Object.entries(obj)) {
        if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
          result[key] = '[REDACTED]';
        } else if (typeof value === 'object' && value !== null) {
          result[key] = filterRecursive(value);
        } else {
          result[key] = value;
        }
      }
      
      return result;
    };
    
    return filterRecursive(filtered);
  }
}

/**
 * Capture exception manually
 * @param {Error} error - Error to capture
 * @param {object} context - Additional context
 */
function captureException(error, context = {}) {
  if (!config.sentry.enabled) {
    return;
  }

  Sentry.withScope((scope) => {
    // Add context information
    if (context.user) {
      scope.setUser({ id: context.user });
    }
    
    if (context.tags) {
      Object.entries(context.tags).forEach(([key, value]) => {
        scope.setTag(key, value);
      });
    }
    
    if (context.extra) {
      Object.entries(context.extra).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }
    
    scope.setTag('manual_capture', true);
    Sentry.captureException(error);
  });
}

/**
 * Capture message manually
 * @param {string} message - Message to capture
 * @param {string} level - Log level
 * @param {object} context - Additional context
 */
function captureMessage(message, level = 'info', context = {}) {
  if (!config.sentry.enabled) {
    return;
  }

  Sentry.withScope((scope) => {
    if (context.user) {
      scope.setUser({ id: context.user });
    }
    
    if (context.tags) {
      Object.entries(context.tags).forEach(([key, value]) => {
        scope.setTag(key, value);
      });
    }
    
    if (context.extra) {
      Object.entries(context.extra).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }
    
    scope.setTag('manual_capture', true);
    Sentry.captureMessage(message, level);
  });
}

/**
 * Add breadcrumb manually
 * @param {object} breadcrumb - Breadcrumb data
 */
function addBreadcrumb(breadcrumb) {
  if (!config.sentry.enabled) {
    return;
  }

  Sentry.addBreadcrumb({
    message: breadcrumb.message,
    category: breadcrumb.category || 'custom',
    level: breadcrumb.level || 'info',
    data: breadcrumb.data || {}
  });
}

module.exports = {
  initializeSentry,
  SentryTransport,
  captureException,
  captureMessage,
  addBreadcrumb,
  Sentry
};
