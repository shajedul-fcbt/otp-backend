const phoneValidator = require('../utils/phoneValidator');
const otpGenerator = require('../utils/otpGenerator');
const shopifyService = require('../services/shopifyService');
const redisClient = require('../config/database');

class OTPController {
  /**
   * Send OTP to a phone number
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  async sendOTP(req, res) {
    try {
      const { phoneNumber } = req.body;
      
      console.log(`📱 OTP request for phone: ${phoneNumber}`);

      // Check if customer exists in Shopify
      console.log('🔍 Checking customer existence in Shopify...');
      const customerCheck = await shopifyService.checkCustomerExists(phoneNumber);
      
      // Generate OTP regardless of customer existence
      console.log('🔐 Generating OTP...');
      const otpData = otpGenerator.generateOTP(phoneNumber);
      
      // Store OTP in Redis with expiry
      const redisKey = otpGenerator.generateRedisKey(phoneNumber);
      const expirySeconds = otpData.expiryMinutes * 60;
      
      console.log('💾 Storing OTP in Redis...');
      await redisClient.set(redisKey, otpData, expirySeconds);
      
      // Log the generated OTP for development (remove in production)
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔑 Generated OTP for ${phoneNumber}: ${otpData.otp}`);
      }
      
      // Prepare response based on customer existence
      const responseData = {
        phoneNumber: phoneNumber,
        customerExists: customerCheck.exists,
        needsSignup: !customerCheck.exists,
        expiresIn: expirySeconds,
        message: customerCheck.exists 
          ? 'OTP sent successfully. Customer found.' 
          : 'OTP sent successfully. Customer needs to sign up.',
        ...(customerCheck.error && { shopifyError: customerCheck.error })
      };

      // In a real application, you would send the OTP via SMS here
      // For now, we'll just simulate the sending
      console.log(`📨 Simulating OTP send to ${phoneNumber}`);
      
      res.status(200).json({
        success: true,
        message: 'OTP sent successfully',
        data: responseData
      });

    } catch (error) {
      console.error('❌ Error in sendOTP:', error);
      
      // Handle specific Redis errors
      if (error.message.includes('Redis')) {
        return res.status(503).json({
          success: false,
          message: 'Service temporarily unavailable. Please try again later.',
          error: 'Database connection error'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Internal server error occurred while sending OTP',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
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
      const { phoneNumber, otp } = req.body;
      
      console.log(`🔍 OTP verification request for phone: ${phoneNumber}`);

      // Get stored OTP from Redis
      const redisKey = otpGenerator.generateRedisKey(phoneNumber);
      const storedOTPData = await redisClient.get(redisKey);
      
      if (!storedOTPData) {
        console.log(`❌ No OTP found for phone: ${phoneNumber}`);
        return res.status(400).json({
          success: false,
          message: 'OTP not found or has expired. Please request a new OTP.',
          data: {
            phoneNumber: phoneNumber,
            verified: false,
            expired: true
          }
        });
      }

      // Verify the OTP
      const verificationResult = otpGenerator.verifyOTP(phoneNumber, otp, storedOTPData);
      
      if (!verificationResult.isValid) {
        console.log(`❌ OTP verification failed for phone: ${phoneNumber} - ${verificationResult.message}`);
        
        // Don't delete OTP on failed verification to prevent brute force
        // Let it expire naturally
        
        return res.status(400).json({
          success: false,
          message: verificationResult.message,
          data: {
            phoneNumber: phoneNumber,
            verified: false,
            expired: verificationResult.expired
          }
        });
      }

      // OTP is valid - remove it from Redis to prevent reuse
      console.log(`✅ OTP verified successfully for phone: ${phoneNumber}`);
      await redisClient.delete(redisKey);
      
      res.status(200).json({
        success: true,
        message: 'OTP verified successfully',
        data: {
          phoneNumber: phoneNumber,
          verified: true,
          expired: false
        }
      });

    } catch (error) {
      console.error('❌ Error in verifyOTP:', error);
      
      // Handle specific Redis errors
      if (error.message.includes('Redis')) {
        return res.status(503).json({
          success: false,
          message: 'Service temporarily unavailable. Please try again later.',
          error: 'Database connection error'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Internal server error occurred while verifying OTP',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Check OTP status (optional endpoint for checking remaining time)
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  async checkOTPStatus(req, res) {
    try {
      const { phoneNumber } = req.query;
      
      if (!phoneNumber) {
        return res.status(400).json({
          success: false,
          message: 'Phone number is required',
          errors: [{
            field: 'phoneNumber',
            message: 'Phone number parameter is required'
          }]
        });
      }

      // Validate phone number format
      const validation = phoneValidator.validate(phoneNumber);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: validation.message,
          errors: [{
            field: 'phoneNumber',
            message: validation.message
          }]
        });
      }

      const normalizedPhoneNumber = validation.normalizedNumber;
      const redisKey = otpGenerator.generateRedisKey(normalizedPhoneNumber);
      const storedOTPData = await redisClient.get(redisKey);
      
      if (!storedOTPData) {
        return res.status(404).json({
          success: false,
          message: 'No active OTP found for this phone number',
          data: {
            phoneNumber: normalizedPhoneNumber,
            hasActiveOTP: false
          }
        });
      }

      const remainingTime = otpGenerator.getRemainingTime(storedOTPData.expiryTime);
      
      res.status(200).json({
        success: true,
        message: 'OTP status retrieved successfully',
        data: {
          phoneNumber: normalizedPhoneNumber,
          hasActiveOTP: !remainingTime.expired,
          remainingTimeSeconds: remainingTime.remainingSeconds,
          expiresAt: new Date(storedOTPData.expiryTime).toISOString()
        }
      });

    } catch (error) {
      console.error('❌ Error in checkOTPStatus:', error);
      
      res.status(500).json({
        success: false,
        message: 'Internal server error occurred while checking OTP status',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
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
      const { phoneNumber } = req.body;
      
      console.log(`🔄 OTP resend request for phone: ${phoneNumber}`);

      // Check if there's an existing OTP
      const redisKey = otpGenerator.generateRedisKey(phoneNumber);
      const existingOTP = await redisClient.get(redisKey);
      
      if (existingOTP) {
        const remainingTime = otpGenerator.getRemainingTime(existingOTP.expiryTime);
        
        // Only allow resend if less than 30 seconds remaining or if more than 2 minutes have passed
        const timeSinceGeneration = Date.now() - existingOTP.timestamp;
        const twoMinutes = 2 * 60 * 1000;
        
        if (!remainingTime.expired && timeSinceGeneration < twoMinutes) {
          return res.status(429).json({
            success: false,
            message: 'Please wait before requesting another OTP',
            data: {
              phoneNumber: phoneNumber,
              remainingTimeSeconds: remainingTime.remainingSeconds,
              retryAfter: Math.max(0, twoMinutes - timeSinceGeneration) / 1000
            }
          });
        }
      }

      // Call the regular sendOTP method
      await this.sendOTP(req, res);

    } catch (error) {
      console.error('❌ Error in resendOTP:', error);
      
      res.status(500).json({
        success: false,
        message: 'Internal server error occurred while resending OTP',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = new OTPController();
