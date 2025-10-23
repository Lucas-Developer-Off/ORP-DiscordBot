const mysql = require('mysql2/promise');
const logger = require('../utils/helpers/logger');
const dbConfig = require('../../config/database.config.json');

class DatabaseConnection {
    constructor() {
        this.pool = null;
    }

    getConfigFromEnv() {
        const url = process.env.MYSQL_URL || process.env.DATABASE_URL;
        
        if (url) {
            return { uri: url };
        }
        
        return {
            host: process.env.MYSQL_HOST || 'localhost',
            user: process.env.MYSQL_USER || 'root',
            password: process.env.MYSQL_PASSWORD || '',
            database: process.env.MYSQL_DATABASE || 'discord_bot',
            port: process.env.MYSQL_PORT ? Number(process.env.MYSQL_PORT) : 3306,
        };
    }

    async connect() {
        if (this.pool) {
            return this.pool;
        }
        
        const config = this.getConfigFromEnv();

        try {
            if (config.uri) {
                this.pool = mysql.createPool({
                    uri: config.uri,
                    ...dbConfig.pool
                });
            } else {
                this.pool = mysql.createPool({
                    host: config.host,
                    user: config.user,
                    password: config.password,
                    database: config.database,
                    port: config.port,
                    ...dbConfig.pool
                });
            }

            await this.pool.query('SELECT 1');
            logger.success('MySQL connected successfully');
            
            return this.pool;
        } catch (error) {
            logger.error('MySQL connection failed', { error: error.message });
            throw error;
        }
    }

    async query(sql, params = []) {
        try {
            const pool = await this.connect();
            const [rows] = await pool.execute(sql, params);
            return rows;
        } catch (error) {
            logger.error('Database query error', { sql, error: error.message });
            throw error;
        }
    }

    async disconnect() {
        if (this.pool) {
            await this.pool.end();
            this.pool = null;
            logger.info('MySQL disconnected');
        }
    }

    getPool() {
        return this.pool;
    }
}

module.exports = new DatabaseConnection();