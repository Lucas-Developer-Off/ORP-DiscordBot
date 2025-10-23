const logger = require('../utils/helpers/logger');
const path = require('path');

class ErrorMiddleware {
    notFound(req, res) {
        logger.warn('Route not found', { 
            method: req.method,
            path: req.originalUrl,
            ip: req.ip 
        });

        if (req.accepts('html')) {
            return res.status(404).sendFile(
                path.join(__dirname, '../web/public/404.html')
            );
        }

        if (req.accepts('json')) {
            return res.status(404).json({ 
                error: 'Not Found',
                message: 'The requested resource was not found' 
            });
        }

        res.status(404).type('txt').send('Not Found');
    }

    handleError(err, req, res, next) {
        logger.error('Server error', { 
            error: err.message,
            stack: err.stack,
            path: req.originalUrl,
            method: req.method,
            ip: req.ip
        });

        const statusCode = err.statusCode || 500;
        const message = process.env.NODE_ENV === 'production' 
            ? 'Internal Server Error' 
            : err.message;

        if (req.accepts('html')) {
            return res.status(statusCode).sendFile(
                path.join(__dirname, '../web/public/404.html')
            );
        }

        res.status(statusCode).json({
            error: err.name || 'Error',
            message: message,
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
        });
    }

    asyncHandler(fn) {
        return (req, res, next) => {
            Promise.resolve(fn(req, res, next)).catch(next);
        };
    }
}

module.exports = new ErrorMiddleware();