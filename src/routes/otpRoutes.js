const express = require('express');
const router = express.Router();
const otpController = require('../controllers/otpController');
const { validate, validatePhoneNumber, sendOTPSchema, verifyOTPSchema } = require('../middlewares/validation');
const { otpSendLimiter, otpVerifyLimiter, phoneOtpLimiter } = require('../middlewares/rateLimiter');

/**
 * @swagger
 * tags:
 *   name: OTP
 *   description: OTP (One-Time Password) management endpoints
 */

/**
 * @swagger
 * /api/otp/send:
 *   post:
 *     summary: Send OTP to a Bangladeshi phone number
 *     description: |
 *       Sends a 6-digit OTP to the specified Bangladeshi phone number. 
 *       Also checks if the customer exists in Shopify and includes this information in the response.
 *       The OTP expires in 10 minutes and uses HMAC for secure generation.
 *     tags: [OTP]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SendOTPRequest'
 *           examples:
 *             example1:
 *               summary: Valid phone number
 *               value:
 *                 phoneNumber: "+8801712345678"
 *             example2:
 *               summary: National format
 *               value:
 *                 phoneNumber: "01712345678"
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SendOTPResponse'
 *             examples:
 *               existing_customer:
 *                 summary: Existing customer
 *                 value:
 *                   success: true
 *                   message: "OTP sent successfully"
 *                   data:
 *                     phoneNumber: "+8801712345678"
 *                     customerExists: true
 *                     needsSignup: false
 *                     expiresIn: 600
 *               new_customer:
 *                 summary: New customer (needs signup)
 *                 value:
 *                   success: true
 *                   message: "OTP sent successfully"
 *                   data:
 *                     phoneNumber: "+8801712345678"
 *                     customerExists: false
 *                     needsSignup: true
 *                     expiresIn: 600
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       429:
 *         description: Too many requests - rate limit exceeded
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
 *                   example: "Too many OTP requests. Please wait 5 minutes before requesting another OTP."
 *                 retryAfter:
 *                   type: number
 *                   example: 300
 *       503:
 *         description: Service unavailable - Redis connection error
 */
router.post('/send', 
  otpSendLimiter,           // Rate limit OTP sending
  phoneOtpLimiter,          // Additional per-phone rate limiting
  validate(sendOTPSchema),   // Validate request body
  validatePhoneNumber,       // Custom phone validation
  otpController.sendOTP
);

/**
 * @swagger
 * /api/otp/verify:
 *   post:
 *     summary: Verify OTP for a phone number
 *     description: |
 *       Verifies the 6-digit OTP for the specified phone number.
 *       Once verified successfully, the OTP is removed from memory to prevent reuse.
 *       Failed verification attempts are rate limited to prevent brute force attacks.
 *     tags: [OTP]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VerifyOTPRequest'
 *           examples:
 *             example1:
 *               summary: Valid verification request
 *               value:
 *                 phoneNumber: "+8801712345678"
 *                 otp: "123456"
 *     responses:
 *       200:
 *         description: OTP verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VerifyOTPResponse'
 *             examples:
 *               success:
 *                 summary: Successful verification
 *                 value:
 *                   success: true
 *                   message: "OTP verified successfully"
 *                   data:
 *                     phoneNumber: "+8801712345678"
 *                     verified: true
 *                     expired: false
 *       400:
 *         description: Invalid OTP or validation error
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
 *                   example: "Invalid OTP code"
 *                 data:
 *                   type: object
 *                   properties:
 *                     phoneNumber:
 *                       type: string
 *                       example: "+8801712345678"
 *                     verified:
 *                       type: boolean
 *                       example: false
 *                     expired:
 *                       type: boolean
 *                       example: false
 *             examples:
 *               invalid_otp:
 *                 summary: Invalid OTP
 *                 value:
 *                   success: false
 *                   message: "Invalid OTP code"
 *                   data:
 *                     phoneNumber: "+8801712345678"
 *                     verified: false
 *                     expired: false
 *               expired_otp:
 *                 summary: Expired OTP
 *                 value:
 *                   success: false
 *                   message: "OTP has expired"
 *                   data:
 *                     phoneNumber: "+8801712345678"
 *                     verified: false
 *                     expired: true
 *       429:
 *         description: Too many verification attempts
 *       503:
 *         description: Service unavailable - Redis connection error
 */
router.post('/verify', 
  otpVerifyLimiter,         // Rate limit verification attempts
  validate(verifyOTPSchema), // Validate request body
  validatePhoneNumber,       // Custom phone validation
  otpController.verifyOTP
);


/**
 * @swagger
 * /api/otp/resend:
 *   post:
 *     summary: Resend OTP to a phone number
 *     description: |
 *       Resends OTP to the specified phone number with additional rate limiting.
 *       Only allows resend if the previous OTP has less than 30 seconds remaining
 *       or if more than 2 minutes have passed since the last OTP was generated.
 *     tags: [OTP]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SendOTPRequest'
 *     responses:
 *       200:
 *         description: OTP resent successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SendOTPResponse'
 *       429:
 *         description: Too early to resend OTP
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
 *                   example: "Please wait before requesting another OTP"
 *                 data:
 *                   type: object
 *                   properties:
 *                     phoneNumber:
 *                       type: string
 *                       example: "+8801712345678"
 *                     remainingTimeSeconds:
 *                       type: number
 *                       example: 120
 *                     retryAfter:
 *                       type: number
 *                       example: 60
 */
router.post('/resend', 
  otpSendLimiter,           // Rate limit resend requests
  validate(sendOTPSchema),   // Validate request body
  validatePhoneNumber,       // Custom phone validation
  otpController.resendOTP
);

module.exports = router;
