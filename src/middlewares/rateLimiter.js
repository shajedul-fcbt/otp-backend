const rateLimit = require('express-rate-limit');
require('dotenv').config();

/**
 * Rate limiting middleware configuration
 * Environment-aware rate limiting for production security
 */

// Rate limiting configuration based on environment
const isDevelopment = process.env.NODE_ENV === 'development';
const skipRateLimiting = isDevelopment; // Disable rate limiting in development

// General API rate limit (disabled in development)
const generalLimiter = skipRateLimiting ? (req, res, next) => next() : rateLimit({
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

// Production-ready rate limit for OTP sending - prevents SMS bombing (disabled in development)
const otpSendLimiter = skipRateLimiting ? (req, res, next) => next() : rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // 3 OTP requests per 15 minutes per IP/phone
  message: {
    success: false,
    message: 'Too many OTP requests. Please wait 15 minutes before requesting another OTP.',
    retryAfter: 900 // 15 minutes in seconds
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many OTP requests. Please wait 15 minutes before requesting another OTP.',
      retryAfter: 900
    });
  },
  keyGenerator: (req) => {
    // Use phone number if available, otherwise fall back to IP
    return req.body?.phoneNumber || req.ip;
  },
  skip: (req) => {
    // Skip rate limiting in development if needed
    return skipRateLimiting;
  }
});

// Production-ready rate limit for OTP verification - prevents brute force attacks (disabled in development)
const otpVerifyLimiter = skipRateLimiting ? (req, res, next) => next() : rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5, // 5 verification attempts per 10 minutes per phone/IP
  message: {
    success: false,
    message: 'Too many verification attempts. Please wait 10 minutes before trying again.',
    retryAfter: 600 // 10 minutes in seconds
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many verification attempts. Please wait 10 minutes before trying again.',
      retryAfter: 600
    });
  },
  keyGenerator: (req) => {
    // Use phone number if available, otherwise fall back to IP
    return req.body?.phoneNumber || req.ip;
  }
});

// Production-ready rate limit for customer signup - prevents abuse and spam accounts (disabled in development)
const signupLimiter = skipRateLimiting ? (req, res, next) => next() : rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 signup attempts per hour per IP
  message: {
    success: false,
    message: 'Too many signup attempts. Please wait 1 hour before trying again.',
    retryAfter: 3600 // 1 hour in seconds
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many signup attempts. Please wait 1 hour before trying again.',
      retryAfter: 3600
    });
  },
  keyGenerator: (req) => {
    // Use phone number if available, otherwise fall back to IP
    return req.body?.phoneNumber || req.ip;
  }
});

// Relaxed rate limit for Swagger documentation (disabled in development)
const swaggerLimiter = skipRateLimiting ? (req, res, next) => next() : rateLimit({
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
    // Skip rate limiting in development
    if (skipRateLimiting) {
      return next();
    }
    
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

// Phone number specific OTP limiter - stricter per-phone limits
const phoneOtpLimiter = createPhoneNumberLimiter(
  60 * 60 * 1000, // 1 hour
  2, // 2 requests per hour per phone number
  'Too many OTP requests for this phone number. Please wait 1 hour before requesting another OTP.'
);

// Phone number specific verification limiter - prevents targeted brute force
const phoneVerifyLimiter = createPhoneNumberLimiter(
  60 * 60 * 1000, // 1 hour
  3, // 3 verification attempts per hour per phone number
  'Too many verification attempts for this phone number. Please wait 1 hour before trying again.'
);

// Phone number specific signup limiter - prevents multiple account creation from same phone
const phoneSignupLimiter = createPhoneNumberLimiter(
  24 * 60 * 60 * 1000, // 24 hours
  1, // 1 signup attempt per day per phone number
  'Only one account can be created per phone number every 24 hours.'
);

module.exports = {
  generalLimiter,
  otpSendLimiter,
  otpVerifyLimiter,
  signupLimiter,
  swaggerLimiter,
  phoneOtpLimiter,
  phoneVerifyLimiter,
  phoneSignupLimiter,
  createPhoneNumberLimiter
};
