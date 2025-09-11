/**
 * SMS Utility Functions
 * Helper functions for SMS operations and formatting
 */

/**
 * Format phone number for SMS sending
 * Ensures Bangladesh numbers are properly formatted
 * @param {string} phoneNumber - Raw phone number
 * @returns {string} Formatted phone number
 */
const formatPhoneForSMS = (phoneNumber) => {
  if (!phoneNumber) return '';
  
  // Remove any spaces, dashes, parentheses, plus signs
  const cleaned = phoneNumber.replace(/[\s\-\+\(\)]/g, '');
  
  // If it starts with 01, add country code
  if (cleaned.startsWith('01')) {
    return '88' + cleaned;
  }
  
  // If it starts with 88, return as is
  if (cleaned.startsWith('88')) {
    return cleaned;
  }
  
  // If it's just numbers and 11 digits starting with 01, add 88
  if (/^01[3-9]\d{8}$/.test(cleaned)) {
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
  const formatted = formatPhoneForSMS(phoneNumber);
  
  // Bangladesh mobile number pattern
  const bangladeshMobilePattern = /^88(013|014|015|016|017|018|019)\d{8}$/;
  
  if (!bangladeshMobilePattern.test(formatted)) {
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
  return `Your ${brandName} verification code is: ${otp}. This code will expire in ${expiryMinutes} minutes. Do not share this code with anyone. If you didn't request this code, please ignore this message.`;
};

/**
 * Generate welcome message for new customers
 * @param {string} customerName - Customer name
 * @param {string} temporaryPassword - Temporary password
 * @param {string} [brandName] - Optional brand name
 * @returns {string} Formatted welcome message
 */
const generateWelcomeMessage = (customerName, temporaryPassword, brandName = 'Our Service') => {
  return `Welcome to ${brandName}, ${customerName}! Your account has been created successfully. Your temporary password is: ${temporaryPassword}. Please log in and change your password immediately for security. Thank you for joining us!`;
};

/**
 * Generate password reset message
 * @param {string} resetCode - Password reset code
 * @param {number} expiryMinutes - Expiry time in minutes
 * @param {string} [brandName] - Optional brand name
 * @returns {string} Formatted password reset message
 */
const generatePasswordResetMessage = (resetCode, expiryMinutes = 15, brandName = 'Our Service') => {
  return `Your ${brandName} password reset code is: ${resetCode}. This code will expire in ${expiryMinutes} minutes. If you didn't request a password reset, please ignore this message.`;
};

/**
 * Generate order confirmation message
 * @param {string} orderNumber - Order number
 * @param {string} amount - Order amount
 * @param {string} [brandName] - Optional brand name
 * @returns {string} Formatted order confirmation message
 */
const generateOrderConfirmationMessage = (orderNumber, amount, brandName = 'Our Service') => {
  return `Thank you for your order! Order #${orderNumber} for ${amount} has been confirmed. You will receive updates about your order status. - ${brandName}`;
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
  if (!message) {
    return {
      hasUnicode: false,
      encoding: 'ASCII',
      estimatedSMSCount: 0
    };
  }
  
  // Check for Unicode characters (non-ASCII)
  const hasUnicode = /[^\x00-\x7F]/.test(message);
  
  // Estimate SMS count based on encoding
  let smsCount;
  if (hasUnicode) {
    // Unicode SMS: 70 characters per SMS
    smsCount = Math.ceil(message.length / 70);
  } else {
    // Standard SMS: 160 characters per SMS
    smsCount = Math.ceil(message.length / 160);
  }
  
  return {
    hasUnicode,
    encoding: hasUnicode ? 'Unicode' : 'ASCII',
    messageLength: message.length,
    estimatedSMSCount: smsCount,
    maxSingleSMSLength: hasUnicode ? 70 : 160
  };
};

/**
 * Sanitize message content for SMS
 * Remove potentially problematic characters
 * @param {string} message - Message to sanitize
 * @returns {string} Sanitized message
 */
const sanitizeSMSMessage = (message) => {
  if (!message) return '';
  
  return message
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Remove excessive whitespace
    .replace(/\s+/g, ' ')
    // Remove line breaks that might cause issues
    .replace(/[\r\n]+/g, ' ')
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
  generateWelcomeMessage,
  generatePasswordResetMessage,
  generateOrderConfirmationMessage,
  truncateSMSMessage,
  analyzeMessageEncoding,
  sanitizeSMSMessage,
  generateCSMSId
};
