/**
 * Demo script showing how to use the OTP Authentication API
 * This script demonstrates the complete flow of OTP authentication and customer signup
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

class OTPDemo {
  constructor() {
    this.demoPhoneNumber = '+8801712345678';
    this.demoEmail = 'demo@example.com';
    this.generatedOTP = null;
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async makeRequest(method, url, data = null) {
    try {
      const config = {
        method,
        url: `${BASE_URL}${url}`,
        headers: {
          'Content-Type': 'application/json'
        }
      };
      
      if (data) {
        config.data = data;
      }
      
      const response = await axios(config);
      return response.data;
    } catch (error) {
      if (error.response) {
        return error.response.data;
      }
      throw error;
    }
  }

  async step1_CheckHealth() {
    console.log('\n🔍 Step 1: Checking API Health...');
    const health = await this.makeRequest('GET', '/health');
    console.log('Health Status:', health.message);
    
    const status = await this.makeRequest('GET', '/api/status');
    console.log('Redis Status:', status.services?.redis?.status || 'unknown');
    console.log('Shopify Status:', status.services?.shopify?.status || 'unknown');
  }

  async step2_SendOTP() {
    console.log('\n📱 Step 2: Sending OTP...');
    console.log(`Phone Number: ${this.demoPhoneNumber}`);
    
    const result = await this.makeRequest('POST', '/api/otp/send', {
      phoneNumber: this.demoPhoneNumber
    });
    
    if (result.success) {
      console.log('✅ OTP sent successfully!');
      console.log('Customer exists:', result.data.customerExists);
      console.log('Needs signup:', result.data.needsSignup);
      console.log('Expires in:', result.data.expiresIn, 'seconds');
      
      // In development mode, the OTP is logged to console
      // In production, you would receive it via SMS
      console.log('\n📋 Check the server console for the generated OTP (development mode)');
    } else {
      console.log('❌ Failed to send OTP:', result.message);
      return false;
    }
    
    return true;
  }

  async step3_CheckOTPStatus() {
    console.log('\n⏰ Step 3: Checking OTP Status...');
    
    const result = await this.makeRequest('GET', `/api/otp/status?phoneNumber=${this.demoPhoneNumber}`);
    
    if (result.success) {
      console.log('✅ OTP Status retrieved');
      console.log('Has active OTP:', result.data.hasActiveOTP);
      console.log('Remaining time:', result.data.remainingTimeSeconds, 'seconds');
    } else {
      console.log('❌ No active OTP found');
    }
  }

  async step4_VerifyOTP() {
    console.log('\n🔐 Step 4: Verifying OTP...');
    
    // For demo purposes, we'll ask the user to enter the OTP
    console.log('📋 Please check the server console for the generated OTP');
    console.log('💡 In a real application, this would be entered by the user from SMS');
    
    // Simulate OTP verification with a common test OTP
    const testOTP = '123456'; // This won't work unless it matches the generated OTP
    
    console.log(`Attempting to verify OTP: ${testOTP}`);
    
    const result = await this.makeRequest('POST', '/api/otp/verify', {
      phoneNumber: this.demoPhoneNumber,
      otp: testOTP
    });
    
    if (result.success) {
      console.log('✅ OTP verified successfully!');
      return true;
    } else {
      console.log('❌ OTP verification failed:', result.message);
      console.log('💡 This is expected unless the OTP matches the generated one');
      return false;
    }
  }

  async step5_CustomerSignup() {
    console.log('\n👤 Step 5: Customer Signup...');
    
    const customerData = {
      phoneNumber: this.demoPhoneNumber,
      name: 'Demo User',
      email: this.demoEmail,
      gender: 'other',
      birthdate: '1990-01-15',
      acceptsMarketing: false
    };
    
    console.log('Creating customer with data:', JSON.stringify(customerData, null, 2));
    
    const result = await this.makeRequest('POST', '/api/customer/signup', customerData);
    
    if (result.success) {
      console.log('✅ Customer created successfully!');
      console.log('Customer ID:', result.data.customerId);
      console.log('Temporary Password:', result.data.temporaryPassword);
      console.log('💡 Password is stored securely and can be changed later');
    } else {
      console.log('❌ Customer signup failed:', result.message);
      if (result.message.includes('already exists')) {
        console.log('💡 This is expected if running the demo multiple times');
      }
    }
  }

  async step6_CheckCustomerExists() {
    console.log('\n🔍 Step 6: Checking if Customer Exists...');
    
    const result = await this.makeRequest('GET', `/api/customer/check-exists?identifier=${this.demoPhoneNumber}`);
    
    if (result.success) {
      console.log('Customer exists:', result.data.customerExists);
      console.log('Data source:', result.data.source);
    }
  }

  async step7_GetCustomerInfo() {
    console.log('\n📋 Step 7: Getting Customer Information...');
    
    const result = await this.makeRequest('GET', `/api/customer/${this.demoPhoneNumber}`);
    
    if (result.success) {
      console.log('✅ Customer info retrieved:');
      console.log('Name:', result.data.name);
      console.log('Email:', result.data.email);
      console.log('Phone:', result.data.phoneNumber);
      console.log('Accepts Marketing:', result.data.acceptsMarketing);
    } else {
      console.log('❌ Customer not found:', result.message);
    }
  }

  async step8_RateLimitingDemo() {
    console.log('\n🚦 Step 8: Demonstrating Rate Limiting...');
    
    console.log('Sending multiple OTP requests quickly...');
    
    const requests = [];
    for (let i = 0; i < 3; i++) {
      requests.push(
        this.makeRequest('POST', '/api/otp/send', {
          phoneNumber: `+88017234567${i}8`
        })
      );
    }
    
    const results = await Promise.all(requests);
    
    let rateLimited = false;
    results.forEach((result, index) => {
      if (result.message && result.message.includes('Too many')) {
        console.log(`Request ${index + 1}: Rate limited ✅`);
        rateLimited = true;
      } else {
        console.log(`Request ${index + 1}: Success`);
      }
    });
    
    if (rateLimited) {
      console.log('✅ Rate limiting is working correctly!');
    } else {
      console.log('⚠️ Rate limiting might not be triggered yet');
    }
  }

  async runCompleteDemo() {
    console.log('🚀 OTP Authentication API Demo');
    console.log('==============================');
    console.log('This demo shows the complete flow of the OTP authentication system');
    console.log(`Demo phone number: ${this.demoPhoneNumber}`);
    console.log(`Demo email: ${this.demoEmail}`);
    
    try {
      await this.step1_CheckHealth();
      await this.delay(1000);
      
      const otpSent = await this.step2_SendOTP();
      await this.delay(1000);
      
      if (otpSent) {
        await this.step3_CheckOTPStatus();
        await this.delay(1000);
        
        await this.step4_VerifyOTP();
        await this.delay(1000);
      }
      
      await this.step5_CustomerSignup();
      await this.delay(1000);
      
      await this.step6_CheckCustomerExists();
      await this.delay(1000);
      
      await this.step7_GetCustomerInfo();
      await this.delay(1000);
      
      await this.step8_RateLimitingDemo();
      
      console.log('\n🎉 Demo completed!');
      console.log('\n📚 Next steps:');
      console.log('1. Visit http://localhost:3000/api-docs for full API documentation');
      console.log('2. Check the server logs to see the generated OTP');
      console.log('3. Try the API endpoints with your own data');
      console.log('4. Configure Redis and Shopify for production use');
      
    } catch (error) {
      console.error('\n❌ Demo failed:', error.message);
      console.log('\n🔧 Troubleshooting:');
      console.log('1. Make sure the server is running: npm run dev');
      console.log('2. Check Redis is running: redis-cli ping');
      console.log('3. Verify the .env configuration');
    }
  }
}

// Quick test functions
async function quickHealthCheck() {
  console.log('🏥 Quick Health Check...');
  try {
    const response = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Server is healthy!');
    console.log('📍 API Documentation: http://localhost:3000/api-docs');
    return true;
  } catch (error) {
    console.log('❌ Server is not running or not accessible');
    console.log('💡 Run: npm run dev');
    return false;
  }
}

async function quickOTPTest() {
  console.log('\n📱 Quick OTP Test...');
  try {
    const result = await axios.post(`${BASE_URL}/api/otp/send`, {
      phoneNumber: '+8801712345678'
    });
    console.log('✅ OTP API is working!');
    console.log('Message:', result.data.message);
    return true;
  } catch (error) {
    console.log('❌ OTP API failed');
    console.log('Error:', error.response?.data?.message || error.message);
    return false;
  }
}

// Run based on command line arguments
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--health')) {
    quickHealthCheck();
  } else if (args.includes('--otp')) {
    quickOTPTest();
  } else if (args.includes('--quick')) {
    (async () => {
      const healthy = await quickHealthCheck();
      if (healthy) {
        await quickOTPTest();
      }
    })();
  } else {
    console.log('🎬 Starting complete demo in 3 seconds...');
    console.log('💡 Use --health for quick health check, --otp for OTP test, --quick for both');
    console.log('📋 Make sure the server is running: npm run dev\n');
    
    setTimeout(() => {
      const demo = new OTPDemo();
      demo.runCompleteDemo();
    }, 3000);
  }
}

module.exports = OTPDemo;
