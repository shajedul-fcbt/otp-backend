const express = require('express');
const router = express.Router();
const healthController = require('../controllers/healthController');
const deviceMiddleware = require('../middlewares/deviceMiddleware');
const { generalLimiter } = require('../middlewares/rateLimiter');

/**
 * @swagger
 * tags:
 *   name: Health
 *   description: Health check and system status endpoints
 */

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health Check
 *     description: Check system health and status
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: System is healthy
 */
router.get('/', 
  generalLimiter,
  healthController.healthCheck
);

/**
 * @swagger
 * /health/cookie:
 *   get:
 *     summary: Mint Device Cookie
 *     description: Mint a device_id cookie for first-time requests
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Cookie minted successfully
 */
router.get('/cookie', 
  generalLimiter,
  deviceMiddleware.mintDeviceId,
  healthController.mintCookie
);

module.exports = router;
