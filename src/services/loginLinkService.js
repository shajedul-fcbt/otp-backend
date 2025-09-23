/**
 * Login Link Service
 * Handles secure login link generation, storage, and verification
 */

const crypto = require('crypto');
const redisClient = require('../config/database');
const config = require('../config/environment');
const logger = require('../config/logger');
const shopifyService = require('./shopifyService');
const { v4: uuidv4 } = require('uuid');
const customerService = require('./customerService');

class LoginLinkService {
  constructor() {
    this.secretKey = config.otp.secretKey;
    this.linkExpiryMinutes = 15; // Login links expire in 15 minutes
    this.redisKeyPrefix = 'login_link:';
  }

  /**
   * Validates email and checks existence in Shopify and database
   * @param {string} email - Email address to validate
   * @returns {object} Validation result
   */
  async validateEmailForLogin(email) {
    try {
      // Check if customer exists in Shopify
      const shopifyResult = await shopifyService.checkCustomerByEmail(email);
      
      if (shopifyResult.error) {
        logger.error('Shopify check failed:', shopifyResult.error);
        return {
          isValid: false,
          exists: false,
          message: 'Unable to verify email. Please try again later.',
          error: 'SHOPIFY_ERROR'
        };
      }

      if (!shopifyResult.exists) {
        logger.info('Email not found in Shopify:', email);
        return {
          isValid: false,
          exists: false,
          message: 'Invalid Email. Please sign up.',
          error: 'EMAIL_NOT_FOUND'
        };
      }

      return {
        isValid: true,
        exists: true,
        customer: shopifyResult.customer,
        message: 'Email validated successfully'
      };
    } catch (error) {
      logger.error('Error validating email:', error);
      return {
        isValid: false,
        exists: false,
        message: 'Unable to verify email. Please try again later.',
        error: 'VALIDATION_ERROR'
      };
    }
  }

  /**
   * Generates a secure login token
   * @param {string} email - Customer email
   * @returns {string} Secure token
   */
  generateLoginToken(email) {
    const timestamp = Date.now();
    const randomBytes = crypto.randomBytes(32).toString('hex');
    const tokenData = `${email}:${timestamp}:${randomBytes}`;
    
    // Create HMAC signature for token integrity
    const hmac = crypto.createHmac('sha256', this.secretKey);
    hmac.update(tokenData);
    const signature = hmac.digest('hex');
    
    // Combine token data with signature
    const token = Buffer.from(`${tokenData}:${signature}`).toString('base64url');
    return token;
  }

  /**
   * Stores login link data in Redis
   * @param {string} token - Login token
   * @param {string} email - Customer email
   * @param {object} customerData - Customer information from Shopify
   * @returns {Promise<object>} Storage result
   */
  async storeLoginLink(token, email, customerData) {
    try {
      const expiryTime = Date.now() + (this.linkExpiryMinutes * 60 * 1000);
      
      const linkData = {
        email,
        customer: customerData,
        createdAt: Date.now(),
        expiryTime,
        used: false,
        attempts: 0
      };

      const redisKey = `${this.redisKeyPrefix}${token}`;
      
      // Store with automatic expiry
      await redisClient.set(
        redisKey,
        linkData,
        this.linkExpiryMinutes * 60, // TTL in seconds
        
      );

      logger.info('Login link stored in Redis', {
        email,
        token: this.hashToken(token),
        expiresIn: `${this.linkExpiryMinutes} minutes`
      });

      return {
        success: true,
        token,
        expiryTime
      };
    } catch (error) {
      logger.error('Error storing login link:', error);
      return {
        success: false,
        error: 'Failed to store login link'
      };
    }
  }

  /**
   * Generates and stores a login link
   * @param {string} email - Customer email
   * @returns {Promise<object>} Generation result
   */
  async generateLoginLink(email) {
    try {
      // Validate email first
      const validation = await this.validateEmailForLogin(email);
      
      if (!validation.isValid) {
        return {
          success: false,
          message: validation.message,
          error: validation.error
        };
      }

      // Generate secure token
      const token = this.generateLoginToken(email);
      
      // Store in Redis
      const storeResult = await this.storeLoginLink(token, email, validation.customer);
      
      if (!storeResult.success) {
        return {
          success: false,
          message: 'Failed to generate login link. Please try again.',
          error: 'STORAGE_ERROR'
        };
      }

      // Generate login URL
      const loginUrl = this.buildLoginUrl(token);

      logger.info('Login link generated successfully', {
        email,
        token: this.hashToken(token)
      });

      return {
        success: true,
        message: 'Login link generated successfully',
        data: {
          email,
          loginUrl,
          expiresIn: this.linkExpiryMinutes,
          customer: validation.customer
        }
      };
    } catch (error) {
      logger.error('Error generating login link:', error);
      return {
        success: false,
        message: 'Unable to generate login link. Please try again later.',
        error: 'GENERATION_ERROR'
      };
    }
  }

  /**
   * Verifies a login token
   * @param {string} token - Login token to verify
   * @returns {Promise<object>} Verification result
   */
  async verifyLoginToken(token) {
    try {
      // Validate token format
      if (!token || typeof token !== 'string') {
        return {
          isValid: false,
          message: 'Invalid token format',
          error: 'INVALID_TOKEN'
        };
      }

      // Get stored data from Redis
      const redisKey = `${this.redisKeyPrefix}${token}`;
      const storedData = await redisClient.get(redisKey);

      if (!storedData) {
        return {
          isValid: false,
          message: 'Login link has expired or is invalid',
          error: 'TOKEN_NOT_FOUND'
        };
      }
      
      console.log(typeof storedData);
      const linkData = storedData

      console.log(linkData);

      // Check if already used
      if (linkData.used) {
        return {
          isValid: false,
          message: 'Login link has already been used',
          error: 'TOKEN_ALREADY_USED'
        };
      }

      // Check expiry
      if (Date.now() > linkData.expiryTime) {
        // Clean up expired token
        await redisClient.del(redisKey);
        return {
          isValid: false,
          message: 'Login link has expired',
          error: 'TOKEN_EXPIRED'
        };
      }

      // Verify token integrity
      const isValidToken = this.verifyTokenIntegrity(token, linkData.email);
      if (!isValidToken) {
        return {
          isValid: false,
          message: 'Invalid login token',
          error: 'TOKEN_INTEGRITY_FAILED'
        };
      }

      // Mark as used and update attempts
      linkData.used = true;
      linkData.attempts += 1;
      linkData.usedAt = Date.now();

      await redisClient.set(
        redisKey,
        JSON.stringify(linkData),
        this.linkExpiryMinutes * 60,
      );
      console.log(linkData);

      const customerData  = await customerService.getCustomerData(linkData?.customer?.phone);

      logger.info('Login token verified successfully', {
        email: linkData.email,
        token: this.hashToken(token)
      });


      

      return {
        isValid: true,
        message: 'Login successful',
        data: {
          email: linkData.email,
          customer: {
            ...linkData.customer,
            password: customerData.plainPassword,
            customerId: customerData.customerId
          },
        }
      };
    } catch (error) {
      logger.error('Error verifying login token:', error);
      return {
        isValid: false,
        message: 'Unable to verify login token. Please try again.',
        error: 'VERIFICATION_ERROR'
      };
    }
  }

  /**
   * Verifies token integrity using HMAC
   * @param {string} token - Base64 encoded token
   * @param {string} email - Expected email
   * @returns {boolean} Token validity
   */
  verifyTokenIntegrity(token, email) {
    try {
      // Decode token
      const decoded = Buffer.from(token, 'base64url').toString();
      const parts = decoded.split(':');
      
      if (parts.length !== 4) {
        return false;
      }

      const [tokenEmail, timestamp, randomBytes, signature] = parts;
      
      // Verify email matches
      if (tokenEmail !== email) {
        return false;
      }

      // Recreate HMAC and verify signature
      const tokenData = `${tokenEmail}:${timestamp}:${randomBytes}`;
      const hmac = crypto.createHmac('sha256', this.secretKey);
      hmac.update(tokenData);
      const expectedSignature = hmac.digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    } catch (error) {
      logger.error('Error verifying token integrity:', error);
      return false;
    }
  }

  /**
   * Builds login URL
   * @param {string} token - Login token
   * @returns {string} Complete login URL
   */
  buildLoginUrl(token) {
    // You can customize this URL based on your frontend configuration
    const baseUrl = config.api.frontendUrl || 'http://localhost:3000';
    return `${baseUrl}/account/login?token=${token}`;
  }

  /**
   * Hashes token for logging (privacy)
   * @param {string} token - Original token
   * @returns {string} Hashed token for logging
   */
  hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex').substring(0, 8);
  }

  /**
   * Validates email format
   * @param {string} email - Email to validate
   * @returns {object} Validation result
   */
  validateEmailFormat(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!email || typeof email !== 'string') {
      return {
        isValid: false,
        message: 'Email is required'
      };
    }

    if (!emailRegex.test(email.trim())) {
      return {
        isValid: false,
        message: 'Please provide a valid email address'
      };
    }

    return {
      isValid: true,
      normalizedEmail: email.trim().toLowerCase()
    };
  }
}

module.exports = new LoginLinkService();
