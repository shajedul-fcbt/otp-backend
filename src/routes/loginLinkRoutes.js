const express = require('express');
const router = express.Router();
const loginLinkController = require('../controllers/loginLinkController');
const { validate, loginLinkRequestSchema } = require('../middlewares/validation');
const { generalLimiter } = require('../middlewares/rateLimiter');
const deviceMiddleware = require('../middlewares/deviceMiddleware');

/**
 * @swagger
 * tags:
 *   name: Login Link
 *   description: Email-based login link authentication endpoints
 */

/**
 * @swagger
 * /api/auth/login-link/request:
 *   post:
 *     summary: Request a login link via email
 *     description: |
 *       Validates the email against Shopify and database, then sends a secure login link.
 *       Returns 401 if email doesn't exist in both sources.
 *     tags: [Login Link]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email address to send login link to
 *           examples:
 *             example1:
 *               summary: Valid email request
 *               value:
 *                 email: "customer@example.com"
 *     responses:
 *       200:
 *         description: Login link sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Login link sent to your email address"
 *                 data:
 *                   type: object
 *                   properties:
 *                     email:
 *                       type: string
 *                       example: "customer@example.com"
 *                     expiresIn:
 *                       type: number
 *                       description: "Link expiry time in minutes"
 *                       example: 15
 *                     sentAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-01-15T10:30:00.000Z"
 *       400:
 *         description: Invalid email format
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
 *                   example: "Please provide a valid email address"
 *                 error:
 *                   type: string
 *                   example: "INVALID_EMAIL_FORMAT"
 *       401:
 *         description: Email not found - user needs to sign up
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
 *                   example: "Invalid Email. Please sign up."
 *                 error:
 *                   type: string
 *                   example: "UNAUTHORIZED"
 *       500:
 *         description: Internal server error
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
 *                   example: "Internal server error"
 *                 error:
 *                   type: string
 *                   example: "INTERNAL_ERROR"
 */

/**
 * @swagger
 * /api/auth/login-link/verify:
 *   get:
 *     summary: Verify a login link token
 *     description: |
 *       Verifies the login token from the email link and authenticates the user.
 *       Tokens can only be used once and expire in 15 minutes.
 *     tags: [Login Link]
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Login token from the email link
 *         example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Login successful"
 *                 data:
 *                   type: object
 *                   properties:
 *                     email:
 *                       type: string
 *                       example: "customer@example.com"
 *                     customer:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: "gid://shopify/Customer/123456"
 *                         email:
 *                           type: string
 *                           example: "customer@example.com"
 *                         firstName:
 *                           type: string
 *                           example: "John"
 *                         lastName:
 *                           type: string
 *                           example: "Doe"
 *                     authenticatedAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-01-15T10:45:00.000Z"
 *       400:
 *         description: Missing or invalid token
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
 *                   example: "Login token is required"
 *                 error:
 *                   type: string
 *                   example: "MISSING_TOKEN"
 *       401:
 *         description: Invalid, expired, or already used token
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
 *                   example: "Login link has expired or is invalid"
 *                 error:
 *                   type: string
 *                   enum: [TOKEN_NOT_FOUND, TOKEN_EXPIRED, INVALID_TOKEN, TOKEN_INTEGRITY_FAILED]
 *       403:
 *         description: Token already used
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
 *                   example: "Login link has already been used"
 *                 error:
 *                   type: string
 *                   example: "TOKEN_ALREADY_USED"
 */

/**
 * @swagger
 * /api/auth/login-link/status:
 *   get:
 *     summary: Get login link service status
 *     description: Returns the current status of the login link service and email configuration
 *     tags: [Login Link]
 *     responses:
 *       200:
 *         description: Service status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Login link service status"
 *                 data:
 *                   type: object
 *                   properties:
 *                     emailService:
 *                       type: object
 *                       properties:
 *                         enabled:
 *                           type: boolean
 *                           example: true
 *                         mockSending:
 *                           type: boolean
 *                           example: true
 *                         configured:
 *                           type: boolean
 *                           example: true
 *                         provider:
 *                           type: string
 *                           example: "Mock/Development"
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-01-15T10:30:00.000Z"
 */

// Request login link endpoint
router.post('/request', 
  deviceMiddleware.mintDeviceId,    // Mint device ID for tracking
  generalLimiter,                   // Rate limit requests
  loginLinkController.securityCheck, // Security monitoring
  validate(loginLinkRequestSchema), // Validate email format
  loginLinkController.requestLoginLink
);

// Verify login link endpoint
router.get('/verify',
  deviceMiddleware.mintDeviceId,    // Mint device ID for session
  generalLimiter,                   // Rate limit verification attempts
  loginLinkController.verifyLoginLink
);

// Service status endpoint
router.get('/status',
  generalLimiter,
  loginLinkController.getLoginLinkStatus
);

module.exports = router;
