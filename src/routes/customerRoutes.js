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

/**
 * @swagger
 * /api/customer/signup:
 *   post:
 *     summary: Create a new customer account
 *     description: |
 *       Creates a new customer account in Shopify with the provided information.
 *       Generates a random password for the customer and stores customer data in Redis.
 *       The customer must not already exist (checked by both phone number and email).
 *     tags: [Customer]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CustomerSignupRequest'
 *           examples:
 *             male_customer:
 *               summary: Male customer signup
 *               value:
 *                 phoneNumber: "+8801712345678"
 *                 name: "John Doe"
 *                 email: "john.doe@example.com"
 *                 gender: "male"
 *                 birthdate: "1990-01-15"
 *                 acceptsMarketing: true
 *             female_customer:
 *               summary: Female customer signup
 *               value:
 *                 phoneNumber: "+8801812345678"
 *                 name: "Jane Smith"
 *                 email: "jane.smith@example.com"
 *                 gender: "female"
 *                 birthdate: "1992-05-20"
 *                 acceptsMarketing: false
 *             minimal_customer:
 *               summary: Minimal required fields
 *               value:
 *                 phoneNumber: "+8801912345678"
 *                 name: "Alex Johnson"
 *                 email: "alex.johnson@example.com"
 *     responses:
 *       201:
 *         description: Customer created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CustomerSignupResponse'
 *             examples:
 *               success:
 *                 summary: Successful customer creation
 *                 value:
 *                   success: true
 *                   message: "Customer account created successfully"
 *                   data:
 *                     customerId: "gid://shopify/Customer/123456789"
 *                     phoneNumber: "+8801712345678"
 *                     email: "john.doe@example.com"
 *                     name: "John Doe"
 *                     temporaryPassword: "Xy9$mK2#nP8Q"
 *                     acceptsMarketing: true
 *                     createdAt: "2024-01-15T10:30:00.000Z"
 *       400:
 *         description: Validation error or customer creation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               validation_error:
 *                 summary: Validation error
 *                 value:
 *                   success: false
 *                   message: "Validation error"
 *                   errors:
 *                     - field: "email"
 *                       message: "Please provide a valid email address"
 *               shopify_error:
 *                 summary: Shopify creation error
 *                 value:
 *                   success: false
 *                   message: "Failed to create customer account"
 *                   error: "Email has already been taken"
 *       409:
 *         description: Customer already exists
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Customer already exists with this phone number"
 *                 data:
 *                   type: object
 *                   properties:
 *                     phoneNumber:
 *                       type: string
 *                       example: "+8801712345678"
 *                     customerExists:
 *                       type: boolean
 *                       example: true
 *       429:
 *         description: Too many signup attempts
 *       503:
 *         description: Service unavailable - External service error
 */
router.post('/signup', 
  signupLimiter,                    // Rate limit signup attempts
  validate(customerSignupSchema),   // Validate request body
  validatePhoneNumber,              // Custom phone validation
  customerController.createCustomer
);

/**
 * @swagger
 * /api/customer/check-exists:
 *   get:
 *     summary: Check if a customer exists on Shopify by phone number
 *     description: |
 *       Checks if a customer with the given phone number exists in Shopify.
 *       Returns customer details (name, email, phone) if found, or false if not found.
 *     tags: [Customer]
 *     parameters:
 *       - in: query
 *         name: phoneNumber
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(\+8801[3-9]\d{8}|01[3-9]\d{8})$'
 *         description: Bangladeshi phone number (with or without +88 prefix)
 *         examples:
 *           international:
 *             value: "+8801712345678"
 *             summary: International format
 *           national:
 *             value: "01712345678"
 *             summary: National format
 *     responses:
 *       200:
 *         description: Customer check completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *             examples:
 *               customer_found:
 *                 summary: Customer exists
 *                 value:
 *                   success: true
 *                   message: "Customer found"
 *                   data:
 *                     exists: true
 *                     customer:
 *                       name: "John Doe"
 *                       email: "john.doe@example.com"
 *                       phoneNumber: "+8801712345678"
 *                       customerId: "gid://shopify/Customer/123456789"
 *               customer_not_found:
 *                 summary: Customer does not exist
 *                 value:
 *                   success: true
 *                   message: "Customer not found"
 *                   data:
 *                     exists: false
 *                     phoneNumber: "+8801712345678"
 *       400:
 *         description: Missing phone number parameter
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               missing_phone:
 *                 summary: Missing phone number
 *                 value:
 *                   success: false
 *                   message: "Phone number is required"
 *                   error: "Missing phone number parameter"
 *       429:
 *         description: Too many requests
 *       503:
 *         description: Service unavailable - Shopify connection error
 */
router.get('/check-exists', 
  generalLimiter,                   // Rate limit requests
  validatePhoneNumberQuery,         // Validate phone number in query params
  customerController.checkCustomerExists
);


module.exports = router;
