const rateLimit = require('express-rate-limit');
require('dotenv').config();

/**
 * Rate limiting middleware configuration
 */

// General API rate limit
const generalLimiter = rateLimit({
  windowMs: (parseInt(process.env.RATE_LIMIT_WINDOW_MINUTES) || 15) * 60 * 1000, // 15 minutes default
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MINUTES) || 15) * 60)
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MINUTES) || 15) * 60)
    });
  }
});

// Strict rate limit for OTP sending (to prevent spam)
const otpSendLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 3, // 3 OTP requests per 5 minutes per IP
  message: {
    success: false,
    message: 'Too many OTP requests. Please wait 5 minutes before requesting another OTP.',
    retryAfter: 5 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many OTP requests. Please wait 5 minutes before requesting another OTP.',
      retryAfter: 5 * 60
    });
  },
  keyGenerator: (req) => {
    // Use phone number if available, otherwise fall back to IP
    return req.body?.phoneNumber || req.ip;
  }
});

// Rate limit for OTP verification (to prevent brute force)
const otpVerifyLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // 5 verification attempts per 5 minutes per phone number
  message: {
    success: false,
    message: 'Too many verification attempts. Please wait 5 minutes before trying again.',
    retryAfter: 5 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many verification attempts. Please wait 5 minutes before trying again.',
      retryAfter: 5 * 60
    });
  },
  keyGenerator: (req) => {
    // Use phone number if available, otherwise fall back to IP
    return req.body?.phoneNumber || req.ip;
  }
});

// Rate limit for customer signup
const signupLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 2, // 2 signup attempts per 10 minutes per IP
  message: {
    success: false,
    message: 'Too many signup attempts. Please wait 10 minutes before trying again.',
    retryAfter: 10 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many signup attempts. Please wait 10 minutes before trying again.',
      retryAfter: 10 * 60
    });
  }
});

// Rate limit for Swagger documentation (lighter limit)
const swaggerLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute for docs
  message: {
    success: false,
    message: 'Too many requests to documentation. Please wait a moment.',
    retryAfter: 60
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

// Phone number specific OTP limiter (1 OTP per minute per phone number)
const phoneOtpLimiter = createPhoneNumberLimiter(
  60 * 1000, // 1 minute
  1, // 1 request per minute per phone number
  'You can only request one OTP per minute for this phone number.'
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
