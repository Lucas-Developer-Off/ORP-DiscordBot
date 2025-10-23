const logger = require('../utils/helpers/logger');

class AuthMiddleware {
    requireSession(req, res, next) {
        if (!req.session.discordId) {
            logger.warn('Unauthorized access attempt', { ip: req.ip, path: req.path });
            return res.status(401).json({ 
                error: 'Unauthorized',
                message: 'Valid session required' 
            });
        }
        next();
    }

    requireToken(req, res, next) {
        const { token } = req.query;

        if (!token) {
            logger.warn('Missing token in request', { ip: req.ip, path: req.path });
            return res.status(400).json({ 
                error: 'Bad Request',
                message: 'Token is required' 
            });
        }

        req.linkToken = token;
        next();
    }

    requireDiscordSession(req, res, next) {
        if (!req.session.discordId || !req.session.token) {
            logger.warn('Invalid Discord session', { ip: req.ip, path: req.path });
            return res.status(403).json({ 
                error: 'Forbidden',
                message: 'Valid Discord session required' 
            });
        }
        next();
    }

    requireCompletedLink(req, res, next) {
        if (!req.session.discordId || !req.session.steamId) {
            logger.warn('Incomplete link session', { ip: req.ip, path: req.path });
            return res.status(403).json({ 
                error: 'Forbidden',
                message: 'Link process not completed' 
            });
        }
        next();
    }
}

module.exports = new AuthMiddleware();