/**
 * Login Link Controller
 * Handles login link generation and verification endpoints
 */

const loginLinkService = require('../services/loginLinkService');
const emailService = require('../services/emailService');
const logger = require('../config/logger');
const { HTTP_STATUS, ERROR_MESSAGES } = require('../constants/otpConstants');
const ErrorHandler = require('../utils/errorHandler');
const InputSanitizer = require('../utils/inputSanitizer');

class LoginLinkController {
  /**
   * Request a login link via email
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  async requestLoginLink(req, res) {
    try {
      // Sanitize and validate input
      const sanitizedBody = InputSanitizer.sanitizeRequestBody(req.body);
      const { email } = sanitizedBody;

      if (!email) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Email is required',
          error: 'MISSING_EMAIL'
        });
      }

      // Validate email format
      const emailValidation = loginLinkService.validateEmailFormat(email);
      if (!emailValidation.isValid) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: emailValidation.message,
          error: 'INVALID_EMAIL_FORMAT'
        });
      }

      const normalizedEmail = emailValidation.normalizedEmail;
      
      logger.info('Login link request initiated', { email: normalizedEmail });

      // Generate login link
      const linkResult = await loginLinkService.generateLoginLink(normalizedEmail);

      console.log(linkResult);

      if (!linkResult.success) {
        if (linkResult.error === 'EMAIL_NOT_FOUND') {
          return res.status(HTTP_STATUS.UNAUTHORIZED).json({
            success: false,
            message: 'Invalid Email. Please sign up.',
            error: 'UNAUTHORIZED'
          });
        }

        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: linkResult.message || 'Failed to generate login link',
          error: linkResult.error || 'GENERATION_ERROR'
        });
      }

      // Send email with login link
      const emailResult = await emailService.sendLoginLinkEmail(
        normalizedEmail,
        linkResult.data.loginUrl,
        linkResult.data.customer
      );
      console.log(emailResult);

      if (!emailResult.success) {
        logger.error('Failed to send login link email', {
          email: normalizedEmail,
          error: emailResult.error
        });
        
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: 'Login link generated but failed to send email. Please try again.',
          error: 'EMAIL_SEND_FAILED'
        });
      }

      logger.info('Login link email sent successfully', {
        email: normalizedEmail,
        messageId: emailResult.data?.messageId
      });

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Login link sent to your email address',
        data: {
          email: normalizedEmail,
          expiresIn: linkResult.data.expiresIn,
          sentAt: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('ERROR: Error in requestLoginLink:', error);
      
      const safeMessage = InputSanitizer.createSafeErrorMessage(error);
      
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
        error: safeMessage
      });
    }
  }

  /**
   * Verify login link token and authenticate user
   * @param {object} req - Express request object  
   * @param {object} res - Express response object
   */
  async verifyLoginLink(req, res) {
    try {
      const { token } = req.query;

      if (!token) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Login token is required',
          error: 'MISSING_TOKEN'
        });
      }

      logger.info('Login link verification initiated', {
        token: loginLinkService.hashToken(token)
      });

      // Verify the login token
      const verificationResult = await loginLinkService.verifyLoginToken(token);

      if (!verificationResult.isValid) {
        const statusCode = HTTP_STATUS.UNAUTHORIZED;
        
        return res.status(statusCode).json({
          success: false,
          message: verificationResult.message,
          error: verificationResult.error
        });
      }

      logger.info('Login link verified successfully', {
        email: verificationResult.data.email,
        customerId: verificationResult.data.customer?.id
      });

      // Successful login - return user data
      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Login successful',
        data: {
          email: verificationResult.data.email,
          customer: verificationResult.data.customer,
          authenticatedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('ERROR: Error in verifyLoginLink:', error);
      
      const safeMessage = InputSanitizer.createSafeErrorMessage(error);
      
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
        error: safeMessage
      });
    }
  }

  /**
   * Check login link status (for debugging/monitoring)
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  async getLoginLinkStatus(req, res) {
    try {
      const emailServiceStatus = emailService.getServiceStatus();
      
      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Login link service status',
        data: {
          emailService: emailServiceStatus,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('ERROR: Error in getLoginLinkStatus:', error);
      
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to get service status',
        error: 'STATUS_ERROR'
      });
    }
  }

  /**
   * Maps error types to appropriate HTTP status codes
   * @param {string} errorType - Error type from verification
   * @returns {number} HTTP status code
   */
  getErrorStatusCode(errorType) {
    switch (errorType) {
      case 'INVALID_TOKEN':
      case 'TOKEN_NOT_FOUND':
      case 'TOKEN_EXPIRED':
        return HTTP_STATUS.UNAUTHORIZED;
      case 'TOKEN_ALREADY_USED':
        return HTTP_STATUS.FORBIDDEN;
      case 'TOKEN_INTEGRITY_FAILED':
        return HTTP_STATUS.UNAUTHORIZED;
      default:
        return HTTP_STATUS.INTERNAL_SERVER_ERROR;
    }
  }

  /**
   * Rate limiting for login link requests (can be used with middleware)
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   * @param {function} next - Next middleware function
   */
  rateLimitLoginRequests(req, res, next) {
    // This can be implemented with the existing rate limiter
    // For now, we'll just pass through
    next();
  }

  /**
   * Validate request IP and user agent (security middleware)
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   * @param {function} next - Next middleware function
   */
  securityCheck(req, res, next) {
    try {
      // Log request details for security monitoring
      logger.info('Login link request security check', {
        ip: req.ip,
        userAgent: req.get('User-Agent')?.substring(0, 100),
        timestamp: new Date().toISOString()
      });

      // Add any additional security checks here
      // For example, checking for suspicious patterns, etc.
      
      next();
    } catch (error) {
      logger.error('Security check failed:', error);
      next();
    }
  }
}

module.exports = new LoginLinkController();
