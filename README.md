# Express OTP Backend

A comprehensive OTP (One-Time Password) authentication backend built with Express.js, featuring Shopify integration, SMS service integration, and Redis caching.

## Features

- **HMAC-based OTP Generation**: Secure 6-digit OTP generation using HMAC algorithm with time-based windows
- **Bangladeshi Phone Number Validation**: Complete validation for BD phone numbers with multiple format support
- **SMS Integration**: Real SMS sending via SSL Wireless API with OTP delivery
- **Shopify Integration**: Customer lookup and creation using both Admin and Storefront APIs
- **Redis In-Memory Storage**: Fast OTP and customer data storage with automatic expiry
- **Advanced Rate Limiting**: Multi-tier rate limiting (general, OTP-specific, phone-specific)
- **Swagger Documentation**: Interactive API documentation with comprehensive examples
- **CORS Support**: Configurable CORS for public API endpoints
- **Input Validation**: Robust request validation using Joi with XSS protection
- **Security**: Helmet for security headers, input sanitization, and data integrity checks
- **Professional Logging**: Winston-based structured logging with file output
- **Customer Management**: Complete customer lifecycle with temporary password generation
- **Email-based Login Links**: Secure login link generation and verification with email validation

## API Endpoints

### OTP Management
- `POST /api/otp/send` - Send OTP to phone number (with SMS delivery)
- `POST /api/otp/verify` - Verify OTP and retrieve customer data
- `POST /api/otp/resend` - Resend OTP with rate limiting

### Customer Management
- `POST /api/customer/signup` - Create new customer account
- `GET /api/customer/check-exists` - Check if customer exists by phone number and/or email

### Login Link Authentication
- `POST /api/auth/login-link/request` - Request secure login link via email
- `GET /api/auth/login-link/verify` - Verify login link token and authenticate user
- `GET /api/auth/login-link/status` - Get login link service status

### System & Monitoring
- `GET /` - API information and available endpoints
- `GET /health` - Basic health check
- `GET /api/status` - Comprehensive service status (Redis, Shopify, SMS)
- `GET /api-docs` - Interactive Swagger documentation

### Response Format
All API responses follow a consistent JSON structure:
```json
{
  "success": true|false,
  "message": "Human readable message",
  "data": { /* Response data */ },
  "error": "Error details (if applicable)"
}
```

## Installation

### Prerequisites
- Node.js (v16 or higher)
- Redis server
- Shopify store with API access
- SSL Wireless API credentials

### Setup
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy environment configuration:
   ```bash
   cp env.example .env
   ```
4. Configure environment variables in `.env`
5. Start Redis server
6. Run the application:
   ```bash
   npm run dev
   ```

## Environment Configuration

### Required Variables
```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Shopify Configuration
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_ADMIN_ACCESS_TOKEN=your_admin_token
SHOPIFY_STOREFRONT_ACCESS_TOKEN=your_storefront_token

# SMS Configuration (SSL Wireless)
SMS_API_TOKEN=your_sms_token
SMS_SID=your_sms_sid
SMS_BASE_URL=https://api.sslwireless.com

# OTP Configuration
HMAC_SECRET=your_hmac_secret_for_otp_and_challenge_protocol
```

## Phone Number Format Support

The API supports multiple Bangladeshi phone number formats:
- International: `+8801712345678`
- National: `01712345678`
- With country code: `8801712345678`

## Shopify Integration

### Admin API Features
- Customer existence checking
- Customer creation with full profile data
- Customer data retrieval

### Storefront API Features
- Fallback customer creation when Admin API is unavailable
- Limited functionality for basic customer operations

## SMS Integration (SSL Wireless)

### Features
- Real SMS delivery to Bangladeshi numbers
- OTP message templating
- Delivery status tracking
- Rate limiting and error handling

### Message Format
```
Your OTP code is: {otp}. This code will expire in {expiryMinutes} minutes. Do not share this code with anyone.
```

## Redis Data Structure

### OTP Storage
```
Key: otp:{phoneNumber}
Value: {
  otp: "123456",
  phoneNumber: "+8801712345678",
  timestamp: 1640995200000,
  expiryTime: 1640995800000,
  verificationHash: "abc123..."
}
```

### Customer Data Storage
```
Key: customer:{phoneNumber}
Value: {
  customerId: "gid://shopify/Customer/123456789",
  email: "user@example.com",
  phoneNumber: "+8801712345678",
  name: "John Doe",
  password: "temp_password",
  createdAt: "2024-01-15T10:30:00.000Z"
}
```

## Testing the API

### Manual Testing
1. Start the server: `npm run dev`
2. Visit `http://localhost:3000/api-docs` for interactive documentation
3. Use the Swagger UI to test endpoints

### Test Scripts
```bash
# Run comprehensive tests
npm test

# Quick health check
npm run demo:health

# Full demo with all endpoints
npm run demo
```

## Logging

### Log Levels
- **info**: General application flow and successful operations
- **warn**: Warning messages and non-critical issues
- **error**: Error conditions and exceptions
- **debug**: Detailed debugging information
- **http**: HTTP request logging

### Log Files
- `logs/combined.log` - All log messages
- `logs/error.log` - Error messages only

### Log Configuration
Logging is configured via environment variables:
```env
LOG_LEVEL=info  # Set log level (error, warn, info, debug)
```

## Rate Limiting

### General Rate Limiting
- 100 requests per 15 minutes per IP

### OTP-Specific Rate Limiting
- 5 OTP requests per minute per IP
- 3 OTP requests per 2 minutes per phone number
- 10 verification attempts per 15 minutes per IP

### Customer Signup Rate Limiting
- 10 signup attempts per hour per IP

## Security Features

### Input Validation
- Joi schema validation for all inputs
- XSS protection through input sanitization
- Phone number format validation

### Security Headers
- Helmet.js for security headers
- CORS configuration
- Rate limiting protection

### Data Protection
- Sensitive data masking in logs
- Secure OTP generation with HMAC
- Temporary password generation for customers

## API Documentation

The API documentation is organized into separate YAML files for maintainability:
- `src/docs/otpRoutes.yaml` - OTP endpoint documentation
- `src/docs/customerRoutes.yaml` - Customer endpoint documentation

This approach keeps route files clean while maintaining comprehensive documentation.

## Development

### Project Structure
```
src/
├── config/          # Configuration files
├── controllers/     # Request handlers
├── docs/           # API documentation (YAML)
├── middlewares/    # Custom middleware
├── routes/         # Route definitions
├── services/       # Business logic
└── utils/          # Utility functions
```

### Adding New Endpoints
1. Define route in appropriate route file
2. Add Swagger documentation in corresponding YAML file
3. Implement controller logic
4. Add validation schemas if needed

## Production Deployment

### Environment Setup
1. Set `NODE_ENV=production`
2. Configure production Redis instance
3. Set up proper logging directory permissions
4. Configure reverse proxy (nginx recommended)

### Monitoring
- Health check endpoint: `/health`
- Service status: `/api/status`
- Log files: `logs/combined.log` and `logs/error.log`

## License

ISC License - see LICENSE file for details.

## Support

For issues and questions, please check the API documentation at `/api-docs` or review the test scripts for usage examples.