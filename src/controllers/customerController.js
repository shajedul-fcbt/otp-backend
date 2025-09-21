const customerService = require('../services/customerService');
const ErrorHandler = require('../utils/errorHandler');
const ResponseHelper = require('../utils/responseHelper');
const { validate, customerSignupSchema } = require('../middlewares/validation');
const logger = require('../config/logger');

class CustomerController {
  /**
   * Create a new customer account
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  async createCustomer(req, res) {
    try {
      const customerData = req.body;
      logger.info('Customer creation request received', { 
        phoneNumber: customerData.phoneNumber,
        email: customerData.email 
      });
      
      // Delegate business logic to service layer
      logger.debug('Processing customer creation through service layer');
      const result = await customerService.createCustomer(customerData);
      
      if (!result.success) {
        logger.warn('WARNING: Customer creation failed', { 
          error: result.error,
          message: result.message,
          phoneNumber: customerData.phoneNumber 
        });
        
        // Handle specific error cases
        if (result.error === 'CUSTOMER_EXISTS_PHONE') {
          return ResponseHelper.conflict(res, result.message, result.data);
        }
        
        if (result.error === 'CUSTOMER_EXISTS_EMAIL') {
          return ResponseHelper.conflict(res, result.message, result.data);
        }
        
        if (result.error === 'SHOPIFY_CREATION_FAILED') {
          return ErrorHandler.sendErrorResponse(res, 
            ErrorHandler.handleShopifyError(new Error(result.details))
          );
        }
        
        // Generic error handling
        return ErrorHandler.sendErrorResponse(res, 
          ErrorHandler.createErrorResponse(result.message, 400, result.error)
        );
      }

      // Success response
      logger.info('Customer created successfully', { 
        customerId: result.data?.customerId,
        phoneNumber: customerData.phoneNumber 
      });
      return ResponseHelper.customerCreated(res, result.data);

    } catch (error) {
      logger.error('ERROR: Error in createCustomer controller', { 
        error: error.message,
        stack: error.stack,
        phoneNumber: req.body?.phoneNumber 
      });
      
      // Handle different types of errors
      if (error.message.includes('Shopify')) {
        return ErrorHandler.sendErrorResponse(res, ErrorHandler.handleShopifyError(error));
      }
      
      if (error.message.includes('Redis')) {
        return ErrorHandler.sendErrorResponse(res, ErrorHandler.handleDatabaseError(error));
      }
      
      return ErrorHandler.sendErrorResponse(res, 
        ErrorHandler.handleServerError(error, 'createCustomer')
      );
    }
  }

  /**
   * Check if a customer exists on Shopify by phone number and/or email
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  async checkCustomerExists(req, res) {
    try {
      const { phoneNumber, email } = req.query;
      logger.info('Customer existence check request', { phoneNumber });

      // Validate phone number
      const phoneValidation = customerService.validatePhoneNumber(phoneNumber);
      if (!phoneValidation.isValid) {
        logger.warn('WARNING: Invalid phone number provided', { 
          phoneNumber,
          validationError: phoneValidation.message 
        });
        return ErrorHandler.sendErrorResponse(res, 
          ErrorHandler.handleValidationError(phoneValidation.message, 'phoneNumber')
        );
      }

      // Check if customer exists using service layer
      logger.debug('Checking customer existence in Shopify', { 
        normalizedPhone: phoneValidation.normalizedNumber 
      });
      const result = await customerService.checkCustomerExists(phoneValidation.normalizedNumber);
      
      if (result.exists) {
        logger.info('Customer found', { 
          phoneNumber: phoneValidation.normalizedNumber,
          customerId: result.customer?.id 
        });
        return ResponseHelper.customerFound(res, {
          exists: true,
          customer: result.customer
        });
      } else {
        logger.info('Customer not found', { 
          phoneNumber: phoneValidation.normalizedNumber 
        });
        return ResponseHelper.customerNotFound(res, phoneValidation.normalizedNumber);
      }

    } catch (error) {
      logger.error('ERROR: Error in checkCustomerExists controller', { 
        error: error.message,
        stack: error.stack,
        phoneNumber: req.query?.phoneNumber 
      });
      
      // Handle different types of errors
      if (error.message.includes('Shopify')) {
        return ErrorHandler.sendErrorResponse(res, ErrorHandler.handleShopifyError(error));
      }
      
      return ErrorHandler.sendErrorResponse(res, 
        ErrorHandler.handleServerError(error, 'checkCustomerExists')
      );
    }
  }

}

module.exports = new CustomerController();
