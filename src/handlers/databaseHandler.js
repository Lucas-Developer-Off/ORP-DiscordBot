const db = require('../database/connection');
const logger = require('../utils/helpers/logger');
const dbConfig = require('../../config/database.config.json');

class DatabaseHandler {
    async initialize() {
        try {
            logger.info('Connecting to MySQL database...');
            
            await db.connect();
            logger.success('Connected to MySQL database successfully');

            logger.info('Initializing database schema...');
            await this.initSchema();
            logger.success('Database schema initialized successfully');

            return true;
        } catch (error) {
            logger.error('Database initialization failed', { error: error.message });
            throw error;
        }
    }

    async initSchema() {
        try {
            await db.query(`
                CREATE TABLE IF NOT EXISTS ${dbConfig.tables.synchronization} (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    discord_id VARCHAR(32) UNIQUE NOT NULL,
                    discord_username VARCHAR(255) NOT NULL,
                    steam_id VARCHAR(64) UNIQUE,
                    steam_name VARCHAR(255),
                    fivem_license VARCHAR(255),
                    hardware_id VARCHAR(255),
                    linked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    is_verified BOOLEAN DEFAULT FALSE,
                    INDEX idx_discord (discord_id),
                    INDEX idx_steam (steam_id),
                    INDEX idx_fivem (fivem_license)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `);

            logger.success('Table synchronization created/verified');

            await db.query(`
                CREATE TABLE IF NOT EXISTS ${dbConfig.tables.synchronization_token} (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    discord_id VARCHAR(32) NOT NULL,
                    discord_username VARCHAR(255) NOT NULL,
                    token VARCHAR(64) UNIQUE NOT NULL,
                    expires_at TIMESTAMP NOT NULL,
                    used BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_token (token),
                    INDEX idx_discord (discord_id),
                    INDEX idx_expires (expires_at)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `);

            logger.success('Table synchronization_token created/verified');
        } catch (error) {
            logger.error('Schema initialization error', { error: error.message });
            throw error;
        }
    }

    async close() {
        try {
            logger.info('Closing database connection...');
            await db.disconnect();
            logger.success('Database connection closed');
        } catch (error) {
            logger.error('Error closing database', { error: error.message });
            throw error;
        }
    }

    setupGracefulShutdown() {
        const shutdown = async (signal) => {
            logger.warn(`${signal} received. Initiating graceful shutdown...`);
            
            try {
                await this.close();
                logger.info('Graceful shutdown completed');
                process.exit(0);
            } catch (error) {
                logger.error('Error during shutdown', { error: error.message });
                process.exit(1);
            }
        };

        process.on('SIGINT', () => shutdown('SIGINT'));
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        
        process.on('uncaughtException', (error) => {
            logger.error('Uncaught Exception', { 
                error: error.message,
                stack: error.stack 
            });
            shutdown('UNCAUGHT_EXCEPTION');
        });

        process.on('unhandledRejection', (reason, promise) => {
            logger.error('Unhandled Rejection', { 
                reason: reason,
                promise: promise 
            });
        });

        logger.info('Graceful shutdown handlers configured');
    }
}

const databaseHandler = new DatabaseHandler();

module.exports = {
    initializeDatabase: () => databaseHandler.initialize(),
    closeDatabase: () => databaseHandler.close(),
    setupGracefulShutdown: () => databaseHandler.setupGracefulShutdown()
};