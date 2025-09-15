const otpService = require('../services/otpService');
const InputSanitizer = require('../utils/inputSanitizer');
const { HTTP_STATUS, ERROR_MESSAGES } = require('../constants/otpConstants');

class OTPController {
  /**
   * Send OTP to a phone number
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  async sendOTP(req, res) {
    try {
      // Sanitize and validate input
      const validation = InputSanitizer.validateRequestBody(req.body, 'send');
      if (!validation.isValid) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Validation error',
          errors: validation.errors
        });
      }

      // Sanitize request body
      const sanitizedBody = InputSanitizer.sanitizeRequestBody(req.body);
      const { phoneNumber } = sanitizedBody;
      
      const result = await otpService.sendOTP(phoneNumber);
      
      // Log OTP for development (remove in production)
      if (config.server.isDevelopment && result.data) {
        console.log(`🔑 Generated OTP for ${phoneNumber}: [HIDDEN]`);
      }
      
      res.status(HTTP_STATUS.OK).json(result);

    } catch (error) {
      console.error('❌ Error in sendOTP:', error);
      
      const safeMessage = InputSanitizer.createSafeErrorMessage(error, config.server.isDevelopment);
      
      // Handle specific error types
      if (error.message.includes('Redis') || error.message.includes('Database')) {
        return res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
          success: false,
          message: ERROR_MESSAGES.REDIS_CONNECTION_ERROR,
          error: 'Database connection error'
        });
      }
      
      if (error.message.includes('SMS')) {
        return res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
          success: false,
          message: ERROR_MESSAGES.SMS_SERVICE_ERROR,
          error: 'SMS service error'
        });
      }
      
      if (error.message.includes('validation') || error.message.includes('Invalid')) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: safeMessage,
          error: 'Validation error'
        });
      }
      
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
        error: safeMessage
      });
    }
  }

  /**
   * Verify OTP for a phone number
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  async verifyOTP(req, res) {
    try {
      // Sanitize and validate input
      const validation = InputSanitizer.validateRequestBody(req.body, 'verify');
      if (!validation.isValid) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Validation error',
          errors: validation.errors
        });
      }

      // Sanitize request body
      const sanitizedBody = InputSanitizer.sanitizeRequestBody(req.body);
      const { phoneNumber, otp } = sanitizedBody;
      
      const result = await otpService.verifyOTP(phoneNumber, otp);
      
      if (result.success) {
        res.status(HTTP_STATUS.OK).json(result);
      } else {
        res.status(HTTP_STATUS.BAD_REQUEST).json(result);
      }

    } catch (error) {
      console.error('❌ Error in verifyOTP:', error);
      
      const safeMessage = InputSanitizer.createSafeErrorMessage(error, config.server.isDevelopment);
      
      // Handle specific error types
      if (error.message.includes('Redis') || error.message.includes('Database')) {
        return res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
          success: false,
          message: ERROR_MESSAGES.REDIS_CONNECTION_ERROR,
          error: 'Database connection error'
        });
      }
      
      if (error.message.includes('validation') || error.message.includes('Invalid')) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: safeMessage,
          error: 'Validation error'
        });
      }
      
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
        error: safeMessage
      });
    }
  }

  /**
   * Resend OTP (with additional rate limiting)
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  async resendOTP(req, res) {
    try {
      // Sanitize and validate input
      const validation = InputSanitizer.validateRequestBody(req.body, 'resend');
      if (!validation.isValid) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Validation error',
          errors: validation.errors
        });
      }

      // Sanitize request body
      const sanitizedBody = InputSanitizer.sanitizeRequestBody(req.body);
      const { phoneNumber } = sanitizedBody;
      
      const result = await otpService.resendOTP(phoneNumber);
      
      if (result.success) {
        res.status(HTTP_STATUS.OK).json(result);
      } else {
        res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json(result);
      }

    } catch (error) {
      console.error('❌ Error in resendOTP:', error);
      
      const safeMessage = InputSanitizer.createSafeErrorMessage(error, config.server.isDevelopment);
      
      // Handle specific error types
      if (error.message.includes('Redis') || error.message.includes('Database')) {
        return res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
          success: false,
          message: ERROR_MESSAGES.REDIS_CONNECTION_ERROR,
          error: 'Database connection error'
        });
      }
      
      if (error.message.includes('SMS')) {
        return res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
          success: false,
          message: ERROR_MESSAGES.SMS_SERVICE_ERROR,
          error: 'SMS service error'
        });
      }
      
      if (error.message.includes('validation') || error.message.includes('Invalid')) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: safeMessage,
          error: 'Validation error'
        });
      }
      
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
        error: safeMessage
      });
    }
  }
}

module.exports = new OTPController();
