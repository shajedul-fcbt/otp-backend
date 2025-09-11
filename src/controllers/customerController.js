const shopifyService = require('../services/shopifyService');
const otpGenerator = require('../utils/otpGenerator');
const redisClient = require('../config/database');
const bcrypt = require('bcrypt');

class CustomerController {
  /**
   * Create a new customer account
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  async createCustomer(req, res) {
    try {
      const { phoneNumber, name, email, gender, birthdate, acceptsMarketing } = req.body;
      
      console.log(`👤 Customer signup request for: ${phoneNumber}, ${email}`);

      // First verify that the customer doesn't already exist
      console.log('🔍 Checking if customer already exists...');
      const existingCustomer = await shopifyService.checkCustomerExists(phoneNumber);
      
      if (existingCustomer.exists) {
        return res.status(409).json({
          success: false,
          message: 'Customer already exists with this phone number',
          data: {
            phoneNumber: phoneNumber,
            customerExists: true
          }
        });
      }

      // Check if customer exists by email as well
      const existingByEmail = await shopifyService.checkCustomerExists(email);
      if (existingByEmail.exists) {
        return res.status(409).json({
          success: false,
          message: 'Customer already exists with this email address',
          data: {
            email: email,
            customerExists: true
          }
        });
      }

      // Generate a random password for the customer
      console.log('🔐 Generating random password...');
      const randomPassword = otpGenerator.generateRandomPassword(12);
      const hashedPassword = otpGenerator.hashPassword(randomPassword);

      // Prepare customer data for Shopify
      const customerData = {
        phoneNumber: phoneNumber,
        name: name,
        email: email,
        password: randomPassword, // Shopify expects plain password
        gender: gender,
        birthdate: birthdate,
        acceptsMarketing: acceptsMarketing || false
      };

      // Create customer in Shopify
      console.log('🏪 Creating customer in Shopify...');
      const shopifyResult = await shopifyService.createCustomer(customerData);
      
      if (!shopifyResult.success) {
        console.error('❌ Failed to create customer in Shopify:', shopifyResult.error);
        return res.status(400).json({
          success: false,
          message: 'Failed to create customer account',
          error: shopifyResult.error
        });
      }

      // Store customer data in Redis for persistence
      console.log('💾 Storing customer data in Redis...');
      const customerRedisData = {
        customerId: shopifyResult.customer.id,
        phoneNumber: phoneNumber,
        email: email,
        name: name,
        hashedPassword: hashedPassword,
        plainPassword: randomPassword, // Store temporarily for response
        gender: gender,
        birthdate: birthdate,
        acceptsMarketing: acceptsMarketing,
        createdAt: new Date().toISOString(),
        shopifyData: shopifyResult.customer
      };

      // Store by both phone number and email for easy lookup
      const phoneKey = otpGenerator.generateCustomerDataKey(phoneNumber);
      const emailKey = otpGenerator.generateCustomerDataKey(email);
      
      // Store with no expiry (persist the data)
      await redisClient.set(phoneKey, customerRedisData);
      await redisClient.set(emailKey, customerRedisData);

      // Prepare response (exclude sensitive data)
      const responseData = {
        customerId: shopifyResult.customer.id,
        phoneNumber: phoneNumber,
        email: email,
        name: name,
        temporaryPassword: randomPassword, // Include in response so user knows their password
        acceptsMarketing: acceptsMarketing,
        createdAt: customerRedisData.createdAt
      };

      console.log(`✅ Customer created successfully: ${shopifyResult.customer.id}`);

      res.status(201).json({
        success: true,
        message: 'Customer account created successfully',
        data: responseData
      });

    } catch (error) {
      console.error('❌ Error in createCustomer:', error);
      
      // Handle specific Shopify errors
      if (error.message.includes('Shopify')) {
        return res.status(503).json({
          success: false,
          message: 'External service error. Please try again later.',
          error: 'Shopify integration error'
        });
      }
      
      // Handle Redis errors
      if (error.message.includes('Redis')) {
        return res.status(503).json({
          success: false,
          message: 'Service temporarily unavailable. Please try again later.',
          error: 'Database connection error'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Internal server error occurred while creating customer account',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Check if a customer exists on Shopify by phone number
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  async checkCustomerExists(req, res) {
    try {
      console.log('req.query', req.query);
      let { phoneNumber } = req.query;
      console.log('phoneNumber', phoneNumber);

      if (!phoneNumber) {
        return res.status(400).json({
          success: false,
          message: 'Phone number is required',
          error: 'Missing phone number parameter'
        });
      }

      // Validate Bangladeshi phone number (with or without +88)
      // Accepts: +8801XXXXXXXXX or 01XXXXXXXXX
      const bdPhoneRegex = /^(\+8801[3-9]\d{8}|01[3-9]\d{8})$/;
      if (!bdPhoneRegex.test(phoneNumber)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid Bangladeshi phone number format',
          error: 'Phone number must be a valid Bangladeshi number (e.g. +88017XXXXXXXX or 017XXXXXXXX)'
        });
      }

      // Convert to international format if needed
      if (phoneNumber.startsWith('01')) {
        phoneNumber = '+88' + phoneNumber;
      }
      if (!phoneNumber.startsWith('+880')) {
        // Should not happen due to regex, but just in case
        return res.status(400).json({
          success: false,
          message: 'Invalid Bangladeshi phone number format',
          error: 'Phone number must start with +880 or 01'
        });
      }

      console.log(`🔍 Checking customer existence for phone: ${phoneNumber}`);

      // Check if customer exists in Shopify
      const customerCheck = await shopifyService.checkCustomerExists(phoneNumber);
      if (customerCheck.exists && customerCheck.customer) {
        // Customer found - return customer details
        const customerData = {
          exists: true,
          customer: {
            name: customerCheck.customer.displayName || customerCheck.customer.firstName + ' ' + customerCheck.customer.lastName,
            email: customerCheck.customer.email,
            phoneNumber: customerCheck.customer.phone || phoneNumber,
            customerId: customerCheck.customer.id
          }
        };

        console.log(`✅ Customer found: ${customerData.customer.email}`);

        return res.status(200).json({
          success: true,
          message: 'Customer found',
          data: customerData
        });
      } else {
        // Customer not found
        console.log(`❌ Customer not found for phone: ${phoneNumber}`);

        return res.status(200).json({
          success: true,
          message: 'Customer not found',
          data: {
            exists: false,
            phoneNumber: phoneNumber
          }
        });
      }

    } catch (error) {
      console.error('❌ Error in checkCustomerExists:', error);
      
      // Handle specific Shopify errors
      if (error.message.includes('Shopify')) {
        return res.status(503).json({
          success: false,
          message: 'External service error. Please try again later.',
          error: 'Shopify integration error'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Internal server error occurred while checking customer existence',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

}

module.exports = new CustomerController();
