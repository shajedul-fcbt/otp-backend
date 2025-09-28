// Initialize Sentry first (must be before other imports)
const { initializeSentry } = require('./config/sentry');
initializeSentry();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const config = require('./config/environment');
const logger = require('./config/logger');

// Import middleware
const { generalLimiter, swaggerLimiter } = require('./middlewares/rateLimiter');
const { sanitizeInput, validateContentType, handleValidationError } = require('./middlewares/validation');

// Import routes
const otpRoutes = require('./routes/otpRoutes');
const customerRoutes = require('./routes/customerRoutes');
const healthRoutes = require('./routes/healthRoutes');
const loginLinkRoutes = require('./routes/loginLinkRoutes');

// Import configuration
const redisClient = require('./config/database');
const { swaggerUi, specs } = require('./config/swagger');
const shopifyService = require('./services/shopifyService');

// Create Express application
const app = express();
const PORT = config.server.port;

// ===== SECURITY MIDDLEWARE =====
// Helmet for security headers
app.use(helmet(config.security.helmet));

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // In development, allow all origins
    if (config.server.isDevelopment) {
      return callback(null, true);
    }
    
    // In production, check against allowed origins
    const allowedOrigins = config.security.cors.origin;
    
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: config.security.cors.methods,
  allowedHeaders: config.security.cors.allowedHeaders,
  credentials: config.security.cors.credentials,
  optionsSuccessStatus: config.security.cors.optionsSuccessStatus,
  preflightContinue: config.security.cors.preflightContinue
};

app.use(cors(corsOptions));

// Handle preflight requests explicitly
app.options('/{*any}', cors(corsOptions));

// ===== PARSING MIDDLEWARE =====
app.use(express.json({ limit: config.api.maxRequestSize }));
app.use(express.urlencoded({ extended: true, limit: config.api.maxRequestSize }));
app.use(cookieParser());

// ===== CUSTOM MIDDLEWARE =====
app.use(sanitizeInput);           // Sanitize input to prevent XSS
app.use(validateContentType);     // Validate Content-Type for POST/PUT requests

// ===== REQUEST LOGGING MIDDLEWARE =====
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.url;
  const ip = req.ip || req.connection.remoteAddress;
  
  logger.http(`${timestamp} - ${method} ${url} - IP: ${ip}`);
  
  // Log request body for debugging (exclude sensitive data)
  if (['POST', 'PUT', 'PATCH'].includes(method) && config.logging.enableRequestLogging && config.server.isDevelopment) {
    const logBody = { ...req.body };
    if (config.logging.maskSensitiveData) {
      config.logging.sensitiveFields.forEach(field => {
        if (logBody[field]) logBody[field] = '***';
      });
    }
    logger.debug('Request Body:', logBody);
  }
  
  next();
});

// ===== HEALTH CHECK ENDPOINTS =====
app.use('/health', healthRoutes);

// ===== API STATUS ENDPOINT =====
app.get('/api/status', async (req, res) => {
  try {
    // Check Redis connection
    const redisStatus = redisClient.isConnected ? 'connected' : 'disconnected';
    
    // Check Shopify connection
    const shopifyTest = await shopifyService.testConnection();
    
    res.status(200).json({
      success: true,
      message: 'API status check completed',
      services: {
        redis: {
          status: redisStatus,
          connected: redisClient.isConnected
        },
        shopify: {
          status: shopifyTest.success ? 'connected' : 'error',
          message: shopifyTest.message,
          configured: shopifyService.validateConfiguration().isValid
        }
      },
      server: {
        uptime: process.uptime(),
        environment: config.server.nodeEnv,
        version: config.api.version
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error checking API status',
      error: config.server.isDevelopment ? error.message : undefined
    });
  }
});

// ===== SENTRY TEST ENDPOINT (Development only) =====
if (config.server.isDevelopment) {
  app.get('/api/test-sentry', (req, res) => {
    try {
      const { captureMessage, captureException, addBreadcrumb } = require('./config/sentry');
      
      // Add breadcrumb
      addBreadcrumb({
        message: 'Sentry test endpoint called',
        category: 'test',
        level: 'info',
        data: { timestamp: new Date().toISOString() }
      });
      
      // Test different types of Sentry captures
      const testType = req.query.type || 'message';
      
      switch (testType) {
        case 'message':
          captureMessage('Test message from OTP Backend API', 'info', {
            tags: { test: true, endpoint: '/api/test-sentry' },
            extra: { timestamp: new Date().toISOString() }
          });
          break;
          
        case 'warning':
          logger.warn('Test warning log that should appear in Sentry', {
            test: true,
            endpoint: '/api/test-sentry'
          });
          break;
          
        case 'error':
          logger.error('Test error log that should appear in Sentry', {
            test: true,
            endpoint: '/api/test-sentry'
          });
          break;
          
        case 'exception':
          try {
            throw new Error('Test exception for Sentry integration');
          } catch (error) {
            captureException(error, {
              tags: { test: true, endpoint: '/api/test-sentry' },
              extra: { timestamp: new Date().toISOString() }
            });
          }
          break;
          
        default:
          captureMessage('Default test message', 'info');
      }
      
      res.status(200).json({
        success: true,
        message: `Sentry test completed: ${testType}`,
        note: 'Check your Sentry dashboard for the test event',
        availableTypes: ['message', 'warning', 'error', 'exception']
      });
    } catch (error) {
      logger.error('Error in Sentry test endpoint:', error);
      res.status(500).json({
        success: false,
        message: 'Error testing Sentry integration',
        error: error.message
      });
    }
  });
}

// ===== SWAGGER DOCUMENTATION =====
app.use('/api-docs', swaggerLimiter, swaggerUi.serve, swaggerUi.setup(specs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'OTP Authentication API Documentation'
}));

// ===== API ROUTES =====
// Apply general rate limiting to all API routes
app.use('/api', generalLimiter);

// Mount route handlers
app.use('/api/otp', otpRoutes);
app.use('/api/customer', customerRoutes);
app.use('/api/auth/login-link', loginLinkRoutes);

// ===== ROOT ENDPOINT =====
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to OTP Authentication API',
    version: config.api.version,
    documentation: '/api-docs',
    endpoints: {
      health: '/health',
      status: '/api/status',
      otp: {
        send: 'POST /api/otp/send',
        verify: 'POST /api/otp/verify',
        status: 'GET /api/otp/status',
        resend: 'POST /api/otp/resend'
      },
      customer: {
        signup: 'POST /api/customer/signup',
        checkExists: 'GET /api/customer/check-exists'
      },
      loginLink: {
        request: 'POST /api/auth/login-link/request',
        verify: 'GET /api/auth/login-link/verify',
        status: 'GET /api/auth/login-link/status'
      }
    }
  });
});

// ===== ERROR HANDLING MIDDLEWARE =====
// Handle validation errors
app.use(handleValidationError);

// Handle 404 errors
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method,
    availableEndpoints: {
      documentation: '/api-docs',
      health: '/health',
      status: '/api/status'
    }
  });
});

// Global error handler
app.use((error, req, res, next) => {
  logger.error('ERROR: Global Error Handler:', error);
  
  // Send error to Sentry
  const { captureException } = require('./config/sentry');
  captureException(error, {
    tags: {
      errorType: 'global_handler',
      method: req.method,
      url: req.url
    },
    extra: {
      requestId: req.id,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    }
  });
  
  // CORS errors
  if (error.message && error.message.includes('CORS')) {
    return res.status(403).json({
      success: false,
      message: 'CORS error: Origin not allowed',
      error: 'Cross-origin request blocked'
    });
  }
  
  // Rate limiting errors
  if (error.status === 429) {
    return res.status(429).json({
      success: false,
      message: 'Too many requests',
      retryAfter: error.retryAfter || 60
    });
  }
  
  // JSON parsing errors
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON in request body',
      error: 'Malformed JSON'
    });
  }
  
  // Generic server error
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: config.server.isDevelopment ? error.message : undefined,
    timestamp: new Date().toISOString()
  });
});

// ===== SERVER STARTUP =====
async function startServer() {
  try {
    // Connect to Redis
    logger.info('Connecting to Redis...');
    await redisClient.connect();
    
    // Test Shopify connection (optional)
    logger.info('Testing Shopify connection...');
    const shopifyTest = await shopifyService.testConnection();
    if (shopifyTest.success) {
      logger.info('Shopify connection successful');
    } else {
      logger.warn('WARNING: Shopify connection failed:', shopifyTest.message);
      logger.warn('WARNING: API will continue without Shopify integration');
    }
    
    // Start the server
    const server = app.listen(PORT, () => {
      logger.info('===================================');
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${config.server.nodeEnv}`);
      logger.info(`API Documentation: http://localhost:${PORT}/api-docs`);
      logger.info(`Health Check: http://localhost:${PORT}/health`);
      logger.info(`API Status: http://localhost:${PORT}/api/status`);
      logger.info('===================================');
    });
    
    // Graceful shutdown handling
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received. Shutting down gracefully...');
      server.close(async () => {
        await redisClient.disconnect();
        logger.info('Server closed. Goodbye!');
        process.exit(0);
      });
    });
    
    process.on('SIGINT', async () => {
      logger.info('SIGINT received. Shutting down gracefully...');
      server.close(async () => {
        await redisClient.disconnect();
        logger.info('Server closed. Goodbye!');
        process.exit(0);
      });
    });
    
  } catch (error) {
    logger.error('ERROR: Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

module.exports = app;
