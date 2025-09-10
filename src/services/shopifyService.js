const axios = require('axios');
require('dotenv').config();

class ShopifyService {
  constructor() {
    this.storeDomain = process.env.SHOPIFY_STORE_DOMAIN;
    this.storefrontAccessToken = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;
    this.adminAccessToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
    
    // API URLs
    this.storefrontApiUrl = `https://${this.storeDomain}/api/2024-10/graphql.json`;
    this.adminApiUrl = `https://${this.storeDomain}/admin/api/2024-10/graphql.json`;
    this.adminRestApiUrl = `https://${this.storeDomain}/admin/api/2024-10`;

    if (!this.storeDomain) {
      console.warn('⚠️ SHOPIFY_STORE_DOMAIN is missing in environment variables.');
    }
    if (!this.storefrontAccessToken && !this.adminAccessToken) {
      console.warn('⚠️ Either SHOPIFY_STOREFRONT_ACCESS_TOKEN or SHOPIFY_ADMIN_ACCESS_TOKEN is required.');
    }
  }

  /**
   * Checks if a customer exists in Shopify by phone number
   * @param {string} phoneNumber - Customer's phone number in international format
   * @returns {object} - Customer existence check result
   */
  async checkCustomerExists(phoneNumber) {
    try {
      if (!this.storeDomain) {
        return {
          exists: false,
          customer: null,
          error: 'Shopify store domain not configured'
        };
      }

      // Try Admin API first if available
      if (this.adminAccessToken) {
        return await this.checkCustomerWithAdminAPI(phoneNumber);
      }

      // Fallback: Assume customer doesn't exist
      console.warn('⚠️ Admin API access token not configured');
      console.warn('⚠️ Cannot verify customer existence - assuming new customer');
      
      return {
        exists: false,
        customer: null,
        error: 'Admin API not configured - assuming new customer'
      };

    } catch (error) {
      console.error('Error checking customer existence:', error.message);
      
      return {
        exists: false,
        customer: null,
        error: 'Error occurred while checking customer existence'
      };
    }
  }

  /**
   * Check customer using Admin API (preferred method)
   * @param {string} phoneNumber - Customer's phone number
   * @returns {object} - Customer existence result
   */
  async checkCustomerWithAdminAPI(phoneNumber) {
    try {
      // Use REST API to search customers by phone
      // GraphQL Admin API also works but REST is simpler for this use case
      const searchUrl = `${this.adminRestApiUrl}/customers.json?phone=${encodeURIComponent(phoneNumber)}&limit=1`;

      console.log('searchUrl', searchUrl);
      
      const response = await axios.get(searchUrl, {
        headers: {
          'X-Shopify-Access-Token': this.adminAccessToken,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      if (response.data && response.data.customers && response.data.customers.length > 0) {
        const customer = response.data.customers[0];
        return {
          exists: true,
          customer: {
            id: `gid://shopify/Customer/${customer.id}`,
            email: customer.email,
            phone: customer.phone,
            firstName: customer.first_name,
            lastName: customer.last_name,
            acceptsMarketing: customer.accepts_marketing,
            createdAt: customer.created_at,
            updatedAt: customer.updated_at
          },
          error: null
        };
      }

      return {
        exists: false,
        customer: null,
        error: null
      };

    } catch (error) {
      console.error('Admin API customer check failed:', error.message);
      
      if (error.response?.status === 401) {
        return {
          exists: false,
          customer: null,
          error: 'Invalid Admin API access token'
        };
      }
      
      if (error.response?.status === 402) {
        return {
          exists: false,
          customer: null,
          error: 'Shopify store payment required'
        };
      }
      
      return {
        exists: false,
        customer: null,
        error: 'Admin API request failed'
      };
    }
  }

  /**
   * Creates a new customer in Shopify
   * @param {object} customerData - Customer information
   * @returns {object} - Customer creation result
   */
  async createCustomer(customerData) {
    try {
      if (!this.storeDomain) {
        return {
          success: false,
          customer: null,
          error: 'Shopify store domain not configured'
        };
      }

      // Try Admin API first if available
      if (this.adminAccessToken) {
        return await this.createCustomerWithAdminAPI(customerData);
      }

      // Try Storefront API as fallback (limited functionality)
      if (this.storefrontAccessToken) {
        return await this.createCustomerWithStorefrontAPI(customerData);
      }

      return {
        success: false,
        customer: null,
        error: 'No Shopify API access tokens configured'
      };

    } catch (error) {
      console.error('Error creating customer:', error.message);
      
      return {
        success: false,
        customer: null,
        error: 'Error occurred while creating customer'
      };
    }
  }

  /**
   * Create customer using Admin API (preferred method)
   * @param {object} customerData - Customer information
   * @returns {object} - Customer creation result
   */
  async createCustomerWithAdminAPI(customerData) {
    try {
      const { phoneNumber, name, email, password, gender, birthdate, acceptsMarketing } = customerData;

      // Split name into first and last name
      const nameParts = name.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

      // Prepare customer data for Admin API
      const customerPayload = {
        customer: {
          first_name: firstName,
          last_name: lastName,
          email: email,
          phone: phoneNumber,
          password: password,
          password_confirmation: password,
          accepts_marketing: acceptsMarketing || false,
          send_email_welcome: false, // Don't send welcome email
          verified_email: true
        }
      };

      // Add metafields for additional data
      if (gender || birthdate) {
        customerPayload.customer.metafields = [];
        
        if (gender) {
          customerPayload.customer.metafields.push({
            namespace: 'custom',
            key: 'gender',
            value: gender,
            type: 'single_line_text_field'
          });
        }
        
        if (birthdate) {
          customerPayload.customer.metafields.push({
            namespace: 'custom',
            key: 'birthdate',
            value: birthdate,
            type: 'date'
          });
        }
      }

      const response = await axios.post(
        `${this.adminRestApiUrl}/customers.json`,
        customerPayload,
        {
          headers: {
            'X-Shopify-Access-Token': this.adminAccessToken,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      if (response.data && response.data.customer) {
        const customer = response.data.customer;
        return {
          success: true,
          customer: {
            id: `gid://shopify/Customer/${customer.id}`,
            email: customer.email,
            phone: customer.phone,
            firstName: customer.first_name,
            lastName: customer.last_name,
            acceptsMarketing: customer.accepts_marketing,
            createdAt: customer.created_at
          },
          error: null
        };
      }

      return {
        success: false,
        customer: null,
        error: 'Failed to create customer'
      };

    } catch (error) {
      console.error('Admin API customer creation failed:', error.message);
      
      if (error.response?.status === 401) {
        return {
          success: false,
          customer: null,
          error: 'Invalid Admin API access token'
        };
      }
      
      if (error.response?.status === 422) {
        const errors = error.response.data?.errors || {};
        const errorMessages = Object.entries(errors)
          .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
          .join('; ');
        
        return {
          success: false,
          customer: null,
          error: errorMessages || 'Validation errors occurred'
        };
      }
      
      return {
        success: false,
        customer: null,
        error: 'Admin API request failed'
      };
    }
  }

  /**
   * Create customer using Storefront API (fallback method with limitations)
   * @param {object} customerData - Customer information
   * @returns {object} - Customer creation result
   */
  async createCustomerWithStorefrontAPI(customerData) {
    // Storefront API customer creation is very limited
    // It doesn't support phone numbers or custom fields
    console.warn('⚠️ Using Storefront API for customer creation - limited functionality');
    
    return {
      success: false,
      customer: null,
      error: 'Storefront API does not support full customer creation - use Admin API'
    };
  }

  /**
   * Retrieves customer information by ID
   * @param {string} customerId - Shopify customer ID
   * @returns {object} - Customer data
   */
  async getCustomerById(customerId) {
    try {
      if (!this.storeDomain || !this.storefrontAccessToken) {
        return {
          success: false,
          customer: null,
          error: 'Shopify configuration not found'
        };
      }

      const query = `
        query getCustomer($id: ID!) {
          customer(id: $id) {
            id
            email
            phone
            firstName
            lastName
            acceptsMarketing
            createdAt
            updatedAt
          }
        }
      `;

      const variables = {
        id: customerId
      };

      const response = await axios.post(
        this.storefrontApiUrl,
        {
          query: query,
          variables: variables
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Storefront-Access-Token': this.storefrontAccessToken
          },
          timeout: 10000
        }
      );

      if (response.data.errors) {
        console.error('Shopify GraphQL errors:', response.data.errors);
        return {
          success: false,
          customer: null,
          error: 'Error retrieving customer data'
        };
      }

      const customer = response.data.data.customer;
      
      return {
        success: true,
        customer: customer,
        error: null
      };

    } catch (error) {
      console.error('Error retrieving customer:', error.message);
      return {
        success: false,
        customer: null,
        error: 'Error occurred while retrieving customer'
      };
    }
  }

  /**
   * Validates Shopify configuration
   * @returns {object} - Configuration validation result
   */
  validateConfiguration() {
    const missingConfigs = [];
    
    if (!this.storeDomain) {
      missingConfigs.push('SHOPIFY_STORE_DOMAIN');
    }
    
    if (!this.adminAccessToken && !this.storefrontAccessToken) {
      missingConfigs.push('SHOPIFY_ADMIN_ACCESS_TOKEN or SHOPIFY_STOREFRONT_ACCESS_TOKEN');
    }
    
    return {
      isValid: missingConfigs.length === 0,
      missingConfigs: missingConfigs,
      message: missingConfigs.length > 0 
        ? `Missing configurations: ${missingConfigs.join(', ')}` 
        : 'Shopify configuration is valid'
    };
  }

  /**
   * Tests the connection to Shopify
   * @returns {object} - Connection test result
   */
  async testConnection() {
    try {
      if (!this.storeDomain) {
        return {
          success: false,
          message: 'Shopify store domain not configured'
        };
      }

      // Test Admin API first if available
      if (this.adminAccessToken) {
        return await this.testAdminAPIConnection();
      }

      // Test Storefront API as fallback
      if (this.storefrontAccessToken) {
        return await this.testStorefrontAPIConnection();
      }

      return {
        success: false,
        message: 'No Shopify API access tokens configured'
      };

    } catch (error) {
      console.error('Shopify connection test failed:', error.message);
      return {
        success: false,
        message: 'Failed to connect to Shopify'
      };
    }
  }

  /**
   * Test Admin API connection
   * @returns {object} - Connection test result
   */
  async testAdminAPIConnection() {
    try {
      const response = await axios.get(
        `${this.adminRestApiUrl}/shop.json`,
        {
          headers: {
            'X-Shopify-Access-Token': this.adminAccessToken,
            'Content-Type': 'application/json'
          },
          timeout: 5000
        }
      );

      if (response.data && response.data.shop) {
        return {
          success: true,
          message: 'Admin API connection successful',
          api: 'Admin API',
          shop: {
            name: response.data.shop.name,
            domain: response.data.shop.domain
          }
        };
      }

      return {
        success: false,
        message: 'Invalid Admin API response'
      };

    } catch (error) {
      if (error.response?.status === 401) {
        return {
          success: false,
          message: 'Invalid Admin API access token'
        };
      }

      return {
        success: false,
        message: 'Admin API connection failed'
      };
    }
  }

  /**
   * Test Storefront API connection
   * @returns {object} - Connection test result
   */
  async testStorefrontAPIConnection() {
    try {
      const query = `
        query {
          shop {
            name
            primaryDomain {
              host
            }
          }
        }
      `;

      const response = await axios.post(
        this.storefrontApiUrl,
        { query: query },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Storefront-Access-Token': this.storefrontAccessToken
          },
          timeout: 5000
        }
      );

      if (response.data.errors) {
        return {
          success: false,
          message: 'Invalid Storefront API credentials or access token'
        };
      }

      return {
        success: true,
        message: 'Storefront API connection successful',
        api: 'Storefront API',
        shop: response.data.data.shop
      };

    } catch (error) {
      return {
        success: false,
        message: 'Storefront API connection failed'
      };
    }
  }
}

module.exports = new ShopifyService();
