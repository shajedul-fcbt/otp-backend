/**
 * Input sanitization and validation utilities
 */

const { VALIDATION } = require('../constants/otpConstants');

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
  static sanitizeText(text, maxLength = 1000) {
    if (!text || typeof text !== 'string') {
      return '';
    }
    
    // Remove potentially dangerous characters and trim
    return text
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/<[^>]+>/g, '') // Remove HTML tags
      .replace(/[<>\"'&]/g, '') // Remove potentially dangerous characters
      .trim()
      .substring(0, maxLength);
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
   * @returns {object} Sanitized request body
   */
  static sanitizeRequestBody(body) {
    if (!body || typeof body !== 'object') {
      return {};
    }

    const sanitized = {};
    
    for (const [key, value] of Object.entries(body)) {
      if (typeof value === 'string') {
        // Apply different sanitization based on field type
        if (key.toLowerCase().includes('phone')) {
          sanitized[key] = this.sanitizePhoneNumber(value);
        } else if (key.toLowerCase().includes('otp')) {
          sanitized[key] = this.sanitizeOTP(value);
        } else {
          sanitized[key] = this.sanitizeText(value);
        }
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeRequestBody(value);
      } else {
        sanitized[key] = value;
      }
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
    if (isDevelopment) {
      return error.message || 'Unknown error occurred';
    }

    // In production, return generic messages for security
    if (error.message.includes('validation') || error.message.includes('Invalid')) {
      return 'Invalid input provided';
    }

    if (error.message.includes('Redis') || error.message.includes('Database')) {
      return 'Service temporarily unavailable';
    }

    if (error.message.includes('SMS')) {
      return 'SMS service temporarily unavailable';
    }

    return 'An error occurred while processing your request';
  }
}

module.exports = InputSanitizer;
