/**
 * Centralized Environment Configuration
 * All environment variables and configuration values are managed here
 */

require('dotenv').config();
const logger = require('./logger');

class EnvironmentConfig {
  constructor() {
    this.validateRequiredVariables();
  }

  /**
   * Server Configuration
   */
  get server() {
    return {
      port: parseInt(process.env.PORT) || 3000,
      nodeEnv: process.env.NODE_ENV || 'development',
      isDevelopment: process.env.NODE_ENV === 'development',
      isProduction: process.env.NODE_ENV === 'production',
      isTest: process.env.NODE_ENV === 'test'
    };
  }

  /**
   * Redis Configuration
   */
  get redis() {
    return {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      retryStrategy: {
        maxRetryTime: 1000 * 60 * 60, // 1 hour
        maxAttempts: 10,
        minDelay: 100,
        maxDelay: 3000
      }
    };
  }

  /**
   * Shopify Configuration
   */
  get shopify() {
    return {
      storeDomain: process.env.SHOPIFY_STORE_DOMAIN,
      storefrontAccessToken: process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN,
      adminAccessToken: process.env.SHOPIFY_ADMIN_ACCESS_TOKEN,
      apiVersion: '2024-10',
      urls: {
        storefront: `https://${process.env.SHOPIFY_STORE_DOMAIN}/api/2024-10/graphql.json`,
        adminGraphQL: `https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/2024-10/graphql.json`,
        adminREST: `https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/2024-10`
      }
    };
  }

  /**
   * SMS Service Configuration
   */
  get sms() {
    return {
      baseURL: process.env.SMS_API_BASE_URL || '',
      apiToken: process.env.SMS_API_TOKEN || '',
      sid: process.env.SMS_SID || '',
      enabled: process.env.SMS_ENABLED === 'true' || true,
      timeout: parseInt(process.env.SMS_TIMEOUT_MS) || 30000,
      mockSending: process.env.MOCK_SMS_SENDING === 'true' || false,
      maxLength: 1000,
      csmsIdPrefix: 'OTP_'
    };
  }

  /**
   * OTP Configuration
   */
  get otp() {
    return {
      secretKey: process.env.HMAC_SECRET,
      expiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES) || 10,
      length: 6,
      resendWaitMinutes: 2,
      maxAttempts: 3,
      timeWindowMinutes: 5
    };
  }

  /**
   * Rate Limiting Configuration
   */
  get rateLimit() {
    return {
      windowMinutes: parseInt(process.env.RATE_LIMIT_WINDOW_MINUTES) || 15,
      maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
      otpSend: {
        windowMs: 60 * 1000, // 1 minute
        maxAttempts: 5
      },
      otpVerify: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxAttempts: 10
      },
      otpResend: {
        windowMs: 2 * 60 * 1000, // 2 minutes
        maxAttempts: 3
      }
    };
  }

  /**
   * Security Configuration
   */
  get security() {
    return {
      cors: {
        origin: process.env.CORS_ORIGIN ? 
          process.env.CORS_ORIGIN.split(',').map(origin => origin.trim()) : 
          ['*'],
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
        credentials: true,
        optionsSuccessStatus: 200,
        preflightContinue: false
      },
      helmet: {
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"]
          }
        },
        crossOriginEmbedderPolicy: false
      },
      password: {
        saltRounds: 12,
        minLength: 8,
        maxLength: 128
      }
    };
  }

  /**
   * API Configuration
   */
  get api() {
    return {
      basePath: '/api',
      version: '1.0.0',
      timeout: 30000,
      maxRequestSize: '10mb',
      frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
      swagger: {
        title: 'OTP Authentication API',
        description: 'A comprehensive OTP-based authentication system with Shopify integration',
        version: '1.0.0',
        contact: {
          name: 'Shajedul Islam Shuvo',
          email: 'shajedulislam@example.com'
        },
        servers: [
          {
            url: this.server.isProduction ? 
              'https://your-production-domain.com' : 
              `http://localhost:${this.server.port}`,
            description: this.server.isProduction ? 'Production server' : 'Development server'
          }
        ]
      }
    };
  }

  /**
   * Email Configuration
   */
  get email() {
    return {
      enabled: process.env.EMAIL_ENABLED === 'true' || true,
      mockSending: process.env.MOCK_EMAIL_SENDING === 'true' || true,
      provider: process.env.EMAIL_PROVIDER || 'mock',
      fromEmail: process.env.EMAIL_FROM || 'noreply@example.com',
      fromName: process.env.EMAIL_FROM_NAME || 'OTP Authentication Service',
      timeout: parseInt(process.env.EMAIL_TIMEOUT_MS) || 30000,
      
      // SendGrid configuration (example)
      sendgrid: {
        apiKey: process.env.SENDGRID_API_KEY,
        templateId: process.env.SENDGRID_LOGIN_TEMPLATE_ID
      },
      
      // Mailgun configuration (example)
      mailgun: {
        apiKey: process.env.MAILGUN_API_KEY,
        domain: process.env.MAILGUN_DOMAIN
      },
      
      // AWS SES configuration (example)
      ses: {
        region: process.env.AWS_SES_REGION || 'us-east-1',
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
    };
  }

  /**
   * Sentry Configuration
   */
  get sentry() {
    return {
      dsn: process.env.SENTRY_DSN,
      environment: this.server.nodeEnv,
      enabled: process.env.SENTRY_ENABLED === 'true' && !!process.env.SENTRY_DSN,
      debug: this.server.isDevelopment,
      tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE) || 0.1,
      profilesSampleRate: parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE) || 0.1,
      release: process.env.SENTRY_RELEASE || `otp-backend@${require('../../package.json').version}`,
      beforeSend: (event) => {
        // Filter out sensitive data
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
    };
  }

  /**
   * Logging Configuration
   */
  get logging() {
    return {
      level: this.server.isDevelopment ? 'debug' : 'info',
      enableRequestLogging: true,
      enableErrorLogging: true,
      maskSensitiveData: true,
      sensitiveFields: ['password', 'otp', 'token', 'secret'],
      sentry: this.sentry
    };
  }

  /**
   * Validation Configuration
   */
  get validation() {
    return {
      phone: {
        pattern: /^(\+8801[3-9]\d{8}|01[3-9]\d{8})$/,
        minLength: 11,
        maxLength: 15
      },
      otp: {
        pattern: /^[0-9]{6}$/,
        length: 6
      },
      email: {
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        maxLength: 254
      },
      name: {
        pattern: /^[a-zA-Z\s]+$/,
        minLength: 2,
        maxLength: 100
      }
    };
  }

  /**
   * Database Configuration
   */
  get database() {
    return {
      redis: this.redis,
      keyPrefixes: {
        otp: 'otp:',
        customer: 'customer:',
        rateLimit: 'rate_limit:',
        attempts: 'attempts:'
      },
      defaultTTL: 3600 // 1 hour in seconds
    };
  }

  /**
   * External Services Configuration
   */
  get externalServices() {
    return {
      shopify: this.shopify,
      sms: this.sms,
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000
    };
  }

  /**
   * Validate required environment variables
   */
  validateRequiredVariables() {
    const requiredVars = [
      'REDIS_HOST',
      'SHOPIFY_STORE_DOMAIN',
      'HMAC_SECRET'
    ];

    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      logger.error('ERROR: Missing required environment variables:', missingVars.join(', '));
      logger.error('Please check your .env file and ensure all required variables are set.');
      process.exit(1);
    }
  }


  /**
   * Check if configuration is valid
   * @returns {object} Validation result
   */
  validateConfiguration() {
    const errors = [];
    const warnings = [];

    // Check required configurations
    if (!this.redis.host) {
      errors.push('Redis host is required');
    }

    if (!this.shopify.storeDomain) {
      errors.push('Shopify store domain is required');
    }

    if (!this.shopify.adminAccessToken && !this.shopify.storefrontAccessToken) {
      warnings.push('Either Shopify Admin or Storefront access token is recommended');
    }

    if (!this.sms.baseURL || !this.sms.apiToken || !this.sms.sid) {
      warnings.push('SMS service configuration is incomplete - SMS functionality will be limited');
    }

    if (this.otp.secretKey === 'default_secret_key_please_change_in_production') {
      warnings.push('Using default OTP secret key - change this in production');
    }

    if (this.security.cors.origin.includes('*') && this.server.isProduction) {
      warnings.push('CORS is set to allow all origins in production - consider restricting this');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}

// Create and export singleton instance
const config = new EnvironmentConfig();

module.exports = config;
