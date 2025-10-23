const authService = require('../../services/authService');
const steamService = require('../../services/steamService');
const Token = require('../../models/Token');
const logger = require('../../utils/helpers/logger');

class AuthController {
    async initiateLink(req, res) {
        try {
            const { token } = req.query;

            const tokenData = await Token.validate(token);

            if (!tokenData) {
                logger.warn('Invalid or expired token used', { token, ip: req.ip });
                return res.status(404).sendFile(
                    require('path').join(__dirname, '../public/404.html')
                );
            }

            req.session.token = token;
            req.session.discordId = tokenData.discord_id;
            req.session.discordUsername = tokenData.discord_username;

            logger.info('Link process initiated', {
                discordId: tokenData.discord_id,
                username: tokenData.discord_username
            });

            const baseUrl = process.env.WEB_URL || `http://localhost:${process.env.WEB_PORT || 50000}`;
            const returnUrl = `${baseUrl}/auth/steam/callback`;
            const steamLoginUrl = steamService.buildLoginUrl(baseUrl, returnUrl);

            res.redirect(steamLoginUrl);
        } catch (error) {
            logger.error('Error initiating link', { error: error.message });
            res.status(500).sendFile(
                require('path').join(__dirname, '../public/404.html')
            );
        }
    }

    async handleSteamCallback(req, res) {
        try {
            if (!req.session.discordId || !req.session.token) {
                logger.warn('Invalid session in Steam callback', { ip: req.ip });
                return res.status(404).sendFile(
                    require('path').join(__dirname, '../public/404.html')
                );
            }

            const result = await authService.processLinkCallback(
                req.session.token,
                req.query,
                req.session
            );

            if (!result.success) {
                logger.error('Link callback failed', { error: result.error });
                return res.status(404).sendFile(
                    require('path').join(__dirname, '../public/404.html')
                );
            }

            req.session.steamId = result.data.steamId;
            req.session.steamName = result.data.steamName;

            logger.success('Link completed successfully', {
                discordId: result.data.discordId,
                steamId: result.data.steamId
            });

            res.redirect('/success');
        } catch (error) {
            logger.error('Error in Steam callback', { error: error.message });
            res.status(500).sendFile(
                require('path').join(__dirname, '../public/404.html')
            );
        }
    }

    async getSession(req, res) {
        try {
            if (!req.session.discordId) {
                return res.status(401).json({ 
                    error: 'Not authenticated',
                    authenticated: false 
                });
            }

            res.json({
                authenticated: true,
                discordId: req.session.discordId,
                discordUsername: req.session.discordUsername,
                steamId: req.session.steamId,
                steamName: req.session.steamName
            });
        } catch (error) {
            logger.error('Error getting session', { error: error.message });
            res.status(500).json({ 
                error: 'Internal server error' 
            });
        }
    }

    async logout(req, res) {
        try {
            const discordId = req.session.discordId;

            req.session.destroy((err) => {
                if (err) {
                    logger.error('Error destroying session', { error: err.message });
                    return res.status(500).json({ 
                        error: 'Failed to logout' 
                    });
                }

                logger.info('User logged out', { discordId });
                res.json({ 
                    success: true,
                    message: 'Logged out successfully' 
                });
            });
        } catch (error) {
            logger.error('Error in logout', { error: error.message });
            res.status(500).json({ 
                error: 'Internal server error' 
            });
        }
    }
}

module.exports = new AuthController();