const path = require('path');
const logger = require('../../utils/helpers/logger');

class PageController {
    showSuccess(req, res) {
        if (!req.session.discordId || !req.session.steamId) {
            logger.warn('Unauthorized access to success page', { ip: req.ip });
            return res.status(404).sendFile(
                path.join(__dirname, '../public/404.html')
            );
        }

        res.sendFile(path.join(__dirname, '../public/success.html'));
    }

    show404(req, res) {
        logger.warn('Root access denied', { ip: req.ip });
        res.status(404).sendFile(
            path.join(__dirname, '../public/404.html')
        );
    }
}

module.exports = new PageController();