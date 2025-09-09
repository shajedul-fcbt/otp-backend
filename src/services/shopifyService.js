const axios = require('axios');
require('dotenv').config();

class ShopifyService {
  constructor() {
    this.storeDomain = process.env.SHOPIFY_STORE_DOMAIN;
    this.storefrontAccessToken = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;
    this.storefrontApiUrl = `https://${this.storeDomain}/api/2025-07/graphql.json`;

    
    if (!this.storeDomain || !this.storefrontAccessToken) {
      console.warn('⚠️ Shopify configuration missing. Please set SHOPIFY_STORE_DOMAIN and SHOPIFY_STOREFRONT_ACCESS_TOKEN in environment variables.');
    }
  }

  /**
   * Checks if a customer exists in Shopify by phone number
   * @param {string} phoneNumber - Customer's phone number in international format
   * @returns {object} - Customer existence check result
   */
  async checkCustomerExists(phoneNumber) {
    try {
      if (!this.storeDomain || !this.storefrontAccessToken) {
        return {
          exists: false,
          customer: null,
          error: 'Shopify configuration not found'
        };
      }

      // NOTE: Shopify Storefront API has limitations
      // The 'customers' field is not available in Storefront API for security reasons
      // This is only available in the Admin API
      
      console.warn('⚠️ Storefront API limitation: Customer lookup by phone not supported');
      console.warn('⚠️ For production, consider using Admin API or local customer database');
      
      // For now, we'll assume customer doesn't exist and they need to sign up
      // In a real implementation, you would:
      // 1. Use Admin API with proper permissions
      // 2. Store customer data in your own database
      // 3. Use email-based customer authentication instead
      
      return {
        exists: false,
        customer: null,
        error: 'Customer lookup not supported in Storefront API - assuming new customer'
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
   * Creates a new customer in Shopify
   * @param {object} customerData - Customer information
   * @returns {object} - Customer creation result
   */
  async createCustomer(customerData) {
    try {
      if (!this.storeDomain || !this.storefrontAccessToken) {
        return {
          success: false,
          customer: null,
          error: 'Shopify configuration not found'
        };
      }

      const { phoneNumber, name, email, password, gender, birthdate, acceptsMarketing } = customerData;

      // Split name into first and last name
      const nameParts = name.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

      const mutation = `
        mutation customerCreate($input: CustomerCreateInput!) {
          customerCreate(input: $input) {
            customer {
              id
              email
              phone
              firstName
              lastName
              acceptsMarketing
              createdAt
            }
            customerUserErrors {
              field
              message
              code
            }
          }
        }
      `;

      const variables = {
        input: {
          email: email,
          phone: phoneNumber,
          firstName: firstName,
          lastName: lastName,
          password: password,
          acceptsMarketing: acceptsMarketing || false,
          ...(birthdate && { metafields: [
            {
              namespace: 'custom',
              key: 'birthdate',
              value: birthdate,
              type: 'date'
            }
          ]}),
          ...(gender && { metafields: [
            {
              namespace: 'custom',
              key: 'gender',
              value: gender,
              type: 'single_line_text_field'
            }
          ]})
        }
      };

      const response = await axios.post(
        this.storefrontApiUrl,
        {
          query: mutation,
          variables: variables
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Storefront-Access-Token': this.storefrontAccessToken
          },
          timeout: 15000
        }
      );

      if (response.data.errors) {
        console.error('Shopify GraphQL errors:', response.data.errors);
        return {
          success: false,
          customer: null,
          error: 'GraphQL errors occurred'
        };
      }

      const result = response.data.data.customerCreate;
      
      if (result.customerUserErrors && result.customerUserErrors.length > 0) {
        const errors = result.customerUserErrors.map(err => err.message).join(', ');
        return {
          success: false,
          customer: null,
          error: errors
        };
      }

      if (result.customer) {
        return {
          success: true,
          customer: result.customer,
          error: null
        };
      }

      return {
        success: false,
        customer: null,
        error: 'Failed to create customer for unknown reason'
      };

    } catch (error) {
      console.error('Error creating customer:', error.message);
      
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        return {
          success: false,
          customer: null,
          error: 'Unable to connect to Shopify'
        };
      }
      
      return {
        success: false,
        customer: null,
        error: 'Error occurred while creating customer'
      };
    }
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
    
    if (!this.storefrontAccessToken) {
      missingConfigs.push('SHOPIFY_STOREFRONT_ACCESS_TOKEN');
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
      const validation = this.validateConfiguration();
      if (!validation.isValid) {
        return {
          success: false,
          message: validation.message
        };
      }

      const query = `
        query {
          shop {
            name
            domain
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
          message: 'Invalid credentials or access token'
        };
      }

      return {
        success: true,
        message: 'Connection to Shopify successful',
        shop: response.data.data.shop
      };

    } catch (error) {
      console.error('Shopify connection test failed:', error.message);
      return {
        success: false,
        message: 'Failed to connect to Shopify'
      };
    }
  }
}

module.exports = new ShopifyService();
