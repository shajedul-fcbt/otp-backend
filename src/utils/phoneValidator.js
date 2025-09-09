/**
 * Validates Bangladeshi phone numbers
 * Supported formats:
 * - +8801XXXXXXXXX (international format)
 * - 01XXXXXXXXX (national format)
 * - 8801XXXXXXXXX (country code format)
 */

class PhoneValidator {
  constructor() {
    // Valid Bangladeshi mobile operator codes
    this.validOperatorCodes = [
      '013', '014', '015', '016', '017', '018', '019', // Grameenphone
      '130', '131', '132', '133', '134', '135', '136', '137', '138', '139', // Grameenphone
      '150', '151', '152', '153', '154', '155', '156', '157', '158', '159', // Grameenphone
      '160', '161', '162', '163', '164', '165', '166', '167', '168', '169', // Grameenphone
      '170', '171', '172', '173', '174', '175', '176', '177', '178', '179', // Grameenphone
      '180', '181', '182', '183', '184', '185', '186', '187', '188', '189', // Grameenphone
      '190', '191', '192', '193', '194', '195', '196', '197', '198', '199'  // Grameenphone
    ];

    // Simplified pattern for main operators
    this.operatorPatterns = {
      grameenphone: /^(\+880|880|0)?(17[0-9]|13[0-9]|15[0-9]|16[0-9]|18[0-9]|19[0-9])/,
      robi: /^(\+880|880|0)?(18[0-8])/,
      banglalink: /^(\+880|880|0)?(19[0-9]|14[0-9])/,
      airtel: /^(\+880|880|0)?(16[0-9]|13[0-9])/,
      teletalk: /^(\+880|880|0)?(15[0-9])/
    };
  }

  /**
   * Validates if the phone number is a valid Bangladeshi mobile number
   * @param {string} phoneNumber - The phone number to validate
   * @returns {object} - Validation result with success status and normalized number
   */
  validate(phoneNumber) {
    if (!phoneNumber || typeof phoneNumber !== 'string') {
      return {
        isValid: false,
        message: 'Phone number is required and must be a string',
        normalizedNumber: null
      };
    }

    // Remove all spaces and special characters except + and digits
    const cleanNumber = phoneNumber.replace(/[^\d+]/g, '');

    // Check if it's empty after cleaning
    if (!cleanNumber) {
      return {
        isValid: false,
        message: 'Phone number cannot be empty',
        normalizedNumber: null
      };
    }

    // Normalize the phone number to international format (+880XXXXXXXXX)
    const normalized = this.normalizeToInternational(cleanNumber);

    if (!normalized) {
      return {
        isValid: false,
        message: 'Invalid phone number format',
        normalizedNumber: null
      };
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
   * Normalizes phone number to international format (+880XXXXXXXXX)
   * @param {string} phoneNumber - Clean phone number
   * @returns {string|null} - Normalized number or null if invalid
   */
  normalizeToInternational(phoneNumber) {
    // Remove + sign for processing
    const number = phoneNumber.replace(/^\+/, '');

    // Case 1: Already in international format without + (880XXXXXXXXX)
    if (number.startsWith('880') && number.length === 13) {
      return '+' + number;
    }

    // Case 2: National format (01XXXXXXXXX)
    if (number.startsWith('01') && number.length === 11) {
      return '+880' + number.substring(1);
    }

    // Case 3: International format with + (+880XXXXXXXXX)
    if (phoneNumber.startsWith('+880') && phoneNumber.length === 14) {
      return phoneNumber;
    }

    // Case 4: Just the mobile number without country code (1XXXXXXXXX)
    if (number.length === 10 && number.match(/^[1-9]/)) {
      return '+880' + number;
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
    if (normalizedNumber.length !== 14) {
      return {
        isValid: false,
        message: 'Invalid phone number length'
      };
    }

    // Extract the mobile number part (after +880)
    const mobileNumber = normalizedNumber.substring(4);

    // Should start with 1 (mobile numbers in Bangladesh start with 1)
    if (!mobileNumber.startsWith('1')) {
      return {
        isValid: false,
        message: 'Mobile number must start with 1'
      };
    }

    // Check if it's exactly 10 digits after +880
    if (mobileNumber.length !== 10 || !/^\d{10}$/.test(mobileNumber)) {
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
      operator: operator
    };
  }

  /**
   * Detects the mobile operator based on the phone number
   * @param {string} phoneNumber - Normalized phone number
   * @returns {string} - Operator name
   */
  detectOperator(phoneNumber) {
    const number = phoneNumber.replace('+880', '0');

    for (const [operator, pattern] of Object.entries(this.operatorPatterns)) {
      if (pattern.test(number)) {
        return operator;
      }
    }

    return 'unknown';
  }

  /**
   * Formats phone number for display
   * @param {string} phoneNumber - Normalized phone number
   * @returns {string} - Formatted phone number
   */
  formatForDisplay(phoneNumber) {
    if (!phoneNumber || phoneNumber.length !== 14) {
      return phoneNumber;
    }

    // +880 1XXX XXX XXX
    return phoneNumber.substring(0, 4) + ' ' + 
           phoneNumber.substring(4, 8) + ' ' + 
           phoneNumber.substring(8, 11) + ' ' + 
           phoneNumber.substring(11);
  }
}

module.exports = new PhoneValidator();
