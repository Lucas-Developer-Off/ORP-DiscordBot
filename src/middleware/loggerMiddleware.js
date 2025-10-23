const logger = require('../utils/helpers/logger');
const fs = require('fs');
const path = require('path');

class LoggerMiddleware {
    constructor() {
        this.accessLogPath = path.join(__dirname, '../../logs/access.log');
        this.ensureAccessLog();
    }

    ensureAccessLog() {
        const logsDir = path.dirname(this.accessLogPath);
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }
    }

    logRequest(req, res, next) {
        const startTime = Date.now();

        res.on('finish', () => {
            const duration = Date.now() - startTime;
            const logData = {
                timestamp: new Date().toISOString(),
                method: req.method,
                path: req.originalUrl,
                status: res.statusCode,
                duration: `${duration}ms`,
                ip: req.ip,
                userAgent: req.get('user-agent') || 'unknown'
            };

            const logMessage = `${logData.timestamp} | ${logData.method} ${logData.path} | Status: ${logData.status} | Duration: ${logData.duration} | IP: ${logData.ip}`;

            fs.appendFileSync(this.accessLogPath, logMessage + '\n', 'utf8');

            if (res.statusCode >= 400) {
                logger.warn('HTTP Error', logData);
            } else if (process.env.NODE_ENV === 'development') {
                logger.debug('HTTP Request', logData);
            }
        });

        next();
    }
}

module.exports = new LoggerMiddleware();