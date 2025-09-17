const crypto = require('crypto');
const logger = require('../config/logger');
const config = require('../config/environment');

// Cache bcrypt require to avoid repeated loading
let bcrypt = null;
const getBcrypt = () => {
  if (!bcrypt) {
    bcrypt = require('bcrypt');
  }
  return bcrypt;
};

// Constants for better maintainability
const DEFAULTS = {
  PASSWORD_LENGTH: 12,
  SALT_ROUNDS: 12,
  TIME_WINDOW_MS: 5 * 60 * 1000, // 5 minutes
  MAX_PHONE_LENGTH: 20,
  MAX_PASSWORD_LENGTH: 128
};

class OTPGenerator {
  constructor() {
    this.config = config.otp;
    this.secretKey = this.config.secretKey;
    this.expiryMinutes = this.config.expiryMinutes;
    
    // Validate configuration
    if (!this.secretKey || typeof this.secretKey !== 'string') {
      throw new Error('OTP secret key is required and must be a string');
    }
    
    if (!Number.isInteger(this.expiryMinutes) || this.expiryMinutes <= 0) {
      throw new Error('OTP expiry minutes must be a positive integer');
    }
  }

  /**
   * Generates a 6-digit OTP using HMAC algorithm
   * @param {string} phoneNumber - The phone number for which OTP is generated
   * @param {number} timestamp - Optional timestamp, defaults to current time
   * @returns {object} - OTP data with code, hash, and expiry
   */
  generateOTP(phoneNumber, timestamp = null) {
    try {
      // Input validation
      if (!phoneNumber || typeof phoneNumber !== 'string') {
        throw new Error('Phone number is required and must be a string');
      }
      
      if (phoneNumber.length > DEFAULTS.MAX_PHONE_LENGTH) {
        throw new Error('Phone number is too long');
      }
      
      if (timestamp !== null && (!Number.isInteger(timestamp) || timestamp < 0)) {
        throw new Error('Timestamp must be a positive integer');
      }
      
      // Use provided timestamp or current time
      const currentTime = timestamp || Date.now();
      
      // Create a time window to make HMAC more dynamic
      const timeWindow = Math.floor(currentTime / DEFAULTS.TIME_WINDOW_MS);
      
      // Create data string for HMAC with input validation
      const normalizedPhone = phoneNumber.trim();
      const dataString = `${normalizedPhone}:${timeWindow}:${this.secretKey}`;
      
      // Generate HMAC
      const hmac = crypto.createHmac('sha256', this.secretKey);
      hmac.update(dataString, 'utf8');
      const hmacResult = hmac.digest('hex');
      
      // Extract digits from HMAC with bounds checking
      const lastChar = hmacResult.charAt(hmacResult.length - 1);
      const offset = parseInt(lastChar, 16) % 10;
      const otpLength = this.config.length || 6;
      
      // Ensure we don't go out of bounds
      const startPos = Math.min(offset, hmacResult.length - otpLength);
      const hexSubstring = hmacResult.substring(startPos, startPos + otpLength);
      const otpNum = parseInt(hexSubstring, 16) % Math.pow(10, otpLength);
      const otp = otpNum.toString().padStart(otpLength, '0');
      
      // Calculate expiry time
      const expiryTime = currentTime + (this.expiryMinutes * 60 * 1000);
      
      // Create verification hash
      const verificationData = `${normalizedPhone}:${otp}:${currentTime}:${expiryTime}`;
      const verificationHmac = crypto.createHmac('sha256', this.secretKey);
      verificationHmac.update(verificationData, 'utf8');
      const verificationHash = verificationHmac.digest('hex');
      
      return {
        otp,
        phoneNumber: normalizedPhone,
        timestamp: currentTime,
        expiryTime,
        expiryMinutes: this.expiryMinutes,
        verificationHash,
        isValid: true
      };
    } catch (error) {
      logger.error('Error generating OTP:', {
        message: error.message,
        phoneNumber: phoneNumber ? '[HIDDEN]' : 'null',
        timestamp: new Date().toISOString()
      });
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
      logger.error('Error verifying OTP:', error);
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
    if (!phoneNumber || typeof phoneNumber !== 'string') {
      throw new Error('Phone number is required and must be a string');
    }
    
    const normalizedPhone = phoneNumber.trim();
    if (normalizedPhone.length === 0 || normalizedPhone.length > DEFAULTS.MAX_PHONE_LENGTH) {
      throw new Error('Invalid phone number for Redis key generation');
    }
    
    return `otp:${normalizedPhone}`;
  }

  /**
   * Generates a random password for new customers
   * @param {number} length - Password length (default: 12)
   * @returns {string} - Random password
   */
  generateRandomPassword(length = DEFAULTS.PASSWORD_LENGTH) {
    // Input validation
    const validLength = Number.isInteger(length) && length >= 8 && length <= DEFAULTS.MAX_PASSWORD_LENGTH
      ? length
      : DEFAULTS.PASSWORD_LENGTH;
    
    // Character sets for better password complexity
    const charsets = {
      lowercase: 'abcdefghijklmnopqrstuvwxyz',
      uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      numbers: '0123456789',
      symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?'
    };
    
    const allChars = Object.values(charsets).join('');
    let password = '';
    
    try {
      // Ensure at least one character from each set
      for (const charset of Object.values(charsets)) {
        const randomIndex = crypto.randomInt(0, charset.length);
        password += charset[randomIndex];
      }
      
      // Fill the rest with random characters
      for (let i = password.length; i < validLength; i++) {
        const randomIndex = crypto.randomInt(0, allChars.length);
        password += allChars[randomIndex];
      }
      
      // Shuffle the password to avoid predictable patterns
      return this._shuffleString(password);
    } catch (error) {
      logger.error('Error generating random password:', error);
      throw new Error('Failed to generate random password');
    }
  }
  
  /**
   * Shuffles characters in a string
   * @param {string} str - String to shuffle
   * @returns {string} - Shuffled string
   * @private
   */
  _shuffleString(str) {
    const array = str.split('');
    for (let i = array.length - 1; i > 0; i--) {
      const j = crypto.randomInt(0, i + 1);
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array.join('');
  }

  /**
   * Creates a hash for password storage
   * @param {string} password - Plain text password
   * @returns {string} - Hashed password
   */
  hashPassword(password) {
    if (!password || typeof password !== 'string') {
      throw new Error('Password is required and must be a string');
    }
    
    if (password.length > DEFAULTS.MAX_PASSWORD_LENGTH) {
      throw new Error('Password is too long');
    }
    
    try {
      const bcrypt = getBcrypt();
      return bcrypt.hashSync(password, DEFAULTS.SALT_ROUNDS);
    } catch (error) {
      logger.error('Error hashing password:', {
        message: error.message,
        timestamp: new Date().toISOString()
      });
      throw new Error('Failed to hash password');
    }
  }

  /**
   * Generates a customer data Redis key
   * @param {string} identifier - Email or phone number
   * @returns {string} - Redis key for customer data
   */
  generateCustomerDataKey(identifier) {
    if (!identifier || typeof identifier !== 'string') {
      throw new Error('Identifier is required and must be a string');
    }
    
    const normalizedIdentifier = identifier.trim();
    if (normalizedIdentifier.length === 0 || normalizedIdentifier.length > 254) { // Email max length
      throw new Error('Invalid identifier for Redis key generation');
    }
    
    return `customer:${normalizedIdentifier}`;
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
