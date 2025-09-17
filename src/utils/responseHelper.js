/**
 * Standardized response utilities
 * Provides consistent HTTP responses across the application
 */

const { SUCCESS_MESSAGES, HTTP_STATUS } = require('../constants/customerConstants');

// Response structure constants
const RESPONSE_STRUCTURE = {
  SUCCESS: 'success',
  MESSAGE: 'message', 
  DATA: 'data',
  TIMESTAMP: 'timestamp',
  ERRORS: 'errors'
};

class ResponseHelper {
  /**
   * Creates a standardized success response
   * @param {object} res - Express response object
   * @param {string} message - Success message
   * @param {any} data - Response data
   * @param {number} statusCode - HTTP status code
   * @returns {object} Express response
   */
  static success(res, message, data = null, statusCode = HTTP_STATUS.OK) {
    // Input validation
    if (!res || typeof res.status !== 'function' || typeof res.json !== 'function') {
      throw new Error('Invalid Express response object provided');
    }
    
    if (!message || typeof message !== 'string') {
      message = 'Operation completed successfully';
    }
    
    // Validate status code
    const validStatusCode = Number.isInteger(statusCode) && statusCode >= 200 && statusCode < 300
      ? statusCode
      : HTTP_STATUS.OK;

    const response = {
      [RESPONSE_STRUCTURE.SUCCESS]: true,
      [RESPONSE_STRUCTURE.MESSAGE]: message.trim(),
      [RESPONSE_STRUCTURE.TIMESTAMP]: new Date().toISOString()
    };

    if (data !== null && data !== undefined) {
      response[RESPONSE_STRUCTURE.DATA] = data;
    }

    return res.status(validStatusCode).json(response);
  }

  /**
   * Creates a customer created response
   * @param {object} res - Express response object
   * @param {object} customerData - Customer data
   * @returns {object} Express response
   */
  static customerCreated(res, customerData) {
    return this.success(
      res,
      SUCCESS_MESSAGES.CUSTOMER_CREATED,
      customerData,
      HTTP_STATUS.CREATED
    );
  }

  /**
   * Creates a customer found response
   * @param {object} res - Express response object
   * @param {object} customerData - Customer data
   * @returns {object} Express response
   */
  static customerFound(res, customerData) {
    return this.success(
      res,
      SUCCESS_MESSAGES.CUSTOMER_FOUND,
      customerData
    );
  }

  /**
   * Creates a customer not found response
   * @param {object} res - Express response object
   * @param {string} phoneNumber - Phone number that was searched
   * @returns {object} Express response
   */
  static customerNotFound(res, phoneNumber) {
    return this.success(
      res,
      SUCCESS_MESSAGES.CUSTOMER_NOT_FOUND,
      {
        exists: false,
        phoneNumber
      }
    );
  }

  /**
   * Creates a validation error response
   * @param {object} res - Express response object
   * @param {string} message - Error message
   * @param {Array} errors - Validation errors
   * @returns {object} Express response
   */
  static validationError(res, message, errors = []) {
    // Input validation
    if (!res || typeof res.status !== 'function' || typeof res.json !== 'function') {
      throw new Error('Invalid Express response object provided');
    }
    
    const safeMessage = message && typeof message === 'string' 
      ? message.trim() 
      : 'Validation error occurred';
    
    const safeErrors = Array.isArray(errors) ? errors : [];

    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      [RESPONSE_STRUCTURE.SUCCESS]: false,
      [RESPONSE_STRUCTURE.MESSAGE]: safeMessage,
      [RESPONSE_STRUCTURE.ERRORS]: safeErrors,
      [RESPONSE_STRUCTURE.TIMESTAMP]: new Date().toISOString()
    });
  }

  /**
   * Creates a conflict error response
   * @param {object} res - Express response object
   * @param {string} message - Error message
   * @param {object} data - Conflict data
   * @returns {object} Express response
   */
  static conflict(res, message, data = null) {
    // Input validation
    if (!res || typeof res.status !== 'function' || typeof res.json !== 'function') {
      throw new Error('Invalid Express response object provided');
    }
    
    const safeMessage = message && typeof message === 'string'
      ? message.trim()
      : 'Resource conflict occurred';

    const response = {
      [RESPONSE_STRUCTURE.SUCCESS]: false,
      [RESPONSE_STRUCTURE.MESSAGE]: safeMessage,
      [RESPONSE_STRUCTURE.TIMESTAMP]: new Date().toISOString()
    };

    if (data !== null && data !== undefined) {
      response[RESPONSE_STRUCTURE.DATA] = data;
    }

    return res.status(HTTP_STATUS.CONFLICT).json(response);
  }
}

module.exports = ResponseHelper;
