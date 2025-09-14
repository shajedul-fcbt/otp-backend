/**
 * Centralized logging utility
 */

const { LOG_MESSAGES } = require('../constants/customerConstants');

class Logger {
  /**
   * Logs customer signup request
   * @param {string} phoneNumber - Customer phone number
   * @param {string} email - Customer email
   */
  static logCustomerSignupRequest(phoneNumber, email) {
    console.log(`${LOG_MESSAGES.CUSTOMER_SIGNUP_REQUEST}: ${phoneNumber}, ${email}`);
  }

  /**
   * Logs customer existence check
   * @param {string} identifier - Phone number or email being checked
   */
  static logCheckingCustomerExists(identifier) {
    console.log(`${LOG_MESSAGES.CHECKING_EXISTING_CUSTOMER}: ${identifier}`);
  }

  /**
   * Logs password generation
   */
  static logGeneratingPassword() {
    console.log(LOG_MESSAGES.GENERATING_PASSWORD);
  }

  /**
   * Logs Shopify customer creation
   */
  static logCreatingShopifyCustomer() {
    console.log(LOG_MESSAGES.CREATING_SHOPIFY_CUSTOMER);
  }

  /**
   * Logs Redis data storage
   */
  static logStoringRedisData() {
    console.log(LOG_MESSAGES.STORING_REDIS_DATA);
  }

  /**
   * Logs successful customer creation
   * @param {string} customerId - Created customer ID
   */
  static logCustomerCreatedSuccess(customerId) {
    console.log(`${LOG_MESSAGES.CUSTOMER_CREATED_SUCCESS}: ${customerId}`);
  }

  /**
   * Logs customer found
   * @param {string} email - Customer email
   */
  static logCustomerFound(email) {
    console.log(`${LOG_MESSAGES.CUSTOMER_FOUND}: ${email}`);
  }

  /**
   * Logs customer not found
   * @param {string} phoneNumber - Phone number that was searched
   */
  static logCustomerNotFound(phoneNumber) {
    console.log(`${LOG_MESSAGES.CUSTOMER_NOT_FOUND}: ${phoneNumber}`);
  }

  /**
   * Logs errors with context
   * @param {string} context - Where the error occurred
   * @param {Error} error - Error object
   */
  static logError(context, error) {
    console.error(`${LOG_MESSAGES.ERROR_OCCURRED} in ${context}:`, error);
  }

  /**
   * Logs info messages
   * @param {string} message - Info message
   * @param {any} data - Optional data to log
   */
  static logInfo(message, data = null) {
    if (data) {
      console.log(message, data);
    } else {
      console.log(message);
    }
  }

  /**
   * Logs warnings
   * @param {string} message - Warning message
   * @param {any} data - Optional data to log
   */
  static logWarning(message, data = null) {
    if (data) {
      console.warn(`⚠️ ${message}`, data);
    } else {
      console.warn(`⚠️ ${message}`);
    }
  }
}

module.exports = Logger;
