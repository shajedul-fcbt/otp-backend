const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const { validate, validatePhoneNumber, validatePhoneNumberQuery, customerSignupSchema } = require('../middlewares/validation');
const { signupLimiter, generalLimiter } = require('../middlewares/rateLimiter');

/**
 * @swagger
 * tags:
 *   name: Customer
 *   description: Customer management endpoints for Shopify integration
 */

// Customer signup endpoint
router.post('/signup', 
  signupLimiter,                    // Rate limit signup attempts
  validate(customerSignupSchema),   // Validate request body
  validatePhoneNumber,              // Custom phone validation
  customerController.createCustomer
);

// Check customer existence endpoint
router.get('/check-exists', 
  generalLimiter,                   // Rate limit requests
  validatePhoneNumberQuery,         // Validate phone number in query params
  customerController.checkCustomerExists
);

module.exports = router;