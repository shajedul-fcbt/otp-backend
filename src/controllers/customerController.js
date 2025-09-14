const customerService = require('../services/customerService');
const ErrorHandler = require('../utils/errorHandler');
const ResponseHelper = require('../utils/responseHelper');
const { validate } = require('../middlewares/validation');
const { customerSignupSchema } = require('../middlewares/validation');

class CustomerController {
  /**
   * Create a new customer account
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  async createCustomer(req, res) {
    try {
      const customerData = req.body;
      
      // Delegate business logic to service layer
      const result = await customerService.createCustomer(customerData);
      
      if (!result.success) {
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
      return ResponseHelper.customerCreated(res, result.data);

    } catch (error) {
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
   * Check if a customer exists on Shopify by phone number
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  async checkCustomerExists(req, res) {
    try {
      const { phoneNumber } = req.query;

      // Validate phone number
      const phoneValidation = customerService.validatePhoneNumber(phoneNumber);
      if (!phoneValidation.isValid) {
        return ErrorHandler.sendErrorResponse(res, 
          ErrorHandler.handleValidationError(phoneValidation.message, 'phoneNumber')
        );
      }

      // Check if customer exists using service layer
      const result = await customerService.checkCustomerExists(phoneValidation.normalizedNumber);
      
      if (result.exists) {
        return ResponseHelper.customerFound(res, {
          exists: true,
          customer: result.customer
        });
      } else {
        return ResponseHelper.customerNotFound(res, phoneValidation.normalizedNumber);
      }

    } catch (error) {
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
