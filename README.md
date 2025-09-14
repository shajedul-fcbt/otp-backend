# Express OTP Backend

A comprehensive OTP (One-Time Password) authentication backend built with Express.js, featuring Shopify integration, SMS service integration, and Redis caching.

## 🚀 Features

- **🔐 HMAC-based OTP Generation**: Secure 6-digit OTP generation using HMAC algorithm with time-based windows
- **📱 Bangladeshi Phone Number Validation**: Complete validation for BD phone numbers with multiple format support
- **📨 SMS Integration**: Real SMS sending via SSL Wireless API with OTP delivery
- **🏪 Shopify Integration**: Customer lookup and creation using both Admin and Storefront APIs
- **💾 Redis In-Memory Storage**: Fast OTP and customer data storage with automatic expiry
- **🛡️ Advanced Rate Limiting**: Multi-tier rate limiting (general, OTP-specific, phone-specific)
- **📚 Swagger Documentation**: Interactive API documentation with comprehensive examples
- **🌐 CORS Support**: Configurable CORS for public API endpoints
- **✅ Input Validation**: Robust request validation using Joi with XSS protection
- **🔒 Security**: Helmet for security headers, input sanitization, and data integrity checks
- **📊 Comprehensive Logging**: Request logging, error tracking, and service monitoring
- **🔄 Customer Management**: Complete customer lifecycle with temporary password generation

## 📋 API Endpoints

### OTP Management
- `POST /api/otp/send` - Send OTP to phone number (with SMS delivery)
- `POST /api/otp/verify` - Verify OTP and retrieve customer data
- `POST /api/otp/resend` - Resend OTP with rate limiting

### Customer Management
- `POST /api/customer/signup` - Create new customer account
- `GET /api/customer/check-exists` - Check if customer exists by phone number

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

## 🛠️ Installation

### Prerequisites
- **Node.js**: Version 14.x or higher
- **Redis**: Version 6.x or higher
- **npm**: Version 6.x or higher (comes with Node.js)

### 1. Clone the Repository
```bash
git clone https://github.com/shajedul-fcbt/otp-backend.git
cd otp-backend
```

### 2. Install Dependencies
```bash
npm install
```

The project includes the following key dependencies:
- **Express.js**: Web framework
- **Redis**: In-memory data store
- **Axios**: HTTP client for external APIs
- **bcrypt**: Password hashing
- **Joi**: Input validation
- **Helmet**: Security headers
- **CORS**: Cross-origin resource sharing
- **Swagger**: API documentation
- **Winston**: Logging

### 3. Set up Redis
```bash
# Install Redis (Ubuntu/Debian)
sudo apt update
sudo apt install redis-server

# Start Redis service
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Verify Redis is running
redis-cli ping
# Should return: PONG
```

### 4. Configure Environment Variables
```bash
# Copy the example environment file
cp env.example .env

# Edit the environment file
nano .env
```

**Required Environment Variables:**
- `REDIS_HOST` and `REDIS_PORT`
- `SHOPIFY_STORE_DOMAIN` and `SHOPIFY_ADMIN_ACCESS_TOKEN`
- `SMS_API_BASE_URL`, `SMS_API_TOKEN`, and `SMS_SID`
- `OTP_SECRET_KEY`

### 5. Configure External Services

#### Shopify Setup
1. Create a Shopify store or use existing one
2. Generate Admin API access token with customer read/write permissions
3. Add store domain and access token to `.env`

#### SMS Service Setup (SSL Wireless)
1. Sign up for SSL Wireless SMS service
2. Obtain API credentials (Base URL, API Token, SID)
3. Add credentials to `.env` file
4. For development, set `MOCK_SMS_SENDING=true` to skip actual SMS sending

### 6. Verify Installation
```bash
# Check if all dependencies are installed
npm list

# Run the application
npm run dev
```

The server should start on `http://localhost:3000` with the following endpoints available:
- API Documentation: `http://localhost:3000/api-docs`
- Health Check: `http://localhost:3000/health`
- API Status: `http://localhost:3000/api/status`

## ⚙️ Environment Configuration

Create a `.env` file with the following variables:

```env
# =================================
# SERVER CONFIGURATION
# =================================
PORT=3000
NODE_ENV=development

# =================================
# REDIS CONFIGURATION
# =================================
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# =================================
# SHOPIFY CONFIGURATION
# =================================
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_STOREFRONT_ACCESS_TOKEN=your_storefront_access_token
SHOPIFY_ADMIN_ACCESS_TOKEN=your_admin_access_token

# =================================
# SMS SERVICE CONFIGURATION (SSL Wireless)
# =================================
SMS_API_BASE_URL=https://your-sms-api-domain.com
SMS_API_TOKEN=your_api_token_from_ssl_wireless_50_chars
SMS_SID=your_brand_sid_from_ssl
SMS_ENABLED=true
SMS_TIMEOUT_MS=30000
MOCK_SMS_SENDING=false

# =================================
# OTP CONFIGURATION
# =================================
OTP_SECRET_KEY=your_secret_key_for_hmac_generation
OTP_EXPIRY_MINUTES=10

# =================================
# RATE LIMITING CONFIGURATION
# =================================
RATE_LIMIT_WINDOW_MINUTES=15
RATE_LIMIT_MAX_REQUESTS=100

# =================================
# SECURITY CONFIGURATION
# =================================
CORS_ORIGIN=*
```

### Environment Variable Details

#### Required Variables
- **PORT**: Server port (default: 3000)
- **REDIS_HOST**: Redis server hostname
- **REDIS_PORT**: Redis server port (default: 6379)
- **SHOPIFY_STORE_DOMAIN**: Your Shopify store domain
- **OTP_SECRET_KEY**: Secret key for HMAC OTP generation

#### Shopify Integration
- **SHOPIFY_ADMIN_ACCESS_TOKEN**: Required for customer creation and lookup
- **SHOPIFY_STOREFRONT_ACCESS_TOKEN**: Optional, for limited functionality

#### SMS Integration (SSL Wireless)
- **SMS_API_BASE_URL**: SSL Wireless API endpoint
- **SMS_API_TOKEN**: 50-character authentication token
- **SMS_SID**: 20-character brand identifier
- **SMS_ENABLED**: Enable/disable SMS sending (default: true)
- **MOCK_SMS_SENDING**: Skip actual SMS sending for development (default: false)

#### Optional Variables
- **REDIS_PASSWORD**: Redis authentication password
- **CORS_ORIGIN**: Allowed CORS origins (default: *)
- **OTP_EXPIRY_MINUTES**: OTP validity duration (default: 10)

## 🏃‍♂️ Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will start on `http://localhost:3000` (or your configured PORT).

## 📖 API Documentation

Once the server is running, visit:
- **Swagger UI**: `http://localhost:3000/api-docs`
- **Health Check**: `http://localhost:3000/health`
- **API Status**: `http://localhost:3000/api/status`

## 🔒 Security Features

### Advanced Rate Limiting
The system implements multi-tier rate limiting for different scenarios:

#### General API Rate Limiting
- **General API**: 500 requests per second per IP (configurable for testing)
- **Swagger Documentation**: 500 requests per second per IP
- **Phone-specific Limits**: 500 requests per second per phone number

#### OTP-Specific Rate Limiting
- **OTP Send**: 500 requests per second per phone number/IP
- **OTP Verify**: 500 attempts per second per phone number
- **OTP Resend**: Intelligent resend logic with time-based restrictions
- **Phone OTP**: Per-phone-number rate limiting with dynamic limiter creation

#### Customer Management Rate Limiting
- **Customer Signup**: 500 attempts per second per IP
- **Customer Lookup**: Included in general API limits

### Input Validation & Sanitization
- **Phone Number Validation**: Comprehensive Bangladeshi phone number format validation
- **Email Validation**: RFC-compliant email format validation
- **Name Validation**: Letters and spaces only, length restrictions
- **Date Validation**: Proper birthdate format and range validation
- **XSS Prevention**: Input sanitization middleware for all requests
- **Content-Type Validation**: Enforced JSON content type for POST/PUT requests

### Security Headers & CORS
- **Helmet.js Integration**: Comprehensive security headers
- **Content Security Policy (CSP)**: Configured for API endpoints
- **CORS Configuration**: Flexible origin handling for development and production
- **Preflight Request Handling**: Proper OPTIONS request handling

### Data Integrity & Authentication
- **HMAC-based OTP**: Time-window based OTP generation with cryptographic security
- **Password Hashing**: bcrypt with 12 salt rounds for customer passwords
- **Data Integrity Checks**: HMAC verification for OTP data integrity
- **Redis Security**: Secure data storage with automatic expiry

### Error Handling & Logging
- **Structured Error Responses**: Consistent error format across all endpoints
- **Request Logging**: Comprehensive request logging with IP tracking
- **Sensitive Data Protection**: Automatic masking of passwords and OTPs in logs
- **Error Classification**: Different error types with appropriate HTTP status codes

## 📱 Phone Number Format Support

The API supports multiple Bangladeshi phone number formats:

- `+8801712345678` (International format)
- `8801712345678` (Country code format)
- `01712345678` (National format)
- `1712345678` (Mobile number only)

All formats are automatically normalized to international format (`+880XXXXXXXXX`).

## 🏪 Shopify Integration

### Customer Lookup
- Checks if customer exists by phone number using Admin API
- Returns customer data if found
- Indicates if new customer needs to sign up
- Supports both phone number and email lookup

### Customer Creation
- Creates customer in Shopify using Admin API
- Generates random password with secure hashing
- Stores additional data in Redis for persistence
- Supports custom fields (gender, birthdate) via metafields
- Handles validation errors and duplicate prevention

## 📨 SMS Integration (SSL Wireless)

### SMS Service Features
- **Real SMS Delivery**: Integration with SSL Wireless API for actual SMS sending
- **OTP SMS Templates**: Predefined templates for OTP delivery
- **Welcome SMS**: Customer account creation notifications
- **Phone Validation**: Bangladeshi phone number format validation
- **Error Handling**: Comprehensive error handling and retry logic
- **Development Mode**: Mock SMS sending for testing

### SMS Configuration
The SMS service requires SSL Wireless API credentials:
- **API Base URL**: SSL Wireless API endpoint
- **API Token**: 50-character authentication token
- **SID**: 20-character brand identifier
- **Timeout**: Configurable request timeout (default: 30 seconds)

### SMS Message Types
1. **OTP SMS**: `"Your OTP code is: {otp}. This code will expire in {minutes} minutes. Do not share this code with anyone."`
2. **Welcome SMS**: `"Welcome {name}! Your account has been created. Temporary password: {password}. Please change your password after first login."`

### SMS Service Methods
- `sendSingleSMS(smsData)` - Send custom SMS message
- `sendOTPSMS(phoneNumber, otp, expiryMinutes)` - Send OTP SMS
- `sendCustomerWelcomeSMS(phoneNumber, customerName, temporaryPassword)` - Send welcome SMS
- `validateMSISDN(msisdn)` - Validate phone number format
- `getServiceStatus()` - Check SMS service configuration

## 💾 Redis Data Structure

### OTP Storage
```
Key: otp:+8801712345678
Value: {
  otp: "123456",
  phoneNumber: "+8801712345678",
  timestamp: 1642248000000,
  expiryTime: 1642248600000,
  verificationHash: "...",
  expiryMinutes: 10
}
Expiry: 10 minutes
```

### Customer Data Storage
```
Key: customer:+8801712345678 | customer:email@example.com
Value: {
  customerId: "gid://shopify/Customer/123456789",
  phoneNumber: "+8801712345678",
  email: "email@example.com",
  name: "John Doe",
  hashedPassword: "...",
  gender: "male",
  birthdate: "1990-01-15",
  acceptsMarketing: true,
  createdAt: "2024-01-15T10:30:00.000Z"
}
Expiry: No expiry (persistent)
```

## 🧪 Testing the API

### Using the Demo Script
The project includes a comprehensive demo script for testing all functionality:

```bash
# Run full demo (all features)
npm run demo

# Run quick demo (basic functionality)
npm run demo:quick

# Test health endpoints only
npm run demo:health
```

### Manual API Testing

#### Send OTP
```bash
curl -X POST http://localhost:3000/api/otp/send \\
  -H "Content-Type: application/json" \\
  -d '{"phoneNumber": "+8801712345678"}'
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "data": {
    "phoneNumber": "+8801712345678",
    "customerExists": false,
    "needsSignup": true,
    "expiresIn": 600,
    "message": "OTP sent successfully. Customer needs to sign up."
  }
}
```

#### Verify OTP
```bash
curl -X POST http://localhost:3000/api/otp/verify \\
  -H "Content-Type: application/json" \\
  -d '{"phoneNumber": "+8801712345678", "otp": "123456"}'
```

**Response:**
```json
{
  "success": true,
  "message": "OTP verified successfully",
  "data": {
    "phoneNumber": "+8801712345678",
    "verified": true,
    "expired": false
  }
}
```

#### Customer Signup
```bash
curl -X POST http://localhost:3000/api/customer/signup \\
  -H "Content-Type: application/json" \\
  -d '{
    "phoneNumber": "+8801712345678",
    "name": "John Doe",
    "email": "john.doe@example.com",
    "gender": "male",
    "birthdate": "1990-01-15",
    "acceptsMarketing": true
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Customer account created successfully",
  "data": {
    "customerId": "gid://shopify/Customer/123456789",
    "phoneNumber": "+8801712345678",
    "email": "john.doe@example.com",
    "name": "John Doe",
    "temporaryPassword": "TempPass123!",
    "acceptsMarketing": true,
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

#### Check Customer Exists
```bash
curl -X GET "http://localhost:3000/api/customer/check-exists?phoneNumber=+8801712345678"
```

### Available Scripts
- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm test` - Run test script
- `npm run demo` - Run comprehensive demo
- `npm run demo:quick` - Run quick demo
- `npm run demo:health` - Test health endpoints only

## 🚨 Error Handling

The API provides comprehensive error handling with structured error responses:

```json
{
  "success": false,
  "message": "Validation error",
  "errors": [
    {
      "field": "phoneNumber",
      "message": "Invalid phone number format",
      "value": "invalid-phone"
    }
  ]
}
```

## 📝 Logging

The application includes comprehensive logging:
- Request logging with timestamps and IP addresses
- Error logging with stack traces (development mode)
- OTP generation logging (development mode only)
- Service connection status logging

## 🔧 Development

### Project Structure
```
otp-backend/
├── src/
│   ├── app.js                    # Main Express application with middleware setup
│   ├── config/
│   │   ├── database.js           # Redis connection and configuration
│   │   └── swagger.js            # Swagger/OpenAPI documentation setup
│   ├── controllers/
│   │   ├── otpController.js      # OTP management (send, verify, resend)
│   │   └── customerController.js # Customer management (signup, lookup)
│   ├── middlewares/
│   │   ├── rateLimiter.js        # Multi-tier rate limiting configurations
│   │   └── validation.js         # Input validation and sanitization
│   ├── routes/
│   │   ├── otpRoutes.js          # OTP API route definitions
│   │   └── customerRoutes.js     # Customer API route definitions
│   ├── services/
│   │   ├── shopifyService.js     # Shopify Admin/Storefront API integration
│   │   └── smsService.js         # SSL Wireless SMS API integration
│   └── utils/
│       ├── otpGenerator.js       # HMAC-based OTP generation and verification
│       ├── phoneValidator.js     # Bangladeshi phone number validation
│       └── smsUtils.js           # SMS utility functions
├── package.json                  # Dependencies and scripts
├── package-lock.json            # Dependency lock file
├── env.example                  # Environment variables template
├── SMS_ENV_VARIABLES.md         # SMS service configuration guide
├── demo.js                      # Demo script for testing
├── test.js                      # Test script
└── README.md                    # This documentation file
```

### Key Files Description

#### Core Application
- **`app.js`**: Main Express server with middleware, routes, error handling, and graceful shutdown
- **`package.json`**: Project dependencies including Express, Redis, Shopify, SMS, and security packages

#### Configuration
- **`config/database.js`**: Redis client setup with connection management
- **`config/swagger.js`**: OpenAPI/Swagger documentation configuration

#### Controllers (Business Logic)
- **`otpController.js`**: OTP lifecycle management (generation, verification, resending)
- **`customerController.js`**: Customer account management (creation, lookup, validation)

#### Services (External Integrations)
- **`shopifyService.js`**: Shopify Admin API integration for customer management
- **`smsService.js`**: SSL Wireless SMS API integration for OTP delivery

#### Utilities
- **`otpGenerator.js`**: HMAC-based OTP generation with cryptographic security
- **`phoneValidator.js`**: Bangladeshi phone number format validation
- **`smsUtils.js`**: SMS-related utility functions

#### Middleware
- **`rateLimiter.js`**: Multi-tier rate limiting (general, OTP-specific, phone-specific)
- **`validation.js`**: Input validation, sanitization, and error handling

### Adding New Features
1. Create utility functions in `utils/`
2. Add business logic in `controllers/`
3. Define routes in `routes/`
4. Add validation schemas in `middlewares/validation.js`
5. Update Swagger documentation

## 🐛 Troubleshooting

### Redis Connection Issues
```bash
# Check Redis status
sudo systemctl status redis-server

# Restart Redis
sudo systemctl restart redis-server

# Check Redis logs
sudo journalctl -u redis-server
```

### Shopify Connection Issues
- Verify your store domain format: `your-store.myshopify.com`
- Check Storefront API access token permissions
- Ensure token has customer read/write permissions

### Port Already in Use
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>
```

## 📄 License

ISC License - see LICENSE file for details.

## 👥 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For support and questions:
- Check the API documentation at `/api-docs`
- Review the logs for error details
- Check Redis and Shopify connectivity
- Verify environment configuration

## 📈 Project Status

### Current Version: 1.0.0

### Recent Updates
- ✅ **SMS Integration**: Complete SSL Wireless API integration for real SMS delivery
- ✅ **Advanced Rate Limiting**: Multi-tier rate limiting system with phone-specific limits
- ✅ **Enhanced Security**: Comprehensive input validation, XSS protection, and data integrity checks
- ✅ **Shopify Admin API**: Full customer management with Admin API integration
- ✅ **Comprehensive Logging**: Request tracking, error monitoring, and service status checks
- ✅ **Demo Scripts**: Multiple demo scripts for testing different scenarios
- ✅ **Documentation**: Complete API documentation with examples and troubleshooting

### Features Status
- 🔐 **OTP Generation & Verification**: ✅ Complete with HMAC security
- 📱 **Phone Validation**: ✅ Bangladeshi phone number support with multiple formats
- 📨 **SMS Delivery**: ✅ Real SMS sending via SSL Wireless API
- 🏪 **Shopify Integration**: ✅ Customer lookup and creation via Admin API
- 💾 **Redis Storage**: ✅ OTP and customer data persistence
- 🛡️ **Rate Limiting**: ✅ Multi-tier protection system
- 📚 **API Documentation**: ✅ Swagger/OpenAPI documentation
- 🔒 **Security**: ✅ Comprehensive security measures
- 🧪 **Testing**: ✅ Demo scripts and manual testing guides

### Dependencies
- **Express.js**: ^5.1.0
- **Redis**: ^4.7.0
- **Axios**: ^1.7.7
- **bcrypt**: ^5.1.1
- **Joi**: ^17.13.3
- **Helmet**: ^8.0.0
- **Winston**: ^3.17.0
- **Swagger**: ^6.2.8 & ^5.0.1

### Environment Support
- **Node.js**: 14.x+
- **Redis**: 6.x+
- **Platforms**: Linux, macOS, Windows
