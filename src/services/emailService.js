/**
 * Email Service
 * Handles sending login link emails
 */

const nodemailer = require('nodemailer');
const config = require('../config/environment');
const logger = require('../config/logger');

class EmailService {
  constructor() {
    this.config = config.email || {};
    this.enabled = this.config.enabled !== false; // Default to true unless explicitly disabled
    this.mockSending = this.config.mockSending === true; // Default to false unless explicitly enabled
    this.transporter = null;
    
    // Debug logging
    logger.info('EmailService constructor', {
      configEnabled: this.config.enabled,
      configMockSending: this.config.mockSending,
      configProvider: this.config.provider,
      enabled: this.enabled,
      mockSending: this.mockSending
    });
    
    this.initializeTransporter();
  }

  /**
   * Initialize nodemailer transporter for Outlook/Office365
   */
  initializeTransporter() {
    if (this.mockSending) {
      logger.info('Email service initialized in mock mode');
      this.enabled = true; // Enable mock sending
      return;
    }

    try {
      const outlookConfig = this.config.outlook;
      
      logger.info('Initializing Outlook email transporter', {
        host: outlookConfig.host,
        port: outlookConfig.port,
        user: outlookConfig.user ? 'configured' : 'missing',
        password: outlookConfig.password ? 'configured' : 'missing'
      });
      
      if (!outlookConfig.user || !outlookConfig.password) {
        logger.warn('Outlook email credentials not configured. Email sending will be disabled.');
        this.enabled = false;
        return;
      }

      this.transporter = nodemailer.createTransport({
        host: outlookConfig.host,
        port: outlookConfig.port,
        secure: outlookConfig.secure, // false for TLS
        auth: {
          user: outlookConfig.user,
          pass: outlookConfig.password
        },
        tls: {
          ciphers: 'SSLv3'
        }
      });

      // Enable immediately and verify in background
      this.enabled = true;
      
      // Verify connection configuration (non-blocking)
      this.transporter.verify((error, success) => {
        if (error) {
          logger.error('Outlook SMTP connection verification failed:', error);
          // Don't disable here as verification might fail but sending might work
        } else {
          logger.info('Outlook SMTP connection verified successfully');
        }
      });

    } catch (error) {
      logger.error('Error initializing email transporter:', error);
      this.enabled = false;
    }
  }

  /**
   * Sends a login link email to the user
   * @param {string} email - Recipient email address
   * @param {string} loginUrl - The login URL to send
   * @param {object} customerData - Customer information
   * @returns {Promise<object>} Email sending result
   */
  async sendLoginLinkEmail(email, loginUrl, customerData = {}) {
    try {
      const emailData = {
        to: email,
        subject: 'Sundora Login Link',
        html: this.generateLoginEmailHtml(loginUrl, customerData),
        text: this.generateLoginEmailText(loginUrl, customerData)
      };

      if (this.mockSending) {
        return this.mockEmailSend(emailData);
      }

      // Send via Outlook SMTP
      return await this.sendEmailViaProvider(emailData);

    } catch (error) {
      logger.error('Error sending login link email:', error);
      return {
        success: false,
        message: 'Failed to send email',
        error: error.message
      };
    }
  }

  /**
   * Mock email sending for development/testing
   * @param {object} emailData - Email data
   * @returns {object} Mock result
   */
  mockEmailSend(emailData) {
    logger.info('MOCK EMAIL SENDING - Login Link Email', {
      to: emailData.to,
      subject: emailData.subject,
      timestamp: new Date().toISOString()
    });

    // Log the email content for development
    logger.info('EMAIL CONTENT (HTML):', emailData.html);
    logger.info('EMAIL CONTENT (TEXT):', emailData.text);

    return {
      success: true,
      message: 'Login link email sent successfully (MOCK)',
      data: {
        messageId: `mock_${Date.now()}`,
        to: emailData.to,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Send email via Outlook SMTP
   * @param {object} emailData - Email data
   * @returns {Promise<object>} Sending result
   */
  async sendEmailViaProvider(emailData) {
    if (!this.enabled) {
      logger.error('Email service not enabled', {
        enabled: this.enabled,
        mockSending: this.mockSending,
        hasTransporter: !!this.transporter
      });
      return {
        success: false,
        message: 'Email service not enabled',
        error: 'EMAIL_SERVICE_DISABLED'
      };
    }

    if (!this.transporter) {
      logger.error('Email transporter not initialized', {
        enabled: this.enabled,
        mockSending: this.mockSending,
        hasTransporter: !!this.transporter
      });
      return {
        success: false,
        message: 'Email transporter not initialized',
        error: 'EMAIL_TRANSPORTER_NOT_INITIALIZED'
      };
    }

    try {
      // Always send to shajedul.shuvo@gmail.com as specified in memory
      const recipientEmail = 'shajedul.shuvo@gmail.com';
      
      const mailOptions = {
        from: {
          name: this.config.fromName,
          address: this.config.fromEmail
        },
        to: recipientEmail,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text
      };

      logger.info('Sending email via Outlook SMTP', {
        to: recipientEmail,
        subject: emailData.subject,
        originalRecipient: emailData.to
      });

      const result = await this.transporter.sendMail(mailOptions);

      logger.info('Email sent successfully via Outlook', {
        messageId: result.messageId,
        to: recipientEmail,
        originalRecipient: emailData.to
      });

      return {
        success: true,
        message: 'Email sent successfully',
        data: {
          messageId: result.messageId,
          to: recipientEmail,
          originalRecipient: emailData.to,
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      logger.error('Error sending email via Outlook:', error);
      return {
        success: false,
        message: 'Failed to send email',
        error: error.message
      };
    }
  }

  /**
   * Generates HTML content for login link email
   * @param {string} loginUrl - Login URL
   * @param {object} customerData - Customer information
   * @returns {string} HTML content
   */
  generateLoginEmailHtml(loginUrl, customerData) {
    const customerName = customerData.firstName ? 
      `${customerData.firstName}${customerData.lastName ? ' ' + customerData.lastName : ''}` : 
      'Valued Customer';

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your Login Link</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f9f9f9;
            }
            .container {
                background-color: white;
                padding: 40px;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
            }
            .logo {
                font-size: 24px;
                font-weight: bold;
                color: #2c3e50;
                margin-bottom: 10px;
            }
            .content {
                margin-bottom: 30px;
            }
            .login-button {
                display: inline-block;
                background-color: #3498db;
                color: white;
                text-decoration: none;
                padding: 15px 30px;
                border-radius: 5px;
                font-weight: bold;
                text-align: center;
                margin: 20px 0;
            }
            .login-button:hover {
                background-color: #2980b9;
            }
            .security-info {
                background-color: #f8f9fa;
                padding: 15px;
                border-left: 4px solid #3498db;
                margin: 20px 0;
                font-size: 14px;
            }
            .footer {
                text-align: center;
                font-size: 12px;
                color: #666;
                margin-top: 30px;
                border-top: 1px solid #eee;
                padding-top: 20px;
            }
            .link-fallback {
                word-break: break-all;
                background-color: #f8f9fa;
                padding: 10px;
                border-radius: 4px;
                font-family: monospace;
                font-size: 12px;
                margin: 10px 0;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">🔐 Login Request</div>
                <h2 style="color: #2c3e50; margin: 0;">Secure Login Link</h2>
            </div>
            
            <div class="content">
                <p>Hello ${customerName},</p>
                
                <p>You requested a secure login link to access your account. Click the button below to sign in:</p>
                
                <div style="text-align: center;">
                    <a href="${loginUrl}" class="login-button">Sign In Securely</a>
                </div>
                
                <div class="security-info">
                    <strong>🛡️ Security Information:</strong>
                    <ul style="margin: 10px 0;">
                        <li>This link will expire in 15 minutes</li>
                        <li>The link can only be used once</li>
                        <li>If you didn't request this, please ignore this email</li>
                    </ul>
                </div>
                
                <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
                <div class="link-fallback">${loginUrl}</div>
            </div>
            
            <div class="footer">
                <p>This is an automated email. Please do not reply to this message.</p>
                <p>If you need assistance, please contact our support team.</p>
            </div>
        </div>
    </body>
    </html>`;
  }

  /**
   * Generates plain text content for login link email
   * @param {string} loginUrl - Login URL
   * @param {object} customerData - Customer information
   * @returns {string} Plain text content
   */
  generateLoginEmailText(loginUrl, customerData) {
    const customerName = customerData.firstName ? 
      `${customerData.firstName}${customerData.lastName ? ' ' + customerData.lastName : ''}` : 
      'Valued Customer';

    return `
Hello ${customerName},

You requested a secure login link to access your account.

Your Login Link:
${loginUrl}

SECURITY INFORMATION:
- This link will expire in 15 minutes
- The link can only be used once
- If you didn't request this, please ignore this email

If you need assistance, please contact our support team.

This is an automated email. Please do not reply to this message.
    `.trim();
  }

  /**
   * Validates email address format
   * @param {string} email - Email to validate
   * @returns {object} Validation result
   */
  validateEmailAddress(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!email || typeof email !== 'string') {
      return {
        isValid: false,
        message: 'Email address is required'
      };
    }

    const trimmedEmail = email.trim();
    
    if (!emailRegex.test(trimmedEmail)) {
      return {
        isValid: false,
        message: 'Please provide a valid email address'
      };
    }

    if (trimmedEmail.length > 254) {
      return {
        isValid: false,
        message: 'Email address is too long'
      };
    }

    return {
      isValid: true,
      normalizedEmail: trimmedEmail.toLowerCase()
    };
  }

  /**
   * Gets email service status
   * @returns {object} Service status
   */
  getServiceStatus() {
    return {
      enabled: this.enabled,
      mockSending: this.mockSending,
      configured: this.isConfigured(),
      provider: this.getProviderName()
    };
  }

  /**
   * Checks if email service is properly configured
   * @returns {boolean} Configuration status
   */
  isConfigured() {
    if (this.mockSending) {
      return true; // For mock sending, always return true
    }
    
    const outlookConfig = this.config.outlook;
    return !!(outlookConfig.user && outlookConfig.password && outlookConfig.host);
  }

  /**
   * Gets the name of the email provider
   * @returns {string} Provider name
   */
  getProviderName() {
    if (this.mockSending) {
      return 'Mock/Development';
    }
    
    if (this.enabled && this.transporter) {
      return 'Outlook/Office365 SMTP';
    }
    
    return 'Not Configured';
  }
}

module.exports = new EmailService();
