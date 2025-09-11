const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

// Import middleware
const { generalLimiter, swaggerLimiter } = require('./middlewares/rateLimiter');
const { sanitizeInput, validateContentType, handleValidationError } = require('./middlewares/validation');

// Import routes
const otpRoutes = require('./routes/otpRoutes');
const customerRoutes = require('./routes/customerRoutes');

// Import configuration
const redisClient = require('./config/database');
const { swaggerUi, specs } = require('./config/swagger');
const shopifyService = require('./services/shopifyService');

// Create Express application
const app = express();
const PORT = process.env.PORT || 3000;

// ===== SECURITY MIDDLEWARE =====
// Helmet for security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// CORS configuration - Following memory guidelines for public API endpoints [[memory:8421915]]
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // In development, allow all origins
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    // In production, check against allowed origins
    const allowedOrigins = process.env.CORS_ORIGIN 
      ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
      : ['*'];
    
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: false, // No credentials needed for public API
  optionsSuccessStatus: 200, // Support legacy browsers
  preflightContinue: false
};

app.use(cors(corsOptions));

// Handle preflight requests explicitly
app.options('/{*any}', cors(corsOptions));

// ===== PARSING MIDDLEWARE =====
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ===== CUSTOM MIDDLEWARE =====
app.use(sanitizeInput);           // Sanitize input to prevent XSS
app.use(validateContentType);     // Validate Content-Type for POST/PUT requests

// ===== REQUEST LOGGING MIDDLEWARE =====
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.url;
  const ip = req.ip || req.connection.remoteAddress;
  
  console.log(`${timestamp} - ${method} ${url} - IP: ${ip}`);
  
  // Log request body for debugging (exclude sensitive data)
  if (['POST', 'PUT', 'PATCH'].includes(method) && process.env.NODE_ENV === 'development') {
    const logBody = { ...req.body };
    if (logBody.otp) logBody.otp = '***';
    if (logBody.password) logBody.password = '***';
    if (logBody.currentPassword) logBody.currentPassword = '***';
    if (logBody.newPassword) logBody.newPassword = '***';
    console.log('Request Body:', logBody);
  }
  
  next();
});

// ===== HEALTH CHECK ENDPOINT =====
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

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
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error checking API status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

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

// ===== ROOT ENDPOINT =====
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to OTP Authentication API',
    version: '1.0.0',
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
  console.error('❌ Global Error Handler:', error);
  
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
    error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    timestamp: new Date().toISOString()
  });
});

// ===== SERVER STARTUP =====
async function startServer() {
  try {
    // Connect to Redis
    console.log('🔌 Connecting to Redis...');
    await redisClient.connect();
    
    // Test Shopify connection (optional)
    console.log('🏪 Testing Shopify connection...');
    const shopifyTest = await shopifyService.testConnection();
    if (shopifyTest.success) {
      console.log('✅ Shopify connection successful');
    } else {
      console.warn('⚠️ Shopify connection failed:', shopifyTest.message);
      console.warn('⚠️ API will continue without Shopify integration');
    }
    
    // Start the server
    const server = app.listen(PORT, () => {
      console.log('🚀 ===================================');
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🚀 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🚀 API Documentation: http://localhost:${PORT}/api-docs`);
      console.log(`🚀 Health Check: http://localhost:${PORT}/health`);
      console.log(`🚀 API Status: http://localhost:${PORT}/api/status`);
      console.log('🚀 ===================================');
    });
    
    // Graceful shutdown handling
    process.on('SIGTERM', async () => {
      console.log('🛑 SIGTERM received. Shutting down gracefully...');
      server.close(async () => {
        await redisClient.disconnect();
        console.log('👋 Server closed. Goodbye!');
        process.exit(0);
      });
    });
    
    process.on('SIGINT', async () => {
      console.log('🛑 SIGINT received. Shutting down gracefully...');
      server.close(async () => {
        await redisClient.disconnect();
        console.log('👋 Server closed. Goodbye!');
        process.exit(0);
      });
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

module.exports = app;
