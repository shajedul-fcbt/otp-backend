const redis = require('redis');
const config = require('./environment');
const logger = require('./logger');

class RedisClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.config = config.redis;
  }

  async connect() {
    try {
      this.client = redis.createClient({
        host: this.config.host,
        port: this.config.port,
        password: this.config.password,
        retry_strategy: (options) => {
          if (options.error && options.error.code === 'ECONNREFUSED') {
            return new Error('The server refused the connection');
          }
          if (options.total_retry_time > this.config.retryStrategy.maxRetryTime) {
            return new Error('Retry time exhausted');
          }
          if (options.attempt > this.config.retryStrategy.maxAttempts) {
            return undefined;
          }
          return Math.min(options.attempt * this.config.retryStrategy.minDelay, this.config.retryStrategy.maxDelay);
        }
      });

      await this.client.connect();
      this.isConnected = true;
      logger.info('Redis connected successfully');

      this.client.on('error', (err) => {
        logger.error('ERROR: Redis Client Error:', err);
        this.isConnected = false;
      });

      this.client.on('disconnect', () => {
        logger.info('Redis disconnected');
        this.isConnected = false;
      });

    } catch (error) {
      logger.error('ERROR: Redis connection failed:', error);
      this.isConnected = false;
      throw error;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.disconnect();
      this.isConnected = false;
      logger.info('Redis disconnected');
    }
  }

  getClient() {
    if (!this.isConnected || !this.client) {
      throw new Error('Redis client not connected');
    }
    return this.client;
  }

  async set(key, value, expireTimeInSeconds) {
    try {
      const client = this.getClient();
      if (expireTimeInSeconds) {
        await client.setEx(key, expireTimeInSeconds, JSON.stringify(value));
      } else {
        await client.set(key, JSON.stringify(value));
      }
      return true;
    } catch (error) {
      logger.error('ERROR: Redis SET error:', error);
      throw error;
    }
  }

  async get(key) {
    try {
      const client = this.getClient();
      const value = await client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('ERROR: Redis GET error:', error);
      throw error;
    }
  }

  async delete(key) {
    try {
      const client = this.getClient();
      const result = await client.del(key);
      return result > 0;
    } catch (error) {
      logger.error('ERROR: Redis DELETE error:', error);
      throw error;
    }
  }

  async exists(key) {
    try {
      const client = this.getClient();
      const result = await client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('ERROR: Redis EXISTS error:', error);
      throw error;
    }
  }
}

const redisClient = new RedisClient();

module.exports = redisClient;
