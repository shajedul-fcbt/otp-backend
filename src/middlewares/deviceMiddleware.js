const { v4: uuidv4 } = require('uuid');
const config = require('../config/environment');
const logger = require('../config/logger');

/**
 * Device ID Middleware
 * Mints a device_id (UUID) on the very first request if absent
 * Sets it as a Secure, HttpOnly cookie with SameSite=Strict
 */
class DeviceMiddleware {
  constructor() {
    this.cookieName = 'device_id';
    this.cookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
      path: '/'
    };
  }

  /**
   * Middleware to mint and manage device_id cookie
   */
  mintDeviceId = (req, res, next) => {
    try {
      let deviceId = req.cookies[this.cookieName];
      console.log("Inside Health Cookie API");
      console.log(deviceId);
      

      if (!deviceId) {
        deviceId = uuidv4();
        res.cookie(this.cookieName, deviceId, this.cookieOptions);
        logger.info('Device ID minted', { 
          deviceId: this.hashIdentifier(deviceId),
          userAgent: req.get('User-Agent')?.substring(0, 100),
          ip: req.ip
        });
      }

      req.deviceId = deviceId;
      next();
    } catch (error) {
      logger.error('Error in device middleware:', error);
      next(error);
    }
  }

  /**
   * Middleware to require device_id cookie
   */
requireDeviceId   = (req, res, next) => {
    let deviceId = req.cookies[this.cookieName];

    if (!deviceId) {
      return res.status(401).json({
        success: false,
        message: 'Forbidden',
        error: 'Unusual Activity Detected',
        code: '403'
      });
    }

    req.deviceId = deviceId;
    next();
  }

  isValidUUID(uuid) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  hashIdentifier(identifier) {
    if (!identifier) return 'null';
    const crypto = require('crypto');
    return crypto
      .createHash('sha256')
      .update(identifier)
      .digest('hex')
      .substring(0, 8);
  }
}

module.exports = new DeviceMiddleware();
