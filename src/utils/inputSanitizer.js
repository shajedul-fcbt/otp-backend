/**
 * Input sanitization and validation utilities
 */

const { VALIDATION } = require('../constants/otpConstants');

// Maximum length constants for input validation
const MAX_LENGTHS = {
  TEXT: 1000,
  EMAIL: 254,
  NAME: 100,
  PHONE: 20,
  OTP: 10
};

// Regex patterns for input sanitization
const REGEX_PATTERNS = {
  SCRIPT_TAGS: /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  HTML_TAGS: /<[^>]+>/g,
  DANGEROUS_CHARS: /[<>\"'&]/g,
  EXCESSIVE_WHITESPACE: /\s+/g
};

class InputSanitizer {
  /**
   * Sanitizes phone number input
   * @param {string} phoneNumber - Raw phone number input
   * @returns {string} Sanitized phone number
   */
  static sanitizePhoneNumber(phoneNumber) {
    if (!phoneNumber || typeof phoneNumber !== 'string') {
      return '';
    }
    
    // Remove all non-digit characters except +
    return phoneNumber.replace(/[^\d+]/g, '');
  }

  /**
   * Sanitizes OTP input
   * @param {string} otp - Raw OTP input
   * @returns {string} Sanitized OTP
   */
  static sanitizeOTP(otp) {
    if (!otp || typeof otp !== 'string') {
      return '';
    }
    
    // Keep only digits
    return otp.replace(/\D/g, '');
  }

  /**
   * Sanitizes general text input
   * @param {string} text - Raw text input
   * @param {number} maxLength - Maximum allowed length
   * @returns {string} Sanitized text
   */
  static sanitizeText(text, maxLength = MAX_LENGTHS.TEXT) {
    if (!text || typeof text !== 'string') {
      return '';
    }
    
    // Early return for empty or oversized input
    const trimmed = text.trim();
    if (trimmed.length === 0) {
      return '';
    }
    
    // Validate maxLength parameter
    const validMaxLength = Number.isInteger(maxLength) && maxLength > 0 
      ? Math.min(maxLength, MAX_LENGTHS.TEXT) 
      : MAX_LENGTHS.TEXT;
    
    // Remove potentially dangerous content using cached regex patterns
    return trimmed
      .replace(REGEX_PATTERNS.SCRIPT_TAGS, '') // Remove script tags
      .replace(REGEX_PATTERNS.HTML_TAGS, '') // Remove HTML tags
      .replace(REGEX_PATTERNS.DANGEROUS_CHARS, '') // Remove dangerous characters
      .replace(REGEX_PATTERNS.EXCESSIVE_WHITESPACE, ' ') // Normalize whitespace
      .trim()
      .substring(0, validMaxLength);
  }

  /**
   * Validates and sanitizes phone number
   * @param {string} phoneNumber - Phone number to validate
   * @returns {object} Validation result with sanitized number
   */
  static validateAndSanitizePhoneNumber(phoneNumber) {
    const sanitized = this.sanitizePhoneNumber(phoneNumber);
    
    if (!sanitized) {
      return {
        isValid: false,
        message: 'Phone number is required',
        sanitizedValue: ''
      };
    }

    if (!VALIDATION.PHONE_PATTERN.test(sanitized)) {
      return {
        isValid: false,
        message: 'Invalid phone number format',
        sanitizedValue: sanitized
      };
    }

    // Normalize phone number
    let normalizedNumber = sanitized;
    if (sanitized.startsWith('01')) {
      normalizedNumber = '+88' + sanitized;
    } else if (sanitized.startsWith('880')) {
      normalizedNumber = '+' + sanitized;
    }

    return {
      isValid: true,
      message: 'Valid phone number',
      sanitizedValue: sanitized,
      normalizedNumber
    };
  }

  /**
   * Validates and sanitizes OTP
   * @param {string} otp - OTP to validate
   * @returns {object} Validation result with sanitized OTP
   */
  static validateAndSanitizeOTP(otp) {
    const sanitized = this.sanitizeOTP(otp);
    
    if (!sanitized) {
      return {
        isValid: false,
        message: 'OTP is required',
        sanitizedValue: ''
      };
    }

    if (!VALIDATION.OTP_PATTERN.test(sanitized)) {
      return {
        isValid: false,
        message: 'OTP must be exactly 6 digits',
        sanitizedValue: sanitized
      };
    }

    return {
      isValid: true,
      message: 'Valid OTP',
      sanitizedValue: sanitized
    };
  }

  /**
   * Sanitizes request body to prevent XSS and injection attacks
   * @param {object} body - Request body object
   * @param {number} maxDepth - Maximum recursion depth to prevent stack overflow
   * @returns {object} Sanitized request body
   */
  static sanitizeRequestBody(body, maxDepth = 3) {
    if (!body || typeof body !== 'object' || body === null) {
      return {};
    }

    // Prevent infinite recursion and memory leaks
    if (maxDepth <= 0) {
      return {};
    }

    const sanitized = {};
    const entries = Object.entries(body);
    
    // Limit the number of properties to prevent DoS attacks
    const maxProperties = 50;
    const limitedEntries = entries.slice(0, maxProperties);
    
    for (const [key, value] of limitedEntries) {
      // Sanitize the key itself
      const sanitizedKey = this.sanitizeText(key, 50);
      if (!sanitizedKey) continue;
      
      if (typeof value === 'string') {
        // Apply different sanitization based on field type
        const lowerKey = sanitizedKey.toLowerCase();
        if (lowerKey.includes('phone')) {
          sanitized[sanitizedKey] = this.sanitizePhoneNumber(value);
        } else if (lowerKey.includes('otp')) {
          sanitized[sanitizedKey] = this.sanitizeOTP(value);
        } else if (lowerKey.includes('email')) {
          sanitized[sanitizedKey] = this.sanitizeText(value, MAX_LENGTHS.EMAIL);
        } else if (lowerKey.includes('name')) {
          sanitized[sanitizedKey] = this.sanitizeText(value, MAX_LENGTHS.NAME);
        } else {
          sanitized[sanitizedKey] = this.sanitizeText(value);
        }
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // Recursive sanitization with depth limit
        sanitized[sanitizedKey] = this.sanitizeRequestBody(value, maxDepth - 1);
      } else if (Array.isArray(value)) {
        // Handle arrays with size limit
        const maxArrayLength = 20;
        sanitized[sanitizedKey] = value.slice(0, maxArrayLength).map(item => {
          if (typeof item === 'string') {
            return this.sanitizeText(item);
          } else if (typeof item === 'object' && item !== null) {
            return this.sanitizeRequestBody(item, maxDepth - 1);
          }
          return item;
        });
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        sanitized[sanitizedKey] = value;
      }
      // Skip other types (functions, symbols, etc.)
    }

    return sanitized;
  }

  /**
   * Validates request body structure for OTP operations
   * @param {object} body - Request body
   * @param {string} operation - Operation type (send, verify, resend)
   * @returns {object} Validation result
   */
  static validateRequestBody(body, operation) {
    const errors = [];
    
    if (!body || typeof body !== 'object') {
      return {
        isValid: false,
        errors: ['Request body is required']
      };
    }

    // Common validation for all operations
    if (!body.phoneNumber) {
      errors.push('Phone number is required');
    } else {
      const phoneValidation = this.validateAndSanitizePhoneNumber(body.phoneNumber);
      if (!phoneValidation.isValid) {
        errors.push(phoneValidation.message);
      }
    }

    // Operation-specific validation
    if (operation === 'verify') {
      if (!body.otp) {
        errors.push('OTP is required');
      } else {
        const otpValidation = this.validateAndSanitizeOTP(body.otp);
        if (!otpValidation.isValid) {
          errors.push(otpValidation.message);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Creates a safe error message for client responses
   * @param {Error} error - Error object
   * @param {boolean} isDevelopment - Whether in development mode
   * @returns {string} Safe error message
   */
  static createSafeErrorMessage(error, isDevelopment = false) {
    // Input validation
    if (!error) {
      return 'An error occurred while processing your request';
    }

    const errorMessage = error.message || '';
    const isDev = Boolean(isDevelopment);
    
    if (isDev) {
      // In development, return sanitized error message
      return this.sanitizeText(errorMessage, 500) || 'Unknown error occurred';
    }

    // In production, return generic messages for security
    const message = errorMessage.toLowerCase();
    
    if (message.includes('validation') || message.includes('invalid')) {
      return 'Invalid input provided';
    }

    if (message.includes('redis') || message.includes('database')) {
      return 'Service temporarily unavailable';
    }

    if (message.includes('sms')) {
      return 'SMS service temporarily unavailable';
    }

    if (message.includes('network') || message.includes('timeout')) {
      return 'Network error occurred';
    }

    if (message.includes('auth') || message.includes('permission')) {
      return 'Access denied';
    }

    return 'An error occurred while processing your request';
  }
}

module.exports = InputSanitizer;
