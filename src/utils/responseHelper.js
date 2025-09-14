/**
 * Standardized response utilities
 */

const { SUCCESS_MESSAGES, HTTP_STATUS } = require('../constants/customerConstants');

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
    const response = {
      success: true,
      message,
      timestamp: new Date().toISOString()
    };

    if (data !== null) {
      response.data = data;
    }

    return res.status(statusCode).json(response);
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
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message,
      errors,
      timestamp: new Date().toISOString()
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
    const response = {
      success: false,
      message,
      timestamp: new Date().toISOString()
    };

    if (data) {
      response.data = data;
    }

    return res.status(HTTP_STATUS.CONFLICT).json(response);
  }
}

module.exports = ResponseHelper;
