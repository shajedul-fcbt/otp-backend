const axios = require('axios');
const config = require('../config/environment');
const logger = require('../config/logger');

/**
 * SMS Service for SSL Wireless API Integration
 * Handles single SMS sending functionality
 */
class SMSService {
  constructor() {
    this.config = config.sms;
    this.baseURL = this.config.baseURL;
    this.apiToken = this.config.apiToken;
    this.sid = this.config.sid;
    
    // Validate required environment variables
    this.validateConfig();
  }

  /**
   * Validate SMS service configuration
   * @throws {Error} If required environment variables are missing
   */
  validateConfig() {
    const requiredEnvVars = [
      { key: 'SMS_API_BASE_URL', value: this.baseURL },
      { key: 'SMS_API_TOKEN', value: this.apiToken },
      { key: 'SMS_SID', value: this.sid }
    ];

    const missingVars = requiredEnvVars.filter(env => !env.value);
    
    if (missingVars.length > 0) {
      const missingKeys = missingVars.map(env => env.key).join(', ');
      throw new Error(`Missing required SMS environment variables: ${missingKeys}`);
    }
  }

  /**
   * Generate unique CSMS ID for the SMS
   * Format: timestamp + random string (max 20 characters)
   * @returns {string} Unique CSMS ID
   */
  generateCSMSId() {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const csmsId = `${timestamp}${randomStr}`;
    
    // Ensure it doesn't exceed 20 characters
    return csmsId.substring(0, 20);
  }

  /**
   * Validate phone number format for Bangladesh
   * @param {string} msisdn - Mobile number
   * @returns {object} Validation result
   */
  validateMSISDN(msisdn) {
    if (!msisdn) {
      return {
        isValid: false,
        message: 'Phone number is required'
      };
    }

    // Remove any spaces or special characters
    const cleanedNumber = msisdn.replace(/[\s\-\+\(\)]/g, '');
    
    // Check if it's a valid Bangladesh number
    const bangladeshPattern = /^(88)?01[3-9]\d{8}$/;
    
    if (!bangladeshPattern.test(cleanedNumber)) {
      return {
        isValid: false,
        message: 'Invalid Bangladesh phone number format'
      };
    }

    // Normalize to include country code
    let normalizedNumber = cleanedNumber;
    if (!normalizedNumber.startsWith('88')) {
      normalizedNumber = '88' + normalizedNumber;
    }

    return {
      isValid: true,
      normalizedNumber: normalizedNumber,
      message: 'Valid phone number'
    };
  }

  /**
   * Validate SMS content
   * @param {string} sms - SMS message content
   * @returns {object} Validation result
   */
  validateSMSContent(sms) {
    if (!sms || typeof sms !== 'string') {
      return {
        isValid: false,
        message: 'SMS content is required and must be a string'
      };
    }

    if (sms.trim().length === 0) {
      return {
        isValid: false,
        message: 'SMS content cannot be empty'
      };
    }

    if (sms.length > 1000) {
      return {
        isValid: false,
        message: 'SMS content exceeds maximum length of 1000 characters'
      };
    }

    return {
      isValid: true,
      message: 'Valid SMS content',
      length: sms.length
    };
  }

  /**
   * Send single SMS using SSL Wireless API
   * @param {object} smsData - SMS data object
   * @param {string} smsData.msisdn - Recipient phone number
   * @param {string} smsData.sms - SMS message content
   * @param {string} [smsData.csms_id] - Optional custom CSMS ID
   * @returns {Promise<object>} SMS sending result
   */
  async sendSingleSMS(smsData) {
    try {
      const { msisdn, sms, csms_id } = smsData;

      logger.info(`Preparing to send SMS to: ${msisdn}`);

      // Validate phone number
      const phoneValidation = this.validateMSISDN(msisdn);
      if (!phoneValidation.isValid) {
        throw new Error(`Phone validation failed: ${phoneValidation.message}`);
      }

      // Validate SMS content
      const smsValidation = this.validateSMSContent(sms);
      if (!smsValidation.isValid) {
        throw new Error(`SMS content validation failed: ${smsValidation.message}`);
      }

      // Prepare request payload
      const payload = {
        api_token: this.apiToken,
        sid: this.sid,
        msisdn: phoneValidation.normalizedNumber,
        sms: sms.trim(),
        csms_id: csms_id || this.generateCSMSId()
      };

      logger.info(`Sending SMS via SSL Wireless API...`);
      logger.info(`   To: ${payload.msisdn}`);
      logger.info(`   Message: ${payload.sms.substring(0, 50)}${payload.sms.length > 50 ? '...' : ''}`);
      logger.info(`   CSMS ID: ${payload.csms_id}`);

      // Make API request
      const response = await axios.post(`${this.baseURL}`, payload, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: this.config.timeout
      });
      // Check response status
      if (response.status !== 200) {
        throw new Error(`SMS API returned status ${response.status}`);
      }

      const responseData = response.data;

      // Check if the API response indicates success
      if (responseData.status !== 'SUCCESS') {
        throw new Error(`SMS sending failed: ${responseData.error_message || 'Unknown error'}`);
      }

      logger.info(`SMS sent successfully!`);
      logger.info(`   Recipient: ${payload.msisdn}`);
      logger.info(`   Reference ID: ${responseData.smsinfo?.[0]?.reference_id || 'N/A'}`);

      return {
        success: true,
        message: 'SMS sent successfully',
        data: {
          msisdn: payload.msisdn,
          sms: payload.sms,
          csms_id: payload.csms_id,
          reference_id: responseData.smsinfo?.[0]?.reference_id,
          sms_status: responseData.smsinfo?.[0]?.sms_status,
          sms_type: responseData.smsinfo?.[0]?.sms_type,
          status_message: responseData.smsinfo?.[0]?.status_message,
          api_response: responseData
        }
      };

    } catch (error) {
      logger.error('ERROR: SMS sending failed:', error.message);
      
      // Handle different types of errors
      if (error.response) {
        // API responded with error status
        logger.error('   API Response:', error.response.data);
        return {
          success: false,
          message: 'SMS API error',
          error: error.response.data?.error_message || error.message,
          statusCode: error.response.status,
          apiResponse: error.response.data
        };
      } else if (error.request) {
        // Request was made but no response received
        logger.error('   Network error - no response received');
        return {
          success: false,
          message: 'Network error - unable to reach SMS service',
          error: 'No response from SMS API',
          networkError: true
        };
      } else {
        // Something else happened
        return {
          success: false,
          message: 'SMS sending failed',
          error: error.message,
          validationError: error.message.includes('validation')
        };
      }
    }
  }

  /**
   * Send OTP SMS with predefined template
   * @param {string} phoneNumber - Recipient phone number
   * @param {string} otp - OTP code
   * @param {number} [expiryMinutes=5] - OTP expiry time in minutes
   * @returns {Promise<object>} SMS sending result
   */
  async sendOTPSMS(phoneNumber, otp, expiryMinutes = 5) {
    const smsContent = `Your OTP code is: ${otp}. This code will expire in ${expiryMinutes} minutes. Do not share this code with anyone.`;
    
    return this.sendSingleSMS({
      msisdn: phoneNumber,
      sms: smsContent,
      csms_id: `OTP_${this.generateCSMSId()}`
    });
  }

  /**
   * Send verification SMS for customer signup
   * @param {string} phoneNumber - Recipient phone number
   * @param {string} customerName - Customer name
   * @param {string} temporaryPassword - Temporary password
   * @returns {Promise<object>} SMS sending result
   */
  async sendCustomerWelcomeSMS(phoneNumber, customerName, temporaryPassword) {
    const smsContent = `Welcome ${customerName}! Your account has been created. Temporary password: ${temporaryPassword}. Please change your password after first login.`;
    
    return this.sendSingleSMS({
      msisdn: phoneNumber,
      sms: smsContent,
      csms_id: `WELCOME_${this.generateCSMSId()}`
    });
  }

  /**
   * Get service status and configuration
   * @returns {object} Service status
   */
  getServiceStatus() {
    return {
      isConfigured: !!(this.baseURL && this.apiToken && this.sid),
      baseURL: this.baseURL ? this.baseURL.replace(/\/+$/, '') : 'Not configured',
      sid: this.sid || 'Not configured',
      hasApiToken: !!this.apiToken
    };
  }
}

module.exports = new SMSService();
