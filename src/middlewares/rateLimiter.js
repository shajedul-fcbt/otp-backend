const rateLimit = require('express-rate-limit');
require('dotenv').config();

/**
 * Rate limiting middleware configuration
 */

// General API rate limit (relaxed for testing)
const generalLimiter = rateLimit({
  windowMs: 1000, // 1 second
  max: 500, // 500 requests per second for testing
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
    retryAfter: 1
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many requests from this IP, please try again later.',
      retryAfter: 1
    });
  }
});

// Relaxed rate limit for OTP sending (for testing)
const otpSendLimiter = rateLimit({
  windowMs: 1000, // 1 second
  max: 500, // 500 OTP requests per second for testing
  message: {
    success: false,
    message: 'Too many OTP requests. Please wait a moment before requesting another OTP.',
    retryAfter: 1
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many OTP requests. Please wait a moment before requesting another OTP.',
      retryAfter: 1
    });
  },
  keyGenerator: (req) => {
    // Use phone number if available, otherwise fall back to IP
    return req.body?.phoneNumber || req.ip;
  }
});

// Relaxed rate limit for OTP verification (for testing)
const otpVerifyLimiter = rateLimit({
  windowMs: 1000, // 1 second
  max: 500, // 500 verification attempts per second for testing
  message: {
    success: false,
    message: 'Too many verification attempts. Please wait a moment before trying again.',
    retryAfter: 1
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many verification attempts. Please wait a moment before trying again.',
      retryAfter: 1
    });
  },
  keyGenerator: (req) => {
    // Use phone number if available, otherwise fall back to IP
    return req.body?.phoneNumber || req.ip;
  }
});

// Relaxed rate limit for customer signup (for testing)
const signupLimiter = rateLimit({
  windowMs: 1000, // 1 second
  max: 500, // 500 signup attempts per second for testing
  message: {
    success: false,
    message: 'Too many signup attempts. Please wait a moment before trying again.',
    retryAfter: 1
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many signup attempts. Please wait a moment before trying again.',
      retryAfter: 1
    });
  }
});

// Relaxed rate limit for Swagger documentation (for testing)
const swaggerLimiter = rateLimit({
  windowMs: 1000, // 1 second
  max: 500, // 500 requests per second for testing
  message: {
    success: false,
    message: 'Too many requests to documentation. Please wait a moment.',
    retryAfter: 1
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Custom rate limiter for phone number based limits
 * This creates a more specific rate limit per phone number
 */
const createPhoneNumberLimiter = (windowMs, max, message) => {
  const limiters = new Map();
  
  return (req, res, next) => {
    const phoneNumber = req.body?.phoneNumber;
    
    if (!phoneNumber) {
      return next();
    }
    
    if (!limiters.has(phoneNumber)) {
      limiters.set(phoneNumber, rateLimit({
        windowMs: windowMs,
        max: max,
        message: {
          success: false,
          message: message,
          retryAfter: Math.ceil(windowMs / 1000)
        },
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res) => {
          res.status(429).json({
            success: false,
            message: message,
            retryAfter: Math.ceil(windowMs / 1000)
          });
        },
        keyGenerator: () => phoneNumber
      }));
    }
    
    const limiter = limiters.get(phoneNumber);
    limiter(req, res, next);
  };
};

// Phone number specific OTP limiter (relaxed for testing)
const phoneOtpLimiter = createPhoneNumberLimiter(
  1000, // 1 second
  500, // 500 requests per second per phone number for testing
  'Too many requests for this phone number. Please wait a moment.'
);

module.exports = {
  generalLimiter,
  otpSendLimiter,
  otpVerifyLimiter,
  signupLimiter,
  swaggerLimiter,
  phoneOtpLimiter,
  createPhoneNumberLimiter
};
