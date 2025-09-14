/**
 * Customer business logic service layer
 */

const shopifyService = require('./shopifyService');
const otpGenerator = require('../utils/otpGenerator');
const redisClient = require('../config/database');
const Logger = require('../utils/logger');
const { REDIS_KEYS, PASSWORD_CONFIG } = require('../constants/customerConstants');

class CustomerService {
  /**
   * Creates a new customer account
   * @param {object} customerData - Customer information
   * @returns {object} Customer creation result
   */
  async createCustomer(customerData) {
    try {
      const { phoneNumber, name, email, gender, birthdate, acceptsMarketing } = customerData;
      
      Logger.logCustomerSignupRequest(phoneNumber, email);

      // Check if customer already exists by phone
      const existingByPhone = await this.checkCustomerExists(phoneNumber);
      if (existingByPhone.exists) {
        return {
          success: false,
          error: 'CUSTOMER_EXISTS_PHONE',
          message: 'Customer already exists with this phone number',
          data: { phoneNumber, customerExists: true }
        };
      }

      // Check if customer already exists by email
      const existingByEmail = await this.checkCustomerExists(email);
      if (existingByEmail.exists) {
        return {
          success: false,
          error: 'CUSTOMER_EXISTS_EMAIL',
          message: 'Customer already exists with this email address',
          data: { email, customerExists: true }
        };
      }

      // Generate password and prepare customer data
      const passwordData = await this.generateCustomerPassword();
      const shopifyCustomerData = this.prepareShopifyCustomerData(customerData, passwordData.plainPassword);

      // Create customer in Shopify
      Logger.logCreatingShopifyCustomer();
      const shopifyResult = await shopifyService.createCustomer(shopifyCustomerData);
      
      if (!shopifyResult.success) {
        return {
          success: false,
          error: 'SHOPIFY_CREATION_FAILED',
          message: 'Failed to create customer account',
          details: shopifyResult.error
        };
      }

      // Store customer data in Redis
      await this.storeCustomerData(shopifyResult.customer, customerData, passwordData);

      // Prepare response data
      const responseData = this.prepareCustomerResponse(shopifyResult.customer, customerData, passwordData.plainPassword);

      Logger.logCustomerCreatedSuccess(shopifyResult.customer.id);

      return {
        success: true,
        data: responseData
      };

    } catch (error) {
      Logger.logError('createCustomer', error);
      throw error;
    }
  }

  /**
   * Checks if a customer exists
   * @param {string} identifier - Phone number or email
   * @returns {object} Customer existence check result
   */
  async checkCustomerExists(identifier) {
    try {
      Logger.logCheckingCustomerExists(identifier);
      
      const result = await shopifyService.checkCustomerExists(identifier);
      
      if (result.exists && result.customer) {
        return {
          exists: true,
          customer: this.formatCustomerData(result.customer, identifier)
        };
      }

      return {
        exists: false,
        customer: null
      };

    } catch (error) {
      Logger.logError('checkCustomerExists', error);
      throw error;
    }
  }

  /**
   * Generates a random password for new customers
   * @returns {object} Password data
   */
  async generateCustomerPassword() {
    Logger.logGeneratingPassword();
    
    const plainPassword = otpGenerator.generateRandomPassword(PASSWORD_CONFIG.DEFAULT_LENGTH);
    const hashedPassword = otpGenerator.hashPassword(plainPassword);
    
    return {
      plainPassword,
      hashedPassword
    };
  }

  /**
   * Prepares customer data for Shopify API
   * @param {object} customerData - Original customer data
   * @param {string} password - Plain text password
   * @returns {object} Formatted customer data for Shopify
   */
  prepareShopifyCustomerData(customerData, password) {
    const { phoneNumber, name, email, gender, birthdate, acceptsMarketing } = customerData;
    
    return {
      phoneNumber,
      name,
      email,
      password,
      gender,
      birthdate,
      acceptsMarketing: acceptsMarketing || false
    };
  }

  /**
   * Stores customer data in Redis
   * @param {object} shopifyCustomer - Customer data from Shopify
   * @param {object} originalData - Original customer data
   * @param {object} passwordData - Password information
   */
  async storeCustomerData(shopifyCustomer, originalData, passwordData) {
    Logger.logStoringRedisData();
    
    const customerRedisData = {
      customerId: shopifyCustomer.id,
      phoneNumber: originalData.phoneNumber,
      email: originalData.email,
      name: originalData.name,
      hashedPassword: passwordData.hashedPassword,
      plainPassword: passwordData.plainPassword, // Store temporarily for response
      gender: originalData.gender,
      birthdate: originalData.birthdate,
      acceptsMarketing: originalData.acceptsMarketing,
      createdAt: new Date().toISOString(),
      shopifyData: shopifyCustomer
    };

    // Store by both phone number and email for easy lookup
    const phoneKey = otpGenerator.generateCustomerDataKey(originalData.phoneNumber);
    const emailKey = otpGenerator.generateCustomerDataKey(originalData.email);
    
    // Store with no expiry (persist the data)
    await redisClient.set(phoneKey, customerRedisData);
    await redisClient.set(emailKey, customerRedisData);
  }

  /**
   * Prepares customer response data
   * @param {object} shopifyCustomer - Customer data from Shopify
   * @param {object} originalData - Original customer data
   * @param {string} temporaryPassword - Temporary password for user
   * @returns {object} Formatted response data
   */
  prepareCustomerResponse(shopifyCustomer, originalData, temporaryPassword) {
    return {
      customerId: shopifyCustomer.id,
      phoneNumber: originalData.phoneNumber,
      email: originalData.email,
      name: originalData.name,
      temporaryPassword, // Include in response so user knows their password
      acceptsMarketing: originalData.acceptsMarketing,
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Formats customer data for response
   * @param {object} customer - Customer data from Shopify
   * @param {string} identifier - Phone number or email used for lookup
   * @returns {object} Formatted customer data
   */
  formatCustomerData(customer, identifier) {
    return {
      name: customer.displayName || `${customer.firstName} ${customer.lastName}`.trim(),
      email: customer.email,
      phoneNumber: customer.phone || identifier,
      customerId: customer.id
    };
  }

  /**
   * Validates phone number format
   * @param {string} phoneNumber - Phone number to validate
   * @returns {object} Validation result
   */
  validatePhoneNumber(phoneNumber) {
    const { BD_PHONE_REGEX, INTERNATIONAL_PREFIX, LOCAL_PREFIX } = require('../constants/customerConstants');
    
    if (!phoneNumber) {
      return {
        isValid: false,
        message: 'Phone number is required'
      };
    }

    if (!BD_PHONE_REGEX.test(phoneNumber)) {
      return {
        isValid: false,
        message: 'Invalid Bangladeshi phone number format. Must be +8801XXXXXXXXX or 01XXXXXXXXX'
      };
    }

    // Normalize phone number to international format
    let normalizedNumber = phoneNumber;
    if (phoneNumber.startsWith(LOCAL_PREFIX)) {
      normalizedNumber = INTERNATIONAL_PREFIX + phoneNumber;
    }

    return {
      isValid: true,
      normalizedNumber,
      originalNumber: phoneNumber
    };
  }
}

module.exports = new CustomerService();
