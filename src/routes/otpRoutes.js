const express = require('express');
const router = express.Router();
const otpController = require('../controllers/otpController');
const { validate, validatePhoneNumber, sendOTPSchema, verifyOTPSchema } = require('../middlewares/validation');
const { otpSendLimiter, otpVerifyLimiter, phoneOtpLimiter, phoneVerifyLimiter } = require('../middlewares/rateLimiter');

/**
 * @swagger
 * tags:
 *   name: OTP
 *   description: OTP (One-Time Password) management endpoints
 */

// Send OTP endpoint
router.post('/send', 
  otpSendLimiter,           // Rate limit OTP sending
  phoneOtpLimiter,          // Additional per-phone rate limiting
  validate(sendOTPSchema),   // Validate request body
  validatePhoneNumber,       // Custom phone validation
  otpController.sendOTP
);

// Verify OTP endpoint
router.post('/verify', 
  otpVerifyLimiter,         // Rate limit verification attempts (by IP/phone)
  phoneVerifyLimiter,       // Additional per-phone verification limiting
  validate(verifyOTPSchema), // Validate request body
  validatePhoneNumber,       // Custom phone validation
  otpController.verifyOTP
);

// Resend OTP endpoint
router.post('/resend', 
  otpSendLimiter,           // Rate limit resend requests
  validate(sendOTPSchema),   // Validate request body
  validatePhoneNumber,       // Custom phone validation
  otpController.resendOTP
);

module.exports = router;