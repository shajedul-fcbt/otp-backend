const deviceMiddleware = require('../middlewares/deviceMiddleware');
const config = require('../config/environment');
const logger = require('../config/logger');

/**
 * Health Controller
 * Provides health check and system status endpoints
 */
class HealthController {
  /**
   * Health Check Endpoint
   * GET /health
   */
  async healthCheck(req, res) {
    try {
      const systemInfo = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        environment: config.server.nodeEnv,
        version: process.env.npm_package_version || '1.0.0'
      };

      res.status(200).json({
        success: true,
        message: 'System is healthy',
        data: systemInfo
      });

    } catch (error) {
      logger.error('Health check failed:', error);
      
      res.status(503).json({
        success: false,
        message: 'Health check failed',
        error: 'HEALTH_CHECK_FAILED'
      });
    }
  }

  /**
   * Cookie Minting Endpoint
   * GET /health/cookie
   */
  async mintCookie(req, res) {
    try {
      const deviceId = req.deviceId || req.cookies['device_id'];
      
      res.status(200).json({
        success: true,
        message: 'Cookie minted successfully',
        data: {
          device_id: deviceId ? 'present' : 'minted',
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Cookie minting failed:', error);
      
      res.status(500).json({
        success: false,
        message: 'Cookie minting failed',
        error: 'COOKIE_MINTING_FAILED'
      });
    }
  }
}

module.exports = new HealthController();
