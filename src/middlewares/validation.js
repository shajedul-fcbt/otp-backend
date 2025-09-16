const Joi = require('joi');
const phoneValidator = require('../utils/phoneValidator');
const logger = require('../config/logger');

/**
 * Validation schemas using Joi
 */

const phoneNumberSchema = Joi.string()
  .pattern(/^(\+880|880|0)?[1-9][0-9]{8,9}$/)
  .required()
  .messages({
    'string.pattern.base': 'Invalid Bangladeshi phone number format',
    'any.required': 'Phone number is required'
  });

const otpSchema = Joi.string()
  .pattern(/^[0-9]{6}$/)
  .required()
  .messages({
    'string.pattern.base': 'OTP must be exactly 6 digits',
    'any.required': 'OTP is required'
  });

const emailSchema = Joi.string()
  .email()
  .required()
  .messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required'
  });

const nameSchema = Joi.string()
  .min(2)
  .max(100)
  .pattern(/^[a-zA-Z\s]+$/)
  .required()
  .messages({
    'string.min': 'Name must be at least 2 characters long',
    'string.max': 'Name cannot exceed 100 characters',
    'string.pattern.base': 'Name can only contain letters and spaces',
    'any.required': 'Name is required'
  });

const genderSchema = Joi.string()
  .valid('male', 'female', 'other')
  .optional()
  .messages({
    'any.only': 'Gender must be either male, female, or other'
  });

const birthdateSchema = Joi.date()
  .max('now')
  .min('1900-01-01')
  .optional()
  .messages({
    'date.max': 'Birthdate cannot be in the future',
    'date.min': 'Please provide a valid birthdate',
    'date.base': 'Please provide a valid date format (YYYY-MM-DD)'
  });

const acceptsMarketingSchema = Joi.boolean()
  .default(false)
  .optional();

/**
 * Validation schemas for different endpoints
 */
const sendOTPSchema = Joi.object({
  phoneNumber: phoneNumberSchema
});

const verifyOTPSchema = Joi.object({
  phoneNumber: phoneNumberSchema,
  otp: otpSchema
});

const customerSignupSchema = Joi.object({
  phoneNumber: phoneNumberSchema,
  name: nameSchema,
  email: emailSchema,
  gender: genderSchema,
  birthdate: birthdateSchema,
  acceptsMarketing: acceptsMarketingSchema
});

/**
 * Middleware factory for validation
 */
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false, // Return all errors, not just the first one
      stripUnknown: true // Remove unknown properties
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors
      });
    }

    // Replace the original data with the validated data
    req[property] = value;
    next();
  };
};

/**
 * Custom phone number validation middleware
 */
const validatePhoneNumber = (req, res, next) => {
  const phoneNumber = req.body.phoneNumber;
  
  if (!phoneNumber) {
    return res.status(400).json({
      success: false,
      message: 'Phone number is required',
      errors: [{
        field: 'phoneNumber',
        message: 'Phone number is required'
      }]
    });
  }

  const validation = phoneValidator.validate(phoneNumber);
  
  if (!validation.isValid) {
    return res.status(400).json({
      success: false,
      message: validation.message,
      errors: [{
        field: 'phoneNumber',
        message: validation.message,
        value: phoneNumber
      }]
    });
  }

  // Replace with normalized phone number
  req.body.phoneNumber = validation.normalizedNumber;
  req.phoneValidation = validation;
  
  next();
};

/**
 * Custom phone number validation middleware for query parameters
 */
const validatePhoneNumberQuery = (req, res, next) => {
  const phoneNumber = req.query.phoneNumber;
  
  if (!phoneNumber) {
    return res.status(400).json({
      success: false,
      message: 'Phone number is required',
      error: 'Missing phone number parameter'
    });
  }

  const validation = phoneValidator.validate(phoneNumber);
  
  if (!validation.isValid) {
    return res.status(400).json({
      success: false,
      message: validation.message,
      errors: [{
        field: 'phoneNumber',
        message: validation.message,
        value: phoneNumber
      }]
    });
  }

  // Replace with normalized phone number
  req.query.phoneNumber = validation.normalizedNumber;
  req.phoneValidation = validation;
  
  next();
};

/**
 * Error handler for validation errors
 */
const handleValidationError = (error, req, res, next) => {
  if (error.name === 'ValidationError') {
    const errors = Object.keys(error.errors).map(field => ({
      field: field,
      message: error.errors[field].message
    }));

    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: errors
    });
  }

  next(error);
};

/**
 * Sanitize input to prevent XSS and injection attacks
 */
const sanitizeInput = (req, res, next) => {
  const sanitizeValue = (value) => {
    if (typeof value === 'string') {
      // Remove potentially dangerous characters
      return value
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<[^>]+>/g, '')
        .trim();
    }
    return value;
  };

  const sanitizeObject = (obj) => {
    logger.debug('obj', obj);
    if (obj && typeof obj === 'object') {
      for (let key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          if (typeof obj[key] === 'object' && obj[key] !== null) {
            sanitizeObject(obj[key]);
          } else {
            obj[key] = sanitizeValue(obj[key]);
          }
        }
      }
    }
  };

  sanitizeObject(req.body);
  sanitizeObject(req.query);
  sanitizeObject(req.params);

  next();
};

/**
 * Content-Type validation middleware
 */
const validateContentType = (req, res, next) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    if (!req.is('application/json')) {
      return res.status(400).json({
        success: false,
        message: 'Content-Type must be application/json',
        errors: [{
          field: 'content-type',
          message: 'Invalid content type. Expected application/json'
        }]
      });
    }
  }
  next();
};

module.exports = {
  // Validation schemas
  sendOTPSchema,
  verifyOTPSchema,
  customerSignupSchema,
  
  // Validation middleware
  validate,
  validatePhoneNumber,
  validatePhoneNumberQuery,
  handleValidationError,
  sanitizeInput,
  validateContentType,
  
  // Individual field schemas for reuse
  phoneNumberSchema,
  otpSchema,
  emailSchema,
  nameSchema,
  genderSchema,
  birthdateSchema,
  acceptsMarketingSchema
};
