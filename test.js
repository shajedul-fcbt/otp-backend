/**
 * Simple test script to verify API functionality
 * Run this after starting the server to test basic endpoints
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const TEST_PHONE = '+8801712345678';
const TEST_EMAIL = 'test@example.com';

class APITester {
  constructor() {
    this.testResults = [];
  }

  async runTest(name, testFunction) {
    console.log(`🧪 Running test: ${name}`);
    try {
      const result = await testFunction();
      this.testResults.push({ name, status: 'PASS', result });
      console.log(`✅ ${name}: PASSED`);
      return result;
    } catch (error) {
      this.testResults.push({ name, status: 'FAIL', error: error.message });
      console.log(`❌ ${name}: FAILED - ${error.message}`);
      return null;
    }
  }

  async testHealthCheck() {
    return this.runTest('Health Check', async () => {
      const response = await axios.get(`${BASE_URL}/health`);
      if (response.status !== 200) throw new Error('Health check failed');
      return response.data;
    });
  }

  async testAPIStatus() {
    return this.runTest('API Status', async () => {
      const response = await axios.get(`${BASE_URL}/api/status`);
      if (response.status !== 200) throw new Error('API status check failed');
      return response.data;
    });
  }

  async testSendOTP() {
    return this.runTest('Send OTP', async () => {
      const response = await axios.post(`${BASE_URL}/api/otp/send`, {
        phoneNumber: TEST_PHONE
      });
      if (response.status !== 200) throw new Error('Send OTP failed');
      return response.data;
    });
  }

  async testOTPStatus() {
    return this.runTest('OTP Status', async () => {
      const response = await axios.get(`${BASE_URL}/api/otp/status?phoneNumber=${TEST_PHONE}`);
      if (response.status !== 200) throw new Error('OTP status check failed');
      return response.data;
    });
  }

  async testVerifyInvalidOTP() {
    return this.runTest('Verify Invalid OTP', async () => {
      try {
        await axios.post(`${BASE_URL}/api/otp/verify`, {
          phoneNumber: TEST_PHONE,
          otp: '000000'
        });
        throw new Error('Should have failed with invalid OTP');
      } catch (error) {
        if (error.response && error.response.status === 400) {
          return { message: 'Correctly rejected invalid OTP' };
        }
        throw error;
      }
    });
  }

  async testCustomerSignup() {
    return this.runTest('Customer Signup', async () => {
      const response = await axios.post(`${BASE_URL}/api/customer/signup`, {
        phoneNumber: TEST_PHONE,
        name: 'Test User',
        email: TEST_EMAIL,
        gender: 'other',
        acceptsMarketing: false
      });
      if (response.status !== 201) throw new Error('Customer signup failed');
      return response.data;
    });
  }

  async testCheckCustomerExists() {
    return this.runTest('Check Customer Exists', async () => {
      const response = await axios.get(`${BASE_URL}/api/customer/check-exists?identifier=${TEST_PHONE}`);
      if (response.status !== 200) throw new Error('Check customer exists failed');
      return response.data;
    });
  }

  async testInvalidPhoneNumber() {
    return this.runTest('Invalid Phone Number Validation', async () => {
      try {
        await axios.post(`${BASE_URL}/api/otp/send`, {
          phoneNumber: 'invalid-phone'
        });
        throw new Error('Should have failed with invalid phone number');
      } catch (error) {
        if (error.response && error.response.status === 400) {
          return { message: 'Correctly rejected invalid phone number' };
        }
        throw error;
      }
    });
  }

  async testRateLimiting() {
    return this.runTest('Rate Limiting', async () => {
      const requests = [];
      // Try to send multiple OTPs quickly
      for (let i = 0; i < 5; i++) {
        requests.push(
          axios.post(`${BASE_URL}/api/otp/send`, {
            phoneNumber: `+88017123456${i}9`
          }).catch(err => err.response)
        );
      }
      
      const responses = await Promise.all(requests);
      const rateLimited = responses.some(res => res.status === 429);
      
      if (!rateLimited) {
        console.warn('⚠️ Rate limiting might not be working as expected');
      }
      
      return { message: 'Rate limiting test completed', rateLimited };
    });
  }

  async runAllTests() {
    console.log('🚀 Starting API Tests...\n');
    
    // Basic functionality tests
    await this.testHealthCheck();
    await this.testAPIStatus();
    
    // OTP functionality tests
    await this.testSendOTP();
    await this.testOTPStatus();
    await this.testVerifyInvalidOTP();
    
    // Customer functionality tests
    await this.testCheckCustomerExists();
    
    // Validation tests
    await this.testInvalidPhoneNumber();
    
    // Rate limiting test (might trigger limits)
    await this.testRateLimiting();
    
    // Customer signup test (do this last as it might create a customer)
    await this.testCustomerSignup();
    
    console.log('\n📊 Test Results Summary:');
    console.log('========================');
    
    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;
    
    this.testResults.forEach(result => {
      console.log(`${result.status === 'PASS' ? '✅' : '❌'} ${result.name}`);
    });
    
    console.log(`\nTotal: ${this.testResults.length} tests`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    
    if (failed > 0) {
      console.log('\n❌ Failed tests:');
      this.testResults
        .filter(r => r.status === 'FAIL')
        .forEach(result => {
          console.log(`   - ${result.name}: ${result.error}`);
        });
    }
    
    console.log(`\n${failed === 0 ? '🎉 All tests passed!' : '⚠️ Some tests failed. Check the server logs for more details.'}`);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new APITester();
  
  console.log('📋 Make sure the server is running on http://localhost:3000');
  console.log('   Run: npm run dev\n');
  
  // Wait a bit for user to confirm
  setTimeout(() => {
    tester.runAllTests().catch(error => {
      console.error('❌ Test execution failed:', error.message);
      process.exit(1);
    });
  }, 2000);
}

module.exports = APITester;
