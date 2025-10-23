const express = require('express');
const router = express.Router();
const db = require('../../database/connection');
const logger = require('../../utils/helpers/logger');

router.get('/health', async (req, res) => {
    try {
        await db.query('SELECT 1');

        res.status(200).json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            database: 'connected',
            port: process.env.WEB_PORT || 50000
        });
    } catch (error) {
        logger.error('Health check failed', { error: error.message });
        
        res.status(503).json({
            status: 'error',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            database: 'disconnected',
            error: 'Database connection failed'
        });
    }
});

router.get('/ping', (req, res) => {
    res.status(200).json({
        status: 'ok',
        message: 'pong',
        timestamp: new Date().toISOString()
    });
});

module.exports = router;