/**
 * OTP Service - Handles all OTP-related business logic
 */

const otpGenerator = require('../utils/otpGenerator');
const shopifyService = require('./shopifyService');
const smsService = require('./smsService');
const redisClient = require('../config/database');
const logger = require('../config/logger');
const { 
  OTP_CONFIG, 
  ERROR_MESSAGES, 
  SUCCESS_MESSAGES, 
  REDIS_KEYS, 
  SMS_CONFIG, 
  LOG_MESSAGES,
  VALIDATION,
  SECURITY
} = require('../constants/otpConstants');

class OTPService {
  /**
   * Sends OTP to a phone number
   * @param {string} phoneNumber - The phone number to send OTP to
   * @returns {Promise<object>} Result of OTP sending operation
   */
  async sendOTP(phoneNumber) {
    try {
      logger.info(`${LOG_MESSAGES.OTP_REQUEST}: ${phoneNumber}`);

      // Validate phone number
      const phoneValidation = this.validatePhoneNumber(phoneNumber);
      if (!phoneValidation.isValid) {
        throw new Error(phoneValidation.message);
      }

      const normalizedPhone = phoneValidation.normalizedNumber;

      // Check if customer exists in Shopify
      logger.info(LOG_MESSAGES.CHECKING_CUSTOMER);
      const customerCheck = await this.checkCustomerExists(normalizedPhone);
      
      // Generate OTP
      logger.info(LOG_MESSAGES.GENERATING_OTP);
      const otpData = otpGenerator.generateOTP(normalizedPhone);
      
      // Store OTP in Redis with expiry
      await this.storeOTPInRedis(normalizedPhone, otpData);
      
      // Send SMS
      await this.sendOTPSMS(normalizedPhone, otpData);
      
      // Prepare response data
      const responseData = this.prepareOTPResponse(normalizedPhone, customerCheck, otpData);
      
      return {
        success: true,
        message: SUCCESS_MESSAGES.OTP_SENT,
        data: responseData
      };

    } catch (error) {
      logger.error(`${LOG_MESSAGES.ERROR_OCCURRED} in sendOTP:`, error);
      throw this.handleOTPError(error);
    }
  }

  /**
   * Verifies OTP for a phone number
   * @param {string} phoneNumber - The phone number
   * @param {string} otp - The OTP code to verify
   * @returns {Promise<object>} Result of OTP verification
   */
  async verifyOTP(phoneNumber, otp) {
    try {
      logger.info(`${LOG_MESSAGES.OTP_VERIFICATION}: ${phoneNumber}`);

      // Validate inputs
      const phoneValidation = this.validatePhoneNumber(phoneNumber);
      if (!phoneValidation.isValid) {
        throw new Error(phoneValidation.message);
      }

      const otpValidation = this.validateOTP(otp);
      if (!otpValidation.isValid) {
        throw new Error(otpValidation.message);
      }

      const normalizedPhone = phoneValidation.normalizedNumber;

      // Get stored OTP from Redis
      logger.info(LOG_MESSAGES.RETRIEVING_OTP);
      const storedOTPData = await this.getOTPFromRedis(normalizedPhone);
      
      if (!storedOTPData) {
        return {
          success: false,
          message: ERROR_MESSAGES.OTP_NOT_FOUND,
          data: {
            phoneNumber: normalizedPhone,
            verified: false,
            expired: true
          }
        };
      }

      // Verify the OTP
      const verificationResult = otpGenerator.verifyOTP(normalizedPhone, otp, storedOTPData);
      
      if (!verificationResult.isValid) {
        return {
          success: false,
          message: verificationResult.message,
          data: {
            phoneNumber: normalizedPhone,
            verified: false,
            expired: verificationResult.expired
          }
        };
      }

      // OTP is valid - remove it from Redis
      logger.info(`${LOG_MESSAGES.OTP_VERIFIED}: ${normalizedPhone}`);
      await this.removeOTPFromRedis(normalizedPhone);
      
      // Get customer data if exists
      const customerData = await this.getCustomerData(normalizedPhone);
      
      // Prepare response data
      const responseData = this.prepareVerificationResponse(normalizedPhone, customerData);
      
      return {
        success: true,
        message: SUCCESS_MESSAGES.OTP_VERIFIED,
        data: responseData
      };

    } catch (error) {
      logger.error(`${LOG_MESSAGES.ERROR_OCCURRED} in verifyOTP:`, error);
      throw this.handleOTPError(error);
    }
  }

  /**
   * Resends OTP to a phone number with additional rate limiting
   * @param {string} phoneNumber - The phone number to resend OTP to
   * @returns {Promise<object>} Result of OTP resend operation
   */
  async resendOTP(phoneNumber) {
    try {
      logger.info(`${LOG_MESSAGES.OTP_RESEND_REQUEST}: ${phoneNumber}`);

      // Validate phone number
      const phoneValidation = this.validatePhoneNumber(phoneNumber);
      if (!phoneValidation.isValid) {
        throw new Error(phoneValidation.message);
      }

      const normalizedPhone = phoneValidation.normalizedNumber;

      // Check if there's an existing OTP and rate limiting
      logger.info(LOG_MESSAGES.CHECKING_EXISTING_OTP);
      const canResend = await this.checkResendEligibility(normalizedPhone);
      
      if (!canResend.allowed) {
        return {
          success: false,
          message: ERROR_MESSAGES.OTP_TOO_EARLY_RESEND,
          data: {
            phoneNumber: normalizedPhone,
            remainingTimeSeconds: canResend.remainingTimeSeconds,
            retryAfter: canResend.retryAfter
          }
        };
      }

      // Send new OTP
      return await this.sendOTP(normalizedPhone);

    } catch (error) {
      logger.error(`${LOG_MESSAGES.ERROR_OCCURRED} in resendOTP:`, error);
      throw this.handleOTPError(error);
    }
  }

  /**
   * Validates phone number format
   * @param {string} phoneNumber - Phone number to validate
   * @returns {object} Validation result
   */
  validatePhoneNumber(phoneNumber) {
    if (!phoneNumber) {
      return {
        isValid: false,
        message: ERROR_MESSAGES.PHONE_NUMBER_REQUIRED
      };
    }

    if (!VALIDATION.PHONE_PATTERN.test(phoneNumber)) {
      return {
        isValid: false,
        message: ERROR_MESSAGES.INVALID_PHONE_FORMAT
      };
    }

    // Normalize phone number
    let normalizedNumber = phoneNumber;
    if (phoneNumber.startsWith('01')) {
      normalizedNumber = '+88' + phoneNumber;
    } else if (phoneNumber.startsWith('880')) {
      normalizedNumber = '+' + phoneNumber;
    }

    return {
      isValid: true,
      normalizedNumber,
      originalNumber: phoneNumber
    };
  }

  /**
   * Validates OTP format
   * @param {string} otp - OTP to validate
   * @returns {object} Validation result
   */
  validateOTP(otp) {
    if (!otp) {
      return {
        isValid: false,
        message: 'OTP is required'
      };
    }

    if (!VALIDATION.OTP_PATTERN.test(otp)) {
      return {
        isValid: false,
        message: 'OTP must be exactly 6 digits'
      };
    }

    return {
      isValid: true,
      message: 'Valid OTP'
    };
  }

  /**
   * Checks if customer exists in Shopify
   * @param {string} phoneNumber - Phone number to check
   * @returns {Promise<object>} Customer existence result
   */
  async checkCustomerExists(phoneNumber) {
    try {
      const result = await shopifyService.checkCustomerExists(phoneNumber);
      return {
        exists: result.exists,
        customer: result.customer,
        error: result.error
      };
    } catch (error) {
      logger.error('Error checking customer existence:', error);
      return {
        exists: false,
        customer: null,
        error: 'Error checking customer existence'
      };
    }
  }

  /**
   * Stores OTP data in Redis
   * @param {string} phoneNumber - Phone number
   * @param {object} otpData - OTP data to store
   */
  async storeOTPInRedis(phoneNumber, otpData) {
    logger.info(LOG_MESSAGES.STORING_REDIS);
    const redisKey = otpGenerator.generateRedisKey(phoneNumber);
    const expirySeconds = otpData.expiryMinutes * 60;
    await redisClient.set(redisKey, otpData, expirySeconds);
  }

  /**
   * Retrieves OTP data from Redis
   * @param {string} phoneNumber - Phone number
   * @returns {Promise<object|null>} Stored OTP data or null
   */
  async getOTPFromRedis(phoneNumber) {
    const redisKey = otpGenerator.generateRedisKey(phoneNumber);
    return await redisClient.get(redisKey);
  }

  /**
   * Removes OTP data from Redis
   * @param {string} phoneNumber - Phone number
   */
  async removeOTPFromRedis(phoneNumber) {
    const redisKey = otpGenerator.generateRedisKey(phoneNumber);
    await redisClient.delete(redisKey);
  }

  /**
   * Sends OTP via SMS
   * @param {string} phoneNumber - Phone number
   * @param {object} otpData - OTP data
   */
  async sendOTPSMS(phoneNumber, otpData) {
    logger.info(LOG_MESSAGES.SENDING_SMS);
    const smsContent = SMS_CONFIG.OTP_TEMPLATE
      .replace('{otp}', otpData.otp)
      .replace('{expiryMinutes}', otpData.expiryMinutes);

    const result = await smsService.sendSingleSMS({
      msisdn: phoneNumber,
      sms: smsContent,
      csms_id: `${SMS_CONFIG.CSMS_ID_PREFIX}${smsService.generateCSMSId()}`
    });

    if (!result.success) {
      throw new Error(`SMS sending failed: ${result.message}`);
    }
  }

  /**
   * Gets customer data from Redis
   * @param {string} phoneNumber - Phone number
   * @returns {Promise<object|null>} Customer data or null
   */
  async getCustomerData(phoneNumber) {
    const customerDataKey = otpGenerator.generateCustomerDataKey(phoneNumber);
    return await redisClient.get(customerDataKey);
  }

  /**
   * Checks if OTP can be resent based on rate limiting
   * @param {string} phoneNumber - Phone number
   * @returns {Promise<object>} Resend eligibility result
   */
  async checkResendEligibility(phoneNumber) {
    const existingOTP = await this.getOTPFromRedis(phoneNumber);
    
    if (existingOTP) {
      const remainingTime = otpGenerator.getRemainingTime(existingOTP.expiryTime);
      const timeSinceGeneration = Date.now() - existingOTP.timestamp;
      const twoMinutes = OTP_CONFIG.RESEND_WAIT_MINUTES * 60 * 1000;
      
      if (!remainingTime.expired && timeSinceGeneration < twoMinutes) {
        return {
          allowed: false,
          remainingTimeSeconds: remainingTime.remainingSeconds,
          retryAfter: Math.max(0, twoMinutes - timeSinceGeneration) / 1000
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Prepares OTP response data
   * @param {string} phoneNumber - Phone number
   * @param {object} customerCheck - Customer existence check result
   * @param {object} otpData - OTP data
   * @returns {object} Response data
   */
  prepareOTPResponse(phoneNumber, customerCheck, otpData) {
    return {
      phoneNumber: phoneNumber,
      customerExists: customerCheck.exists,
      needsSignup: !customerCheck.exists,
      expiresIn: otpData.expiryMinutes * 60,
      message: customerCheck.exists 
        ? 'OTP sent successfully. Customer found.' 
        : 'OTP sent successfully. Customer needs to sign up.',
      ...(customerCheck.error && { shopifyError: customerCheck.error })
    };
  }

  /**
   * Prepares verification response data
   * @param {string} phoneNumber - Phone number
   * @param {object} customerData - Customer data from Redis
   * @returns {object} Response data
   */
  prepareVerificationResponse(phoneNumber, customerData) {
    const responseData = {
      phoneNumber: phoneNumber,
      verified: true,
      expired: false
    };
    
    if (customerData) {
      logger.info('Customer data found, including credentials in response');
      responseData.customer = {
        email: customerData.email,
        password: customerData.plainPassword,
        name: customerData.name,
        customerId: customerData.customerId
      };
    }
    
    return responseData;
  }

  /**
   * Handles OTP-related errors
   * @param {Error} error - The error object
   * @returns {Error} Formatted error
   */
  handleOTPError(error) {
    if (error.message.includes('Redis')) {
      return new Error(ERROR_MESSAGES.REDIS_CONNECTION_ERROR);
    }
    
    if (error.message.includes('SMS')) {
      return new Error(ERROR_MESSAGES.SMS_SERVICE_ERROR);
    }
    
    if (error.message.includes('Shopify')) {
      return new Error(ERROR_MESSAGES.EXTERNAL_SERVICE_ERROR);
    }
    
    return new Error(error.message || ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
  }
}

module.exports = new OTPService();
