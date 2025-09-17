const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const config = require('./environment');

const options = {
  definition: {
    openapi: '3.0.0',
    info: config.api.swagger,
    servers: config.api.swagger.servers,
    components: {
      schemas: {
        SendOTPRequest: {
          type: 'object',
          required: ['phoneNumber'],
          properties: {
            phoneNumber: {
              type: 'string',
              pattern: '^\\+880[1-9][0-9]{8}$',
              description: 'Bangladeshi phone number in international format (+880XXXXXXXXX)',
              example: '+8801712345678'
            }
          }
        },
        SendOTPResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            message: {
              type: 'string',
              example: 'OTP sent successfully'
            },
            data: {
              type: 'object',
              properties: {
                phoneNumber: {
                  type: 'string',
                  example: '+8801712345678'
                },
                customerExists: {
                  type: 'boolean',
                  example: true
                },
                needsSignup: {
                  type: 'boolean',
                  example: false
                },
                expiresIn: {
                  type: 'number',
                  example: 600
                }
              }
            }
          }
        },
        VerifyOTPRequest: {
          type: 'object',
          required: ['phoneNumber', 'otp'],
          properties: {
            phoneNumber: {
              type: 'string',
              pattern: '^\\+880[1-9][0-9]{8}$',
              description: 'Bangladeshi phone number in international format',
              example: '+8801712345678'
            },
            otp: {
              type: 'string',
              pattern: '^[0-9]{6}$',
              description: '6-digit OTP code',
              example: '123456'
            }
          }
        },
        VerifyOTPResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            message: {
              type: 'string',
              example: 'OTP verified successfully'
            },
            data: {
              type: 'object',
              properties: {
                phoneNumber: {
                  type: 'string',
                  example: '+8801712345678'
                },
                verified: {
                  type: 'boolean',
                  example: true
                }
              }
            }
          }
        },
        CustomerSignupRequest: {
          type: 'object',
          required: ['phoneNumber', 'name', 'email'],
          properties: {
            phoneNumber: {
              type: 'string',
              pattern: '^\\+880[1-9][0-9]{8}$',
              example: '+8801712345678'
            },
            name: {
              type: 'string',
              minLength: 2,
              maxLength: 100,
              example: 'John Doe'
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'john.doe@example.com'
            },
            gender: {
              type: 'string',
              enum: ['male', 'female', 'other'],
              example: 'male'
            },
            birthdate: {
              type: 'string',
              format: 'date',
              example: '1990-01-15'
            },
            acceptsMarketing: {
              type: 'boolean',
              example: true
            }
          }
        },
        CustomerSignupResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            message: {
              type: 'string',
              example: 'Customer created successfully'
            },
            data: {
              type: 'object',
              properties: {
                customerId: {
                  type: 'string',
                  example: 'gid://shopify/Customer/123456789'
                },
                email: {
                  type: 'string',
                  example: 'john.doe@example.com'
                },
                phoneNumber: {
                  type: 'string',
                  example: '+8801712345678'
                }
              }
            }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            message: {
              type: 'string',
              example: 'Validation error'
            },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: {
                    type: 'string',
                    example: 'phoneNumber'
                  },
                  message: {
                    type: 'string',
                    example: 'Invalid phone number format'
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  apis: [
    './src/routes/*.js', 
    './src/controllers/*.js',
    './src/docs/*.yaml'
  ]
};

const specs = swaggerJsdoc(options);

module.exports = {
  swaggerUi,
  specs
};
