/**
 * OTP-related constants and configuration
 */

// OTP Configuration
const OTP_CONFIG = {
  LENGTH: 6,
  EXPIRY_MINUTES: 10,
  RESEND_WAIT_MINUTES: 2,
  MAX_ATTEMPTS: 3,
  TIME_WINDOW_MINUTES: 5
};

// Error Messages
const ERROR_MESSAGES = {
  OTP_GENERATION_FAILED: 'Failed to generate OTP',
  OTP_SENDING_FAILED: 'Failed to send OTP',
  OTP_VERIFICATION_FAILED: 'OTP verification failed',
  OTP_NOT_FOUND: 'OTP not found or has expired',
  OTP_EXPIRED: 'OTP has expired',
  OTP_INVALID: 'Invalid OTP code',
  OTP_PHONE_MISMATCH: 'Phone number mismatch',
  OTP_INTEGRITY_FAILED: 'OTP data integrity check failed',
  OTP_TOO_EARLY_RESEND: 'Please wait before requesting another OTP',
  OTP_RATE_LIMITED: 'Too many OTP requests. Please wait before trying again',
  PHONE_NUMBER_REQUIRED: 'Phone number is required',
  INVALID_PHONE_FORMAT: 'Invalid phone number format',
  REDIS_CONNECTION_ERROR: 'Database connection error',
  SMS_SERVICE_ERROR: 'SMS service temporarily unavailable',
  EXTERNAL_SERVICE_ERROR: 'External service error. Please try again later',
  INTERNAL_SERVER_ERROR: 'Internal server error occurred while processing OTP request'
};

// Success Messages
const SUCCESS_MESSAGES = {
  OTP_SENT: 'OTP sent successfully',
  OTP_VERIFIED: 'OTP verified successfully',
  OTP_RESENT: 'OTP resent successfully'
};

// HTTP Status Codes
const HTTP_STATUS = {
  OK: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
};

// Redis Key Patterns
const REDIS_KEYS = {
  OTP_PREFIX: 'otp:',
  CUSTOMER_DATA_PREFIX: 'customer:',
  RATE_LIMIT_PREFIX: 'rate_limit:',
  ATTEMPTS_PREFIX: 'attempts:'
};

// Rate Limiting Configuration
const RATE_LIMITS = {
  OTP_SEND: {
    WINDOW_MS: 60 * 1000, // 1 minute
    MAX_ATTEMPTS: 5
  },
  OTP_VERIFY: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_ATTEMPTS: 10
  },
  OTP_RESEND: {
    WINDOW_MS: 2 * 60 * 1000, // 2 minutes
    MAX_ATTEMPTS: 3
  }
};

// SMS Configuration
const SMS_CONFIG = {
  MAX_LENGTH: 1000,
  OTP_TEMPLATE: 'Your OTP code is: {otp}. This code will expire in {expiryMinutes} minutes. Do not share this code with anyone.',
  CSMS_ID_PREFIX: 'OTP_',
  TIMEOUT_MS: 30000
};

// Log Messages
const LOG_MESSAGES = {
  OTP_REQUEST: 'OTP request for phone',
  CHECKING_CUSTOMER: 'Checking customer existence in Shopify',
  GENERATING_OTP: 'Generating OTP',
  STORING_REDIS: 'Storing OTP in Redis',
  SENDING_SMS: 'Sending OTP via SMS',
  OTP_VERIFICATION: 'OTP verification request for phone',
  RETRIEVING_OTP: 'Retrieving OTP from Redis',
  OTP_VERIFIED: 'OTP verified successfully',
  OTP_RESEND_REQUEST: 'OTP resend request for phone',
  CHECKING_EXISTING_OTP: 'Checking existing OTP',
  ERROR_OCCURRED: 'Error occurred'
};

// Validation Rules
const VALIDATION = {
  PHONE_PATTERN: /^(\+8801[3-9]\d{8}|01[3-9]\d{8})$/,
  OTP_PATTERN: /^[0-9]{6}$/,
  PHONE_MIN_LENGTH: 11,
  PHONE_MAX_LENGTH: 15
};

// Security Configuration
const SECURITY = {
  HMAC_ALGORITHM: 'sha256',
  SALT_ROUNDS: 12,
  MAX_VERIFICATION_ATTEMPTS: 3,
  LOCKOUT_DURATION_MS: 15 * 60 * 1000 // 15 minutes
};

module.exports = {
  OTP_CONFIG,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  HTTP_STATUS,
  REDIS_KEYS,
  RATE_LIMITS,
  SMS_CONFIG,
  LOG_MESSAGES,
  VALIDATION,
  SECURITY
};
