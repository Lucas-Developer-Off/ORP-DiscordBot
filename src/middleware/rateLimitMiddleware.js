const logger = require('../utils/helpers/logger');

class RateLimitMiddleware {
    constructor() {
        this.requests = new Map();
        this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
    }

    cleanup() {
        const now = Date.now();
        for (const [key, data] of this.requests.entries()) {
            if (now - data.resetTime > 60000) {
                this.requests.delete(key);
            }
        }
    }

    createLimiter(options = {}) {
        const {
            windowMs = 60000,
            max = 10,
            message = 'Too many requests, please try again later'
        } = options;

        return (req, res, next) => {
            const key = req.ip;
            const now = Date.now();
            const record = this.requests.get(key);

            if (!record) {
                this.requests.set(key, {
                    count: 1,
                    resetTime: now + windowMs
                });
                return next();
            }

            if (now > record.resetTime) {
                record.count = 1;
                record.resetTime = now + windowMs;
                return next();
            }

            if (record.count >= max) {
                logger.warn('Rate limit exceeded', { 
                    ip: req.ip,
                    path: req.path,
                    count: record.count 
                });

                return res.status(429).json({
                    error: 'Too Many Requests',
                    message: message,
                    retryAfter: Math.ceil((record.resetTime - now) / 1000)
                });
            }

            record.count++;
            next();
        };
    }

    destroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        this.requests.clear();
    }
}

module.exports = new RateLimitMiddleware();