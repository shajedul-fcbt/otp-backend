/**
 * Centralized error handling utilities
 */

const { ERROR_MESSAGES, HTTP_STATUS } = require('../constants/customerConstants');

class ErrorHandler {
  /**
   * Creates a standardized error response
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   * @param {string} errorCode - Custom error code
   * @param {any} details - Additional error details
   * @returns {object} Standardized error response
   */
  static createErrorResponse(message, statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR, errorCode = null, details = null) {
    const response = {
      success: false,
      message,
      timestamp: new Date().toISOString()
    };

    if (errorCode) {
      response.errorCode = errorCode;
    }

    if (details) {
      response.details = details;
    }

    return { response, statusCode };
  }

  /**
   * Handles Shopify service errors
   * @param {Error} error - The error object
   * @returns {object} Error response
   */
  static handleShopifyError(error) {
    console.error('Shopify service error:', error);
    
    if (error.message.includes('Shopify')) {
      return this.createErrorResponse(
        ERROR_MESSAGES.EXTERNAL_SERVICE_ERROR,
        HTTP_STATUS.SERVICE_UNAVAILABLE,
        'SHOPIFY_ERROR',
        'Shopify integration error'
      );
    }

    return this.createErrorResponse(
      ERROR_MESSAGES.EXTERNAL_SERVICE_ERROR,
      HTTP_STATUS.SERVICE_UNAVAILABLE,
      'EXTERNAL_SERVICE_ERROR'
    );
  }

  /**
   * Handles Redis/database errors
   * @param {Error} error - The error object
   * @returns {object} Error response
   */
  static handleDatabaseError(error) {
    console.error('Database error:', error);
    
    if (error.message.includes('Redis')) {
      return this.createErrorResponse(
        ERROR_MESSAGES.SERVICE_UNAVAILABLE,
        HTTP_STATUS.SERVICE_UNAVAILABLE,
        'DATABASE_ERROR',
        'Database connection error'
      );
    }

    return this.createErrorResponse(
      ERROR_MESSAGES.SERVICE_UNAVAILABLE,
      HTTP_STATUS.SERVICE_UNAVAILABLE,
      'DATABASE_ERROR'
    );
  }

  /**
   * Handles validation errors
   * @param {string} message - Validation error message
   * @param {string} field - Field that failed validation
   * @returns {object} Error response
   */
  static handleValidationError(message, field = null) {
    const errorResponse = this.createErrorResponse(
      message,
      HTTP_STATUS.BAD_REQUEST,
      'VALIDATION_ERROR'
    );

    if (field) {
      errorResponse.response.errors = [{
        field,
        message,
        value: null
      }];
    }

    return errorResponse;
  }

  /**
   * Handles generic server errors
   * @param {Error} error - The error object
   * @param {string} context - Context where error occurred
   * @returns {object} Error response
   */
  static handleServerError(error, context = 'Unknown') {
    console.error(`Server error in ${context}:`, error);
    
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    return this.createErrorResponse(
      ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      'INTERNAL_SERVER_ERROR',
      isDevelopment ? error.message : undefined
    );
  }

  /**
   * Handles customer already exists errors
   * @param {string} type - Type of conflict (phone/email)
   * @param {string} value - The conflicting value
   * @returns {object} Error response
   */
  static handleCustomerExistsError(type, value) {
    const message = type === 'phone' 
      ? ERROR_MESSAGES.CUSTOMER_ALREADY_EXISTS_PHONE
      : ERROR_MESSAGES.CUSTOMER_ALREADY_EXISTS_EMAIL;

    return this.createErrorResponse(
      message,
      HTTP_STATUS.CONFLICT,
      'CUSTOMER_EXISTS',
      {
        [type]: value,
        customerExists: true
      }
    );
  }

  /**
   * Sends error response to client
   * @param {object} res - Express response object
   * @param {object} errorResponse - Error response object
   */
  static sendErrorResponse(res, errorResponse) {
    const { response, statusCode } = errorResponse;
    res.status(statusCode).json(response);
  }
}

module.exports = ErrorHandler;
