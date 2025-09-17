/**
 * Centralized logging utility
 * Provides structured logging with performance optimization
 */

const logger = require('../config/logger');
const { LOG_MESSAGES } = require('../constants/customerConstants');


// Maximum data size for logging to prevent memory issues
const MAX_LOG_DATA_SIZE = 1000;

class Logger {
  /**
   * Logs customer signup request
   * @param {string} phoneNumber - Customer phone number
   * @param {string} email - Customer email
   */
  static logCustomerSignupRequest(phoneNumber, email) {
    logger.info(`${LOG_MESSAGES.CUSTOMER_SIGNUP_REQUEST}: ${phoneNumber}, ${email}`);
  }

  /**
   * Logs customer existence check
   * @param {string} identifier - Phone number or email being checked
   */
  static logCheckingCustomerExists(identifier) {
    logger.info(`${LOG_MESSAGES.CHECKING_EXISTING_CUSTOMER}: ${identifier}`);
  }

  /**
   * Logs password generation
   */
  static logGeneratingPassword() {
    logger.info(LOG_MESSAGES.GENERATING_PASSWORD);
  }

  /**
   * Logs Shopify customer creation
   */
  static logCreatingShopifyCustomer() {
    logger.info(LOG_MESSAGES.CREATING_SHOPIFY_CUSTOMER);
  }

  /**
   * Logs Redis data storage
   */
  static logStoringRedisData() {
    logger.info(LOG_MESSAGES.STORING_REDIS_DATA);
  }

  /**
   * Logs successful customer creation
   * @param {string} customerId - Created customer ID
   */
  static logCustomerCreatedSuccess(customerId) {
    logger.info(`${LOG_MESSAGES.CUSTOMER_CREATED_SUCCESS}: ${customerId}`);
  }

  /**
   * Logs customer found
   * @param {string} email - Customer email
   */
  static logCustomerFound(email) {
    logger.info(`${LOG_MESSAGES.CUSTOMER_FOUND}: ${email}`);
  }

  /**
   * Logs customer not found
   * @param {string} phoneNumber - Phone number that was searched
   */
  static logCustomerNotFound(phoneNumber) {
    logger.info(`${LOG_MESSAGES.CUSTOMER_NOT_FOUND}: ${phoneNumber}`);
  }

  /**
   * Logs errors with context
   * @param {string} context - Where the error occurred
   * @param {Error} error - Error object
   */
  static logError(context, error) {
    const safeContext = context && typeof context === 'string' 
      ? context.trim() 
      : 'Unknown';
    
    const errorData = {
      context: safeContext,
      timestamp: new Date().toISOString()
    };
    
    if (error) {
      errorData.message = error.message;
      errorData.name = error.name;
      if (process.env.NODE_ENV === 'development') {
        errorData.stack = error.stack;
      }
    }
    
    logger.error(`${LOG_MESSAGES.ERROR_OCCURRED} in ${safeContext}:`, errorData);
  }

  /**
   * Logs info messages
   * @param {string} message - Info message
   * @param {any} data - Optional data to log
   */
  static logInfo(message, data = null) {
    const safeMessage = message && typeof message === 'string'
      ? message.trim()
      : 'Info message';
    
    if (data !== null && data !== undefined) {
      const safeData = this._sanitizeLogData(data);
      logger.info(safeMessage, safeData);
    } else {
      logger.info(safeMessage);
    }
  }

  /**
   * Logs warnings
   * @param {string} message - Warning message
   * @param {any} data - Optional data to log
   */
  static logWarning(message, data = null) {
    const safeMessage = message && typeof message === 'string'
      ? message.trim()
      : 'Warning occurred';
    
    if (data !== null && data !== undefined) {
      const safeData = this._sanitizeLogData(data);
      logger.warn(`WARNING: ${safeMessage}`, safeData);
    } else {
      logger.warn(`WARNING: ${safeMessage}`);
    }
  }
  
  /**
   * Sanitizes log data to prevent memory issues and sensitive data exposure
   * @param {any} data - Data to sanitize
   * @returns {any} Sanitized data
   * @private
   */
  static _sanitizeLogData(data) {
    if (data === null || data === undefined) {
      return data;
    }
    
    try {
      const dataString = JSON.stringify(data);
      
      // Truncate if too large
      if (dataString.length > MAX_LOG_DATA_SIZE) {
        return {
          _truncated: true,
          _originalSize: dataString.length,
          data: dataString.substring(0, MAX_LOG_DATA_SIZE) + '...'
        };
      }
      
      // Hide sensitive information in production
      if (process.env.NODE_ENV === 'production' && typeof data === 'object') {
        const sanitized = { ...data };
        
        // Remove or mask sensitive fields
        const sensitiveFields = ['password', 'token', 'secret', 'key', 'phoneNumber', 'email'];
        sensitiveFields.forEach(field => {
          if (sanitized[field]) {
            sanitized[field] = '[HIDDEN]';
          }
        });
        
        return sanitized;
      }
      
      return data;
    } catch (error) {
      return {
        _error: 'Failed to sanitize log data',
        _type: typeof data
      };
    }
  }
}

module.exports = Logger;
