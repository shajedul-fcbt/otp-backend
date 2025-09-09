const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const { validate, validatePhoneNumber, customerSignupSchema } = require('../middlewares/validation');
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

// /**
//  * @swagger
//  * /api/customer/{identifier}:
//  *   get:
//  *     summary: Get customer information
//  *     description: |
//  *       Retrieves customer information by phone number or email.
//  *       First checks Redis cache, then falls back to Shopify if not found.
//  *     tags: [Customer]
//  *     parameters:
//  *       - in: path
//  *         name: identifier
//  *         required: true
//  *         schema:
//  *           type: string
//  *         description: Customer's phone number or email address
//  *         examples:
//  *           phone:
//  *             summary: Phone number
//  *             value: "+8801712345678"
//  *           email:
//  *             summary: Email address
//  *             value: "john.doe@example.com"
//  *     responses:
//  *       200:
//  *         description: Customer information retrieved successfully
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 success:
//  *                   type: boolean
//  *                   example: true
//  *                 message:
//  *                   type: string
//  *                   example: "Customer information retrieved successfully"
//  *                 data:
//  *                   type: object
//  *                   properties:
//  *                     customerId:
//  *                       type: string
//  *                       example: "gid://shopify/Customer/123456789"
//  *                     phoneNumber:
//  *                       type: string
//  *                       example: "+8801712345678"
//  *                     email:
//  *                       type: string
//  *                       example: "john.doe@example.com"
//  *                     name:
//  *                       type: string
//  *                       example: "John Doe"
//  *                     acceptsMarketing:
//  *                       type: boolean
//  *                       example: true
//  *                     createdAt:
//  *                       type: string
//  *                       format: date-time
//  *                       example: "2024-01-15T10:30:00.000Z"
//  *       404:
//  *         description: Customer not found
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 success:
//  *                   type: boolean
//  *                   example: false
//  *                 message:
//  *                   type: string
//  *                   example: "Customer not found"
//  *                 data:
//  *                   type: object
//  *                   properties:
//  *                     identifier:
//  *                       type: string
//  *                       example: "+8801712345678"
//  *                     customerExists:
//  *                       type: boolean
//  *                       example: false
//  */
// router.get('/:identifier', 
//   generalLimiter,                   // General rate limiting
//   customerController.getCustomer
// );

// /**
//  * @swagger
//  * /api/customer/check-exists:
//  *   get:
//  *     summary: Check if customer exists
//  *     description: |
//  *       Checks if a customer exists by phone number or email.
//  *       Useful for frontend validation before signup or login attempts.
//  *     tags: [Customer]
//  *     parameters:
//  *       - in: query
//  *         name: identifier
//  *         required: true
//  *         schema:
//  *           type: string
//  *         description: Customer's phone number or email address
//  *         examples:
//  *           phone:
//  *             summary: Phone number
//  *             value: "+8801712345678"
//  *           email:
//  *             summary: Email address
//  *             value: "john.doe@example.com"
//  *     responses:
//  *       200:
//  *         description: Customer existence check completed
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 success:
//  *                   type: boolean
//  *                   example: true
//  *                 message:
//  *                   type: string
//  *                   example: "Customer found"
//  *                 data:
//  *                   type: object
//  *                   properties:
//  *                     identifier:
//  *                       type: string
//  *                       example: "+8801712345678"
//  *                     customerExists:
//  *                       type: boolean
//  *                       example: true
//  *                     source:
//  *                       type: string
//  *                       enum: ["redis", "shopify"]
//  *                       example: "redis"
//  *             examples:
//  *               customer_exists:
//  *                 summary: Customer exists
//  *                 value:
//  *                   success: true
//  *                   message: "Customer found"
//  *                   data:
//  *                     identifier: "+8801712345678"
//  *                     customerExists: true
//  *                     source: "redis"
//  *               customer_not_exists:
//  *                 summary: Customer does not exist
//  *                 value:
//  *                   success: true
//  *                   message: "Customer not found"
//  *                   data:
//  *                     identifier: "+8801712345678"
//  *                     customerExists: false
//  *                     source: "shopify"
//  *       400:
//  *         description: Missing identifier parameter
//  */
// router.get('/check-exists', 
//   generalLimiter,                   // General rate limiting
//   customerController.checkCustomerExists
// );

// /**
//  * @swagger
//  * /api/customer/update-password:
//  *   put:
//  *     summary: Update customer password
//  *     description: |
//  *       Updates the customer's password after verifying the current password.
//  *       Only updates the password in Redis storage, not in Shopify.
//  *     tags: [Customer]
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             type: object
//  *             required:
//  *               - phoneNumber
//  *               - currentPassword
//  *               - newPassword
//  *             properties:
//  *               phoneNumber:
//  *                 type: string
//  *                 pattern: '^\\+880[1-9][0-9]{8}$'
//  *                 description: Customer's phone number
//  *                 example: "+8801712345678"
//  *               currentPassword:
//  *                 type: string
//  *                 minLength: 6
//  *                 description: Current password
//  *                 example: "oldPassword123"
//  *               newPassword:
//  *                 type: string
//  *                 minLength: 8
//  *                 description: New password (minimum 8 characters)
//  *                 example: "newPassword456"
//  *     responses:
//  *       200:
//  *         description: Password updated successfully
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 success:
//  *                   type: boolean
//  *                   example: true
//  *                 message:
//  *                   type: string
//  *                   example: "Password updated successfully"
//  *                 data:
//  *                   type: object
//  *                   properties:
//  *                     phoneNumber:
//  *                       type: string
//  *                       example: "+8801712345678"
//  *                     updatedAt:
//  *                       type: string
//  *                       format: date-time
//  *                       example: "2024-01-15T10:30:00.000Z"
//  *       400:
//  *         description: Invalid current password or validation error
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 success:
//  *                   type: boolean
//  *                   example: false
//  *                 message:
//  *                   type: string
//  *                   example: "Current password is incorrect"
//  *       404:
//  *         description: Customer not found
//  */
// router.put('/update-password', 
//   generalLimiter,                   // General rate limiting
//   validatePhoneNumber,              // Validate phone number
//   customerController.updatePassword
// );

module.exports = router;
