/**
 * Validates Bangladeshi phone numbers
 * Supported formats:
 * - +8801XXXXXXXXX (international format)
 * - 01XXXXXXXXX (national format)
 * - 8801XXXXXXXXX (country code format)
 * 
 * Optimized for performance with cached patterns and early validation
 */

// Constants for better performance and maintainability
const PHONE_CONSTANTS = {
  COUNTRY_CODE: '880',
  INTL_PREFIX: '+880',
  NATIONAL_PREFIX: '01',
  TOTAL_LENGTH_INTL: 14, // +880XXXXXXXXXX
  TOTAL_LENGTH_NATIONAL: 11, // 01XXXXXXXXX
  TOTAL_LENGTH_COUNTRY: 13, // 880XXXXXXXXXX
  MOBILE_LENGTH: 10, // XXXXXXXXXX after +880
  MAX_INPUT_LENGTH: 20
};

// Cached regex patterns for better performance
const PHONE_PATTERNS = {
  CLEANUP: /[^\d+]/g,
  MOBILE_START: /^1/,
  DIGITS_ONLY: /^\d{10}$/,
  GRAMEENPHONE: /^(\+880|880|0)?(17[0-9]|13[0-9]|15[0-9]|16[0-9]|18[0-9]|19[0-9])/,
  ROBI: /^(\+880|880|0)?(18[0-8])/,
  BANGLALINK: /^(\+880|880|0)?(19[0-9]|14[0-9])/,
  AIRTEL: /^(\+880|880|0)?(16[0-9]|13[0-9])/,
  TELETALK: /^(\+880|880|0)?(15[0-9])/
};

class PhoneValidator {
  constructor() {
    // Freeze patterns to prevent accidental modification
    Object.freeze(PHONE_PATTERNS);
    Object.freeze(PHONE_CONSTANTS);
  }

  /**
   * Validates if the phone number is a valid Bangladeshi mobile number
   * @param {string} phoneNumber - The phone number to validate
   * @returns {object} - Validation result with success status and normalized number
   */
  validate(phoneNumber) {
    // Input validation with early returns
    if (!phoneNumber || typeof phoneNumber !== 'string') {
      return this._createErrorResult('Phone number is required and must be a string');
    }

    // Trim and check length before processing
    const trimmed = phoneNumber.trim();
    if (trimmed.length === 0) {
      return this._createErrorResult('Phone number cannot be empty');
    }
    
    if (trimmed.length > PHONE_CONSTANTS.MAX_INPUT_LENGTH) {
      return this._createErrorResult('Phone number is too long');
    }

    // Remove all spaces and special characters except + and digits using cached regex
    const cleanNumber = trimmed.replace(PHONE_PATTERNS.CLEANUP, '');

    // Check if it's empty after cleaning
    if (!cleanNumber) {
      return this._createErrorResult('Phone number contains no valid digits');
    }

    // Normalize the phone number to international format (+880XXXXXXXXX)
    const normalized = this.normalizeToInternational(cleanNumber);

    if (!normalized) {
      return this._createErrorResult('Invalid phone number format');
    }

    // Validate the normalized number
    const validationResult = this.validateNormalizedNumber(normalized);

    return {
      isValid: validationResult.isValid,
      message: validationResult.message,
      normalizedNumber: validationResult.isValid ? normalized : null,
      operator: validationResult.operator || null
    };
  }
  
  /**
   * Creates a standardized error result
   * @param {string} message - Error message
   * @returns {object} Error result
   * @private
   */
  _createErrorResult(message) {
    return {
      isValid: false,
      message,
      normalizedNumber: null,
      operator: null
    };
  }

  /**
   * Normalizes phone number to international format (+880XXXXXXXXX)
   * @param {string} phoneNumber - Clean phone number
   * @returns {string|null} - Normalized number or null if invalid
   */
  normalizeToInternational(phoneNumber) {
    if (!phoneNumber) return null;
    
    // Remove + sign for processing
    const number = phoneNumber.replace(/^\+/, '');

    // Case 1: Already in international format without + (880XXXXXXXXX)
    if (number.startsWith(PHONE_CONSTANTS.COUNTRY_CODE) && number.length === PHONE_CONSTANTS.TOTAL_LENGTH_COUNTRY) {
      return PHONE_CONSTANTS.INTL_PREFIX.substring(0, 1) + number;
    }

    // Case 2: National format (01XXXXXXXXX)
    if (number.startsWith(PHONE_CONSTANTS.NATIONAL_PREFIX) && number.length === PHONE_CONSTANTS.TOTAL_LENGTH_NATIONAL) {
      return PHONE_CONSTANTS.INTL_PREFIX + number.substring(1);
    }

    // Case 3: International format with + (+880XXXXXXXXX)
    if (phoneNumber.startsWith(PHONE_CONSTANTS.INTL_PREFIX) && phoneNumber.length === PHONE_CONSTANTS.TOTAL_LENGTH_INTL) {
      return phoneNumber;
    }

    // Case 4: Just the mobile number without country code (1XXXXXXXXX)
    if (number.length === PHONE_CONSTANTS.MOBILE_LENGTH && PHONE_PATTERNS.MOBILE_START.test(number)) {
      return PHONE_CONSTANTS.INTL_PREFIX + number;
    }

    return null;
  }

  /**
   * Validates the normalized phone number
   * @param {string} normalizedNumber - Phone number in +880XXXXXXXXX format
   * @returns {object} - Validation result
   */
  validateNormalizedNumber(normalizedNumber) {
    // Should be exactly 14 characters (+880XXXXXXXXX)
    if (normalizedNumber.length !== PHONE_CONSTANTS.TOTAL_LENGTH_INTL) {
      return {
        isValid: false,
        message: 'Invalid phone number length'
      };
    }

    // Extract the mobile number part (after +880)
    const mobileNumber = normalizedNumber.substring(4);

    // Should start with 1 (mobile numbers in Bangladesh start with 1) using cached regex
    if (!PHONE_PATTERNS.MOBILE_START.test(mobileNumber)) {
      return {
        isValid: false,
        message: 'Mobile number must start with 1'
      };
    }

    // Check if it's exactly 10 digits after +880 using cached regex
    if (mobileNumber.length !== PHONE_CONSTANTS.MOBILE_LENGTH || !PHONE_PATTERNS.DIGITS_ONLY.test(mobileNumber)) {
      return {
        isValid: false,
        message: 'Mobile number must be exactly 10 digits'
      };
    }

    // Determine operator
    const operator = this.detectOperator(normalizedNumber);

    return {
      isValid: true,
      message: 'Valid Bangladeshi mobile number',
      operator
    };
  }

  /**
   * Detects the mobile operator based on the phone number
   * @param {string} phoneNumber - Normalized phone number
   * @returns {string} - Operator name
   */
  detectOperator(phoneNumber) {
    if (!phoneNumber || typeof phoneNumber !== 'string') {
      return 'unknown';
    }
    
    const number = phoneNumber.replace(PHONE_CONSTANTS.INTL_PREFIX, '0');

    // Check patterns in order of market share for better performance
    if (PHONE_PATTERNS.GRAMEENPHONE.test(number)) return 'grameenphone';
    if (PHONE_PATTERNS.ROBI.test(number)) return 'robi';
    if (PHONE_PATTERNS.BANGLALINK.test(number)) return 'banglalink';
    if (PHONE_PATTERNS.AIRTEL.test(number)) return 'airtel';
    if (PHONE_PATTERNS.TELETALK.test(number)) return 'teletalk';

    return 'unknown';
  }

  /**
   * Formats phone number for display
   * @param {string} phoneNumber - Normalized phone number
   * @returns {string} - Formatted phone number
   */
  formatForDisplay(phoneNumber) {
    if (!phoneNumber || typeof phoneNumber !== 'string' || phoneNumber.length !== PHONE_CONSTANTS.TOTAL_LENGTH_INTL) {
      return phoneNumber || '';
    }

    // +880 1XXX XXX XXX
    try {
      return phoneNumber.substring(0, 4) + ' ' + 
             phoneNumber.substring(4, 8) + ' ' + 
             phoneNumber.substring(8, 11) + ' ' + 
             phoneNumber.substring(11);
    } catch (error) {
      // Fallback to original number if formatting fails
      return phoneNumber;
    }
  }
}

module.exports = new PhoneValidator();
