/**
 * SMS Utility Functions
 * Helper functions for SMS operations and formatting
 * Optimized for performance and memory efficiency
 */

// Cached regex patterns for better performance
const REGEX_PATTERNS = {
  CLEANUP: /[\s\-\+\(\)]/g,
  BD_MOBILE: /^88(013|014|015|016|017|018|019)\d{8}$/,
  NATIONAL_FORMAT: /^01[3-9]\d{8}$/,
  HTML_TAGS: /<[^>]*>/g,
  WHITESPACE: /\s+/g,
  LINE_BREAKS: /[\r\n]+/g,
  NON_ASCII: /[^\x00-\x7F]/
};

// Constants for limits and defaults
const LIMITS = {
  MAX_SMS_LENGTH: 1000,
  MAX_SINGLE_SMS_ASCII: 160,
  MAX_SINGLE_SMS_UNICODE: 70,
  MAX_BRAND_NAME_LENGTH: 50,
  MAX_CUSTOMER_NAME_LENGTH: 100,
  MAX_ORDER_NUMBER_LENGTH: 50,
  MAX_AMOUNT_LENGTH: 20
};

/**
 * Format phone number for SMS sending
 * Ensures Bangladesh numbers are properly formatted
 * @param {string} phoneNumber - Raw phone number
 * @returns {string} Formatted phone number
 */
const formatPhoneForSMS = (phoneNumber) => {
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    return '';
  }
  
  // Early return for empty strings after trim
  const trimmed = phoneNumber.trim();
  if (trimmed.length === 0 || trimmed.length > 20) {
    return '';
  }
  
  // Remove spaces, dashes, parentheses, plus signs using cached regex
  const cleaned = trimmed.replace(REGEX_PATTERNS.CLEANUP, '');
  
  // If it starts with 01, add country code
  if (cleaned.startsWith('01')) {
    return '88' + cleaned;
  }
  
  // If it starts with 88, return as is
  if (cleaned.startsWith('88')) {
    return cleaned;
  }
  
  // If it's national format, add country code
  if (REGEX_PATTERNS.NATIONAL_FORMAT.test(cleaned)) {
    return '88' + cleaned;
  }
  
  return cleaned;
};

/**
 * Validate if a phone number is eligible for SMS
 * @param {string} phoneNumber - Phone number to validate
 * @returns {object} Validation result
 */
const validateSMSEligibility = (phoneNumber) => {
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    return {
      isEligible: false,
      reason: 'Phone number is required and must be a string',
      formattedNumber: ''
    };
  }
  
  const formatted = formatPhoneForSMS(phoneNumber);
  
  if (!formatted) {
    return {
      isEligible: false,
      reason: 'Unable to format phone number',
      formattedNumber: ''
    };
  }
  
  // Use cached regex pattern
  if (!REGEX_PATTERNS.BD_MOBILE.test(formatted)) {
    return {
      isEligible: false,
      reason: 'Invalid Bangladesh mobile number format',
      formattedNumber: formatted
    };
  }
  
  return {
    isEligible: true,
    reason: 'Valid mobile number',
    formattedNumber: formatted
  };
};

/**
 * Generate OTP message content
 * @param {string} otp - OTP code
 * @param {number} expiryMinutes - Expiry time in minutes
 * @param {string} [brandName] - Optional brand name
 * @returns {string} Formatted OTP message
 */
const generateOTPMessage = (otp, expiryMinutes = 5, brandName = 'Our Service') => {
  // Input validation
  if (!otp || typeof otp !== 'string' || !/^\d{4,8}$/.test(otp)) {
    throw new Error('Invalid OTP code provided');
  }
  
  const validExpiryMinutes = Number.isInteger(expiryMinutes) && expiryMinutes > 0 && expiryMinutes <= 60
    ? expiryMinutes
    : 5;
  
  const safeBrandName = brandName && typeof brandName === 'string'
    ? sanitizeText(brandName.trim(), LIMITS.MAX_BRAND_NAME_LENGTH)
    : 'Our Service';
  
  const message = `Your ${safeBrandName} verification code is: ${otp}. This code will expire in ${validExpiryMinutes} minutes. Do not share this code with anyone. If you didn't request this code, please ignore this message.`;
  
  return truncateSMSMessage(message);
};


/**
 * Truncate SMS message to fit character limits
 * @param {string} message - Original message
 * @param {number} maxLength - Maximum allowed length (default: 1000)
 * @returns {string} Truncated message
 */
const truncateSMSMessage = (message, maxLength = 1000) => {
  if (!message) return '';
  
  if (message.length <= maxLength) {
    return message;
  }
  
  // Truncate and add ellipsis
  return message.substring(0, maxLength - 3) + '...';
};

/**
 * Check if message contains Unicode characters
 * @param {string} message - Message to check
 * @returns {object} Unicode analysis
 */
const analyzeMessageEncoding = (message) => {
  if (!message || typeof message !== 'string') {
    return {
      hasUnicode: false,
      encoding: 'ASCII',
      estimatedSMSCount: 0,
      messageLength: 0,
      maxSingleSMSLength: LIMITS.MAX_SINGLE_SMS_ASCII
    };
  }
  
  const messageLength = message.length;
  
  // Early return for empty messages
  if (messageLength === 0) {
    return {
      hasUnicode: false,
      encoding: 'ASCII',
      estimatedSMSCount: 0,
      messageLength: 0,
      maxSingleSMSLength: LIMITS.MAX_SINGLE_SMS_ASCII
    };
  }
  
  // Check for Unicode characters using cached regex
  const hasUnicode = REGEX_PATTERNS.NON_ASCII.test(message);
  
  // Estimate SMS count based on encoding
  const maxLength = hasUnicode ? LIMITS.MAX_SINGLE_SMS_UNICODE : LIMITS.MAX_SINGLE_SMS_ASCII;
  const smsCount = Math.ceil(messageLength / maxLength);
  
  return {
    hasUnicode,
    encoding: hasUnicode ? 'Unicode' : 'ASCII',
    messageLength,
    estimatedSMSCount: smsCount,
    maxSingleSMSLength: maxLength
  };
};

/**
 * Sanitize text content (internal helper function)
 * @param {string} text - Text to sanitize
 * @param {number} maxLength - Maximum length
 * @returns {string} Sanitized text
 */
const sanitizeText = (text, maxLength = 100) => {
  if (!text || typeof text !== 'string') return '';
  
  return text
    .replace(REGEX_PATTERNS.HTML_TAGS, '')
    .replace(REGEX_PATTERNS.WHITESPACE, ' ')
    .replace(REGEX_PATTERNS.LINE_BREAKS, ' ')
    .trim()
    .substring(0, maxLength);
};

/**
 * Sanitize message content for SMS
 * Remove potentially problematic characters
 * @param {string} message - Message to sanitize
 * @returns {string} Sanitized message
 */
const sanitizeSMSMessage = (message) => {
  if (!message || typeof message !== 'string') {
    return '';
  }
  
  // Early return for empty messages
  const trimmed = message.trim();
  if (trimmed.length === 0) {
    return '';
  }
  
  return trimmed
    // Remove HTML tags using cached regex
    .replace(REGEX_PATTERNS.HTML_TAGS, '')
    // Remove excessive whitespace using cached regex
    .replace(REGEX_PATTERNS.WHITESPACE, ' ')
    // Remove line breaks that might cause issues
    .replace(REGEX_PATTERNS.LINE_BREAKS, ' ')
    // Trim whitespace
    .trim();
};

/**
 * Generate unique CSMS ID with prefix
 * @param {string} prefix - Prefix for the ID (e.g., 'OTP', 'ORDER')
 * @returns {string} Unique CSMS ID
 */
const generateCSMSId = (prefix = 'SMS') => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 6);
  const id = `${prefix}_${timestamp}_${random}`;
  
  // Ensure it doesn't exceed 20 characters
  return id.substring(0, 20);
};

module.exports = {
  formatPhoneForSMS,
  validateSMSEligibility,
  generateOTPMessage,
  truncateSMSMessage,
  analyzeMessageEncoding,
  sanitizeSMSMessage,
  generateCSMSId
};
