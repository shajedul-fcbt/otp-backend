# Express OTP Backend

A comprehensive OTP (One-Time Password) authentication backend built with Express.js, featuring Shopify integration and Redis caching.

## 🚀 Features

- **🔐 HMAC-based OTP Generation**: Secure 6-digit OTP generation using HMAC algorithm
- **📱 Bangladeshi Phone Number Validation**: Complete validation for BD phone numbers
- **🏪 Shopify Storefront API Integration**: Customer lookup and creation
- **💾 Redis In-Memory Storage**: Fast OTP storage with automatic expiry
- **🛡️ Rate Limiting**: Comprehensive rate limiting to prevent abuse
- **📚 Swagger Documentation**: Interactive API documentation
- **🌐 CORS Support**: Public API endpoints with proper CORS handling
- **✅ Input Validation**: Robust request validation using Joi
- **🔒 Security**: Helmet for security headers, input sanitization

## 📋 API Endpoints

### OTP Management
- `POST /api/otp/send` - Send OTP to phone number
- `POST /api/otp/verify` - Verify OTP
- `GET /api/otp/status` - Check OTP status
- `POST /api/otp/resend` - Resend OTP

### Customer Management
- `POST /api/customer/signup` - Create new customer
- `GET /api/customer/:identifier` - Get customer info
- `GET /api/customer/check-exists` - Check if customer exists
- `PUT /api/customer/update-password` - Update customer password

### System
- `GET /health` - Health check
- `GET /api/status` - Service status
- `GET /api-docs` - Swagger documentation

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd express-otp-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   # Copy the example file
   cp env.example .env
   
   # Edit .env with your configuration
   nano .env
   ```

4. **Set up Redis**
   ```bash
   # Install Redis (Ubuntu/Debian)
   sudo apt update
   sudo apt install redis-server
   
   # Start Redis
   sudo systemctl start redis-server
   sudo systemctl enable redis-server
   ```

5. **Configure Shopify**
   - Create a Shopify Storefront API access token
   - Add your store domain and access token to `.env`

## ⚙️ Environment Configuration

Create a `.env` file with the following variables:

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
SHOPIFY_STOREFRONT_ACCESS_TOKEN=your_storefront_access_token

# OTP Configuration
OTP_SECRET_KEY=your_secret_key_for_hmac_generation
OTP_EXPIRY_MINUTES=10

# Rate Limiting
RATE_LIMIT_WINDOW_MINUTES=15
RATE_LIMIT_MAX_REQUESTS=100

# Security
CORS_ORIGIN=*
```

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

### Rate Limiting
- **General API**: 100 requests per 15 minutes per IP
- **OTP Send**: 3 requests per 5 minutes per IP/phone
- **OTP Verify**: 5 attempts per 5 minutes per phone
- **Customer Signup**: 2 attempts per 10 minutes per IP
- **Phone-specific OTP**: 1 OTP per minute per phone number

### Input Validation
- Bangladeshi phone number validation
- Email format validation
- Name validation (letters and spaces only)
- Date validation for birthdate
- XSS prevention through input sanitization

### Security Headers
- Helmet.js for security headers
- CORS configuration for public API access
- Content Security Policy (CSP)

## 📱 Phone Number Format Support

The API supports multiple Bangladeshi phone number formats:

- `+8801712345678` (International format)
- `8801712345678` (Country code format)
- `01712345678` (National format)
- `1712345678` (Mobile number only)

All formats are automatically normalized to international format (`+880XXXXXXXXX`).

## 🏪 Shopify Integration

### Customer Lookup
- Checks if customer exists by phone number
- Returns customer data if found
- Indicates if new customer needs to sign up

### Customer Creation
- Creates customer in Shopify
- Generates random password
- Stores additional data in Redis
- Supports custom fields (gender, birthdate)

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

### Send OTP
```bash
curl -X POST http://localhost:3000/api/otp/send \\
  -H "Content-Type: application/json" \\
  -d '{"phoneNumber": "+8801712345678"}'
```

### Verify OTP
```bash
curl -X POST http://localhost:3000/api/otp/verify \\
  -H "Content-Type: application/json" \\
  -d '{"phoneNumber": "+8801712345678", "otp": "123456"}'
```

### Customer Signup
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
src/
├── app.js                 # Main application file
├── config/
│   ├── database.js        # Redis configuration
│   └── swagger.js         # Swagger documentation setup
├── controllers/
│   ├── otpController.js   # OTP management logic
│   └── customerController.js # Customer management logic
├── middlewares/
│   ├── rateLimiter.js     # Rate limiting configurations
│   └── validation.js      # Input validation middleware
├── routes/
│   ├── otpRoutes.js       # OTP route definitions
│   └── customerRoutes.js  # Customer route definitions
├── services/
│   └── shopifyService.js  # Shopify API integration
└── utils/
    ├── phoneValidator.js  # Phone number validation utility
    └── otpGenerator.js    # OTP generation and verification
```

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
