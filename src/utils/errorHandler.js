/**
 * Centralized error handling utilities
 * Provides consistent error responses and logging across the application
 */

const { ERROR_MESSAGES, HTTP_STATUS } = require('../constants/customerConstants');
const logger = require('../config/logger');

// Error type constants for better maintainability
const ERROR_TYPES = {
  SHOPIFY: 'SHOPIFY_ERROR',
  DATABASE: 'DATABASE_ERROR',
  VALIDATION: 'VALIDATION_ERROR',
  INTERNAL: 'INTERNAL_SERVER_ERROR',
  CUSTOMER_EXISTS: 'CUSTOMER_EXISTS'
};

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
    // Input validation
    if (!message || typeof message !== 'string') {
      throw new Error('Error message is required and must be a string');
    }
    
    if (!Number.isInteger(statusCode) || statusCode < 100 || statusCode >= 600) {
      statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
    }

    const response = {
      success: false,
      message: message.trim(),
      timestamp: new Date().toISOString()
    };

    if (errorCode && typeof errorCode === 'string') {
      response.errorCode = errorCode.trim();
    }

    if (details !== null && details !== undefined) {
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
    if (!error) {
      return this.createErrorResponse(
        ERROR_MESSAGES.EXTERNAL_SERVICE_ERROR,
        HTTP_STATUS.SERVICE_UNAVAILABLE,
        ERROR_TYPES.SHOPIFY
      );
    }

    // Log error with context
    logger.error('Shopify service error:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    const errorMessage = error.message || '';
    const isShopifyError = errorMessage.toLowerCase().includes('shopify');
    
    return this.createErrorResponse(
      ERROR_MESSAGES.EXTERNAL_SERVICE_ERROR,
      HTTP_STATUS.SERVICE_UNAVAILABLE,
      isShopifyError ? ERROR_TYPES.SHOPIFY : 'EXTERNAL_SERVICE_ERROR',
      process.env.NODE_ENV === 'development' ? errorMessage : undefined
    );
  }

  /**
   * Handles Redis/database errors
   * @param {Error} error - The error object
   * @returns {object} Error response
   */
  static handleDatabaseError(error) {
    if (!error) {
      return this.createErrorResponse(
        ERROR_MESSAGES.SERVICE_UNAVAILABLE,
        HTTP_STATUS.SERVICE_UNAVAILABLE,
        ERROR_TYPES.DATABASE
      );
    }

    // Log error with structured data
    logger.error('Database error:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    const errorMessage = error.message || '';
    const isRedisError = errorMessage.toLowerCase().includes('redis');
    const isDatabaseError = errorMessage.toLowerCase().includes('database');
    
    return this.createErrorResponse(
      ERROR_MESSAGES.SERVICE_UNAVAILABLE,
      HTTP_STATUS.SERVICE_UNAVAILABLE,
      ERROR_TYPES.DATABASE,
      process.env.NODE_ENV === 'development' && (isRedisError || isDatabaseError) ? errorMessage : undefined
    );
  }

  /**
   * Handles validation errors
   * @param {string} message - Validation error message
   * @param {string} field - Field that failed validation
   * @param {any} value - The invalid value (optional)
   * @returns {object} Error response
   */
  static handleValidationError(message, field = null, value = null) {
    if (!message || typeof message !== 'string') {
      message = 'Validation error occurred';
    }

    const errorResponse = this.createErrorResponse(
      message,
      HTTP_STATUS.BAD_REQUEST,
      ERROR_TYPES.VALIDATION
    );

    if (field && typeof field === 'string') {
      errorResponse.response.errors = [{
        field: field.trim(),
        message: message.trim(),
        value: process.env.NODE_ENV === 'development' ? value : null
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
    const errorContext = typeof context === 'string' ? context.trim() : 'Unknown';
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    // Enhanced error logging with structured data
    const logData = {
      context: errorContext,
      timestamp: new Date().toISOString()
    };

    if (error) {
      logData.message = error.message;
      logData.name = error.name;
      logData.stack = error.stack;
    }

    logger.error(`Server error in ${errorContext}:`, logData);
    
    return this.createErrorResponse(
      ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_TYPES.INTERNAL,
      isDevelopment && error ? error.message : undefined
    );
  }

  /**
   * Handles customer already exists errors
   * @param {string} type - Type of conflict (phone/email)
   * @param {string} value - The conflicting value
   * @returns {object} Error response
   */
  static handleCustomerExistsError(type, value) {
    // Validate input parameters
    if (!type || !['phone', 'email'].includes(type)) {
      type = 'phone'; // Default fallback
    }
    
    if (!value || typeof value !== 'string') {
      value = 'unknown'; // Safe fallback
    }

    const message = type === 'phone' 
      ? ERROR_MESSAGES.CUSTOMER_ALREADY_EXISTS_PHONE
      : ERROR_MESSAGES.CUSTOMER_ALREADY_EXISTS_EMAIL;

    // Don't expose sensitive values in production
    const safeValue = process.env.NODE_ENV === 'development' ? value : '[HIDDEN]';

    return this.createErrorResponse(
      message,
      HTTP_STATUS.CONFLICT,
      ERROR_TYPES.CUSTOMER_EXISTS,
      {
        [type]: safeValue,
        customerExists: true
      }
    );
  }

  /**
   * Sends error response to client
   * @param {object} res - Express response object
   * @param {object} errorResponse - Error response object
   * @returns {object} Express response
   */
  static sendErrorResponse(res, errorResponse) {
    // Validate inputs
    if (!res || typeof res.status !== 'function' || typeof res.json !== 'function') {
      throw new Error('Invalid Express response object provided');
    }

    if (!errorResponse || typeof errorResponse !== 'object') {
      // Fallback error response
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
        timestamp: new Date().toISOString()
      });
    }

    const { response, statusCode } = errorResponse;
    
    // Validate status code
    const validStatusCode = Number.isInteger(statusCode) && statusCode >= 100 && statusCode < 600 
      ? statusCode 
      : HTTP_STATUS.INTERNAL_SERVER_ERROR;

    return res.status(validStatusCode).json(response || {
      success: false,
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = ErrorHandler;
