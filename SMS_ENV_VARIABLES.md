# SMS Service Environment Variables

Add these environment variables to your `.env` file for SMS functionality:

## Required SMS Environment Variables

```bash
# =================================
# SMS SERVICE CONFIGURATION (SSL Wireless)
# =================================

# SMS API Base URL (provided by SSL Wireless)
SMS_API_BASE_URL=https://your-sms-api-domain.com

# SMS API Token (50 characters alphanumeric - provided by SSL for authentication)
SMS_API_TOKEN=your_api_token_from_ssl_wireless_50_chars

# SMS SID (20 characters alphanumeric - unique ID for specific brand/masking name)  
SMS_SID=your_brand_sid_from_ssl

# Optional SMS Service Settings
SMS_ENABLED=true
SMS_TIMEOUT_MS=30000
MOCK_SMS_SENDING=false
```

## Environment Variable Details

### SMS_API_BASE_URL
- **Description**: Base URL for the SSL Wireless SMS API
- **Type**: String (URL)
- **Example**: `https://api.sslwireless.com` 
- **Provided by**: SSL Wireless

### SMS_API_TOKEN  
- **Description**: Authentication token for the SMS API
- **Type**: Alphanumeric string
- **Length**: 50 characters
- **Example**: `1279-98d2bb25-3f7e-49bf-a1e2-5d1a6c6c588f`
- **Provided by**: SSL Wireless for authentication

### SMS_SID
- **Description**: Unique identifier for your specific brand/masking name
- **Type**: Alphanumeric string  
- **Length**: 20 characters
- **Example**: `ENGINEERING`
- **Provided by**: SSL Wireless for your brand

### Optional Variables

- **SMS_ENABLED**: Enable/disable SMS sending (default: true)
- **SMS_TIMEOUT_MS**: API request timeout in milliseconds (default: 30000)
- **MOCK_SMS_SENDING**: For development - set to true to skip actual SMS sending (default: false)

## Development Setup

1. Copy these variables to your `.env` file
2. Replace the placeholder values with actual credentials from SSL Wireless
3. Set `MOCK_SMS_SENDING=true` for development to test without sending real SMS
4. Restart your server after adding the environment variables
