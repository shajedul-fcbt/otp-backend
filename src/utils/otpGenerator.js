const crypto = require('crypto');
require('dotenv').config();

class OTPGenerator {
  constructor() {
    this.secretKey = process.env.OTP_SECRET_KEY || 'default_secret_key_please_change_in_production';
    this.expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES) || 10;
  }

  /**
   * Generates a 6-digit OTP using HMAC algorithm
   * @param {string} phoneNumber - The phone number for which OTP is generated
   * @param {number} timestamp - Optional timestamp, defaults to current time
   * @returns {object} - OTP data with code, hash, and expiry
   */
  generateOTP(phoneNumber, timestamp = null) {
    try {
      // Use provided timestamp or current time
      const currentTime = timestamp || Date.now();
      
      // Create a time window (5 minutes) to make HMAC more dynamic
      const timeWindow = Math.floor(currentTime / (5 * 60 * 1000));
      
      // Create data string for HMAC
      const dataString = `${phoneNumber}:${timeWindow}:${this.secretKey}`;
      
      // Generate HMAC
      const hmac = crypto.createHmac('sha256', this.secretKey);
      hmac.update(dataString);
      const hmacResult = hmac.digest('hex');
      
      // Extract 6 digits from HMAC
      const offset = parseInt(hmacResult.substr(-1), 16) % 10;
      const otpNum = parseInt(hmacResult.substr(offset, 6), 16) % 1000000;
      const otp = otpNum.toString().padStart(6, '0');
      
      // Calculate expiry time
      const expiryTime = currentTime + (this.expiryMinutes * 60 * 1000);
      
      // Create verification hash
      const verificationData = `${phoneNumber}:${otp}:${currentTime}:${expiryTime}`;
      const verificationHmac = crypto.createHmac('sha256', this.secretKey);
      verificationHmac.update(verificationData);
      const verificationHash = verificationHmac.digest('hex');
      
      return {
        otp: otp,
        phoneNumber: phoneNumber,
        timestamp: currentTime,
        expiryTime: expiryTime,
        expiryMinutes: this.expiryMinutes,
        verificationHash: verificationHash,
        isValid: true
      };
    } catch (error) {
      console.error('Error generating OTP:', error);
      throw new Error('Failed to generate OTP');
    }
  }

  /**
   * Verifies if the provided OTP is valid for the given phone number
   * @param {string} phoneNumber - The phone number
   * @param {string} inputOTP - The OTP provided by user
   * @param {object} storedOTPData - The stored OTP data from Redis
   * @returns {object} - Verification result
   */
  verifyOTP(phoneNumber, inputOTP, storedOTPData) {
    try {
      if (!storedOTPData) {
        return {
          isValid: false,
          message: 'OTP not found or expired',
          expired: true
        };
      }

      // Check if OTP has expired
      const currentTime = Date.now();
      if (currentTime > storedOTPData.expiryTime) {
        return {
          isValid: false,
          message: 'OTP has expired',
          expired: true
        };
      }

      // Verify phone number matches
      if (storedOTPData.phoneNumber !== phoneNumber) {
        return {
          isValid: false,
          message: 'Phone number mismatch',
          expired: false
        };
      }

      // Verify the OTP code
      if (storedOTPData.otp !== inputOTP) {
        return {
          isValid: false,
          message: 'Invalid OTP code',
          expired: false
        };
      }

      // Verify the HMAC hash to ensure data integrity
      const verificationData = `${storedOTPData.phoneNumber}:${storedOTPData.otp}:${storedOTPData.timestamp}:${storedOTPData.expiryTime}`;
      const verificationHmac = crypto.createHmac('sha256', this.secretKey);
      verificationHmac.update(verificationData);
      const calculatedHash = verificationHmac.digest('hex');

      if (calculatedHash !== storedOTPData.verificationHash) {
        return {
          isValid: false,
          message: 'OTP data integrity check failed',
          expired: false
        };
      }

      return {
        isValid: true,
        message: 'OTP verified successfully',
        expired: false,
        phoneNumber: phoneNumber
      };
    } catch (error) {
      console.error('Error verifying OTP:', error);
      return {
        isValid: false,
        message: 'Error occurred during OTP verification',
        expired: false
      };
    }
  }

  /**
   * Generates a Redis key for storing OTP
   * @param {string} phoneNumber - The phone number
   * @returns {string} - Redis key
   */
  generateRedisKey(phoneNumber) {
    return `otp:${phoneNumber}`;
  }

  /**
   * Generates a random password for new customers
   * @param {number} length - Password length (default: 12)
   * @returns {string} - Random password
   */
  generateRandomPassword(length = 12) {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    
    for (let i = 0; i < length; i++) {
      const randomIndex = crypto.randomInt(0, charset.length);
      password += charset[randomIndex];
    }
    
    return password;
  }

  /**
   * Creates a hash for password storage
   * @param {string} password - Plain text password
   * @returns {string} - Hashed password
   */
  hashPassword(password) {
    const bcrypt = require('bcrypt');
    const saltRounds = 12;
    return bcrypt.hashSync(password, saltRounds);
  }

  /**
   * Generates a customer data Redis key
   * @param {string} identifier - Email or phone number
   * @returns {string} - Redis key for customer data
   */
  generateCustomerDataKey(identifier) {
    return `customer:${identifier}`;
  }

  /**
   * Calculates remaining time for OTP expiry
   * @param {number} expiryTime - Expiry timestamp
   * @returns {object} - Remaining time information
   */
  getRemainingTime(expiryTime) {
    const currentTime = Date.now();
    const remainingMs = expiryTime - currentTime;
    
    if (remainingMs <= 0) {
      return {
        expired: true,
        remainingSeconds: 0,
        remainingMinutes: 0
      };
    }
    
    const remainingSeconds = Math.floor(remainingMs / 1000);
    const remainingMinutes = Math.floor(remainingSeconds / 60);
    
    return {
      expired: false,
      remainingSeconds: remainingSeconds,
      remainingMinutes: remainingMinutes,
      remainingMs: remainingMs
    };
  }
}

module.exports = new OTPGenerator();
