/**
 * Constants for customer-related operations
 */

// Error Messages
const ERROR_MESSAGES = {
  CUSTOMER_ALREADY_EXISTS_PHONE: 'Customer already exists with this phone number',
  CUSTOMER_ALREADY_EXISTS_EMAIL: 'Customer already exists with this email address',
  CUSTOMER_CREATION_FAILED: 'Failed to create customer account',
  CUSTOMER_NOT_FOUND: 'Customer not found',
  CUSTOMER_FOUND: 'Customer found',
  CUSTOMER_CREATED_SUCCESS: 'Customer account created successfully',
  PHONE_NUMBER_REQUIRED: 'Phone number is required',
  INVALID_PHONE_FORMAT: 'Invalid Bangladeshi phone number format',
  EXTERNAL_SERVICE_ERROR: 'External service error. Please try again later.',
  DATABASE_CONNECTION_ERROR: 'Database connection error',
  SERVICE_UNAVAILABLE: 'Service temporarily unavailable. Please try again later.',
  INTERNAL_SERVER_ERROR: 'Internal server error occurred while processing request'
};

// Success Messages
const SUCCESS_MESSAGES = {
  CUSTOMER_CREATED: 'Customer account created successfully',
  CUSTOMER_FOUND: 'Customer found',
  CUSTOMER_NOT_FOUND: 'Customer not found'
};

// HTTP Status Codes
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
};

// Redis Key Prefixes
const REDIS_KEYS = {
  CUSTOMER_PREFIX: 'customer:',
  OTP_PREFIX: 'otp:'
};

// Phone Number Validation
const PHONE_VALIDATION = {
  BD_PHONE_REGEX: /^(\+8801[3-9]\d{8}|01[3-9]\d{8})$/,
  INTERNATIONAL_PREFIX: '+88',
  LOCAL_PREFIX: '01'
};

// Password Configuration
const PASSWORD_CONFIG = {
  DEFAULT_LENGTH: 12,
  SALT_ROUNDS: 12
};

// Logging
const LOG_MESSAGES = {
  CUSTOMER_SIGNUP_REQUEST: '👤 Customer signup request',
  CHECKING_EXISTING_CUSTOMER: '🔍 Checking if customer already exists',
  GENERATING_PASSWORD: '🔐 Generating random password',
  CREATING_SHOPIFY_CUSTOMER: '🏪 Creating customer in Shopify',
  STORING_REDIS_DATA: '💾 Storing customer data in Redis',
  CUSTOMER_CREATED_SUCCESS: '✅ Customer created successfully',
  CUSTOMER_FOUND: '✅ Customer found',
  CUSTOMER_NOT_FOUND: '❌ Customer not found',
  ERROR_OCCURRED: '❌ Error occurred'
};

module.exports = {
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  HTTP_STATUS,
  REDIS_KEYS,
  PHONE_VALIDATION,
  PASSWORD_CONFIG,
  LOG_MESSAGES
};
