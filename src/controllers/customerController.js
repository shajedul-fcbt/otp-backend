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
   * Get customer information
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  async getCustomer(req, res) {
    try {
      const { identifier } = req.params; // Can be phone number or email
      
      console.log(`🔍 Getting customer info for: ${identifier}`);

      // Try to get customer from Redis first
      const customerKey = otpGenerator.generateCustomerDataKey(identifier);
      let customerData = await redisClient.get(customerKey);
      
      if (!customerData) {
        // If not in Redis, check Shopify
        console.log('🏪 Customer not found in Redis, checking Shopify...');
        const shopifyResult = await shopifyService.checkCustomerExists(identifier);
        
        if (!shopifyResult.exists) {
          return res.status(404).json({
            success: false,
            message: 'Customer not found',
            data: {
              identifier: identifier,
              customerExists: false
            }
          });
        }
        
        customerData = {
          customerId: shopifyResult.customer.id,
          phoneNumber: shopifyResult.customer.phone,
          email: shopifyResult.customer.email,
          name: `${shopifyResult.customer.firstName} ${shopifyResult.customer.lastName}`.trim(),
          acceptsMarketing: shopifyResult.customer.acceptsMarketing,
          createdAt: shopifyResult.customer.createdAt,
          shopifyData: shopifyResult.customer
        };
      }

      // Prepare response (exclude sensitive data)
      const responseData = {
        customerId: customerData.customerId,
        phoneNumber: customerData.phoneNumber,
        email: customerData.email,
        name: customerData.name,
        acceptsMarketing: customerData.acceptsMarketing,
        createdAt: customerData.createdAt
      };

      res.status(200).json({
        success: true,
        message: 'Customer information retrieved successfully',
        data: responseData
      });

    } catch (error) {
      console.error('❌ Error in getCustomer:', error);
      
      res.status(500).json({
        success: false,
        message: 'Internal server error occurred while retrieving customer information',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Update customer password
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  async updatePassword(req, res) {
    try {
      const { phoneNumber, currentPassword, newPassword } = req.body;
      
      console.log(`🔐 Password update request for: ${phoneNumber}`);

      // Get customer data from Redis
      const customerKey = otpGenerator.generateCustomerDataKey(phoneNumber);
      const customerData = await redisClient.get(customerKey);
      
      if (!customerData) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found',
          data: {
            phoneNumber: phoneNumber,
            customerExists: false
          }
        });
      }

      // Verify current password
      const isCurrentPasswordValid = bcrypt.compareSync(currentPassword, customerData.hashedPassword);
      
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      // Hash the new password
      const newHashedPassword = otpGenerator.hashPassword(newPassword);
      
      // Update customer data in Redis
      customerData.hashedPassword = newHashedPassword;
      customerData.updatedAt = new Date().toISOString();
      
      await redisClient.set(customerKey, customerData);
      
      // Also update by email key if exists
      if (customerData.email) {
        const emailKey = otpGenerator.generateCustomerDataKey(customerData.email);
        await redisClient.set(emailKey, customerData);
      }

      console.log(`✅ Password updated successfully for: ${phoneNumber}`);

      res.status(200).json({
        success: true,
        message: 'Password updated successfully',
        data: {
          phoneNumber: phoneNumber,
          updatedAt: customerData.updatedAt
        }
      });

    } catch (error) {
      console.error('❌ Error in updatePassword:', error);
      
      res.status(500).json({
        success: false,
        message: 'Internal server error occurred while updating password',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Check if customer exists
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  async checkCustomerExists(req, res) {
    try {
      const { identifier } = req.query; // Can be phone number or email
      
      if (!identifier) {
        return res.status(400).json({
          success: false,
          message: 'Identifier (phone number or email) is required',
          errors: [{
            field: 'identifier',
            message: 'Identifier parameter is required'
          }]
        });
      }

      console.log(`🔍 Checking customer existence for: ${identifier}`);

      // Check Redis first
      const customerKey = otpGenerator.generateCustomerDataKey(identifier);
      const customerData = await redisClient.get(customerKey);
      
      if (customerData) {
        return res.status(200).json({
          success: true,
          message: 'Customer found',
          data: {
            identifier: identifier,
            customerExists: true,
            source: 'redis'
          }
        });
      }

      // Check Shopify
      const shopifyResult = await shopifyService.checkCustomerExists(identifier);
      
      res.status(200).json({
        success: true,
        message: shopifyResult.exists ? 'Customer found' : 'Customer not found',
        data: {
          identifier: identifier,
          customerExists: shopifyResult.exists,
          source: 'shopify',
          ...(shopifyResult.error && { error: shopifyResult.error })
        }
      });

    } catch (error) {
      console.error('❌ Error in checkCustomerExists:', error);
      
      res.status(500).json({
        success: false,
        message: 'Internal server error occurred while checking customer existence',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = new CustomerController();
