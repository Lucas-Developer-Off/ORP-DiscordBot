const express = require('express');
const path = require('path');
const createSessionMiddleware = require('../middleware/sessionMiddleware');
const loggerMiddleware = require('../middleware/loggerMiddleware');
const errorMiddleware = require('../middleware/errorMiddleware');
const rateLimitMiddleware = require('../middleware/rateLimitMiddleware');
const logger = require('../utils/helpers/logger');
const discordService = require('../services/discordService');
const Token = require('../models/Token');

const authRoutes = require('./routes/auth.routes');
const apiRoutes = require('./routes/api.routes');
const healthRoutes = require('./routes/health.routes');
const pageRoutes = require('./routes/page.routes');

class WebServer {
    constructor() {
        this.app = express();
        this.port = process.env.WEB_PORT || 50000;
        this.baseUrl = process.env.WEB_URL || `http://localhost:${this.port}`;
        this.server = null;
        
        this.setupMiddleware();
        this.setupRoutes();
        this.setupErrorHandling();
        this.setupTokenCleanup();
    }

    setupMiddleware() {
        this.app.set('trust proxy', 1);

        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
        
        this.app.use(loggerMiddleware.logRequest.bind(loggerMiddleware));
        
        this.app.use(createSessionMiddleware());
        
        this.app.use(express.static(path.join(__dirname, 'public')));

        this.app.use(rateLimitMiddleware.createLimiter({
            windowMs: 60000,
            max: 100,
            message: 'Too many requests from this IP, please try again later'
        }));

        logger.info('Middleware configured successfully');
    }

    setupRoutes() {
        this.app.use('/', pageRoutes);
        this.app.use('/auth', authRoutes);
        this.app.use('/api', apiRoutes);
        this.app.use('/', healthRoutes);

        logger.info('Routes configured successfully');
    }

    setupErrorHandling() {
        this.app.use('*', errorMiddleware.notFound.bind(errorMiddleware));
        
        this.app.use(errorMiddleware.handleError.bind(errorMiddleware));

        logger.info('Error handling configured successfully');
    }

    setupTokenCleanup() {
        const CLEANUP_INTERVAL = 10 * 60 * 1000;

        this.cleanupInterval = setInterval(async () => {
            try {
                const deleted = await Token.cleanupExpired();
                if (deleted > 0) {
                    logger.info('Token cleanup completed', { deletedCount: deleted });
                }
            } catch (error) {
                logger.error('Token cleanup failed', { error: error.message });
            }
        }, CLEANUP_INTERVAL);

        logger.info('Token cleanup task scheduled', { 
            intervalMinutes: CLEANUP_INTERVAL / 60000 
        });
    }

    start(discordClient) {
        if (discordClient) {
            discordService.setClient(discordClient);
            logger.info('Discord client connected to web server');
        }

        this.server = this.app.listen(this.port, '0.0.0.0', () => {
            logger.success('Web server started', {
                host: '0.0.0.0',
                port: this.port,
                publicUrl: this.baseUrl,
                environment: process.env.NODE_ENV || 'development'
            });
        });

        this.server.on('error', (error) => {
            logger.error('Web server error', { error: error.message });
            process.exit(1);
        });

        return this.server;
    }

    async stop() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            logger.info('Token cleanup task stopped');
        }

        if (this.server) {
            return new Promise((resolve, reject) => {
                this.server.close((err) => {
                    if (err) {
                        logger.error('Error stopping web server', { error: err.message });
                        reject(err);
                    } else {
                        logger.info('Web server stopped');
                        resolve();
                    }
                });
            });
        }
    }

    getApp() {
        return this.app;
    }

    getServer() {
        return this.server;
    }
}

const webServer = new WebServer();

module.exports = {
    startServer: (client) => webServer.start(client),
    stopServer: () => webServer.stop(),
    app: webServer.getApp(),
    server: webServer.getServer()
};