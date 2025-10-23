const Token = require('../models/Token');
const User = require('../models/User');
const steamService = require('./steamService');
const discordService = require('./discordService');
const logger = require('../utils/helpers/logger');

class AuthService {
    async createLinkToken(discordId, discordUsername) {
        try {
            const existingLink = await User.findByDiscordId(discordId);
            
            if (existingLink && existingLink.steam_id) {
                return {
                    success: false,
                    error: 'ALREADY_LINKED',
                    data: existingLink
                };
            }

            const active = await Token.getActiveTokenByDiscordId(discordId);
            
            if (active) {
                return {
                    success: true,
                    data: {
                        token: active.token,
                        expiresAt: active.expires_at || active.expiresAt
                    }
                };
            }

            const tokenData = await Token.create(discordId, discordUsername);
            
            return {
                success: true,
                data: tokenData
            };
        } catch (error) {
            logger.error('Error creating link token', { error: error.message });
            return {
                success: false,
                error: 'TOKEN_CREATION_FAILED'
            };
        }
    }

    async processLinkCallback(token, steamQuery, sessionData) {
        try {
            const tokenData = await Token.validate(token);
            
            if (!tokenData) {
                return {
                    success: false,
                    error: 'INVALID_TOKEN'
                };
            }

            const isValid = await steamService.verifyOpenIdAuthentication(steamQuery);
            
            if (!isValid) {
                return {
                    success: false,
                    error: 'STEAM_VERIFICATION_FAILED'
                };
            }

            const steamId = steamService.extractSteamId(steamQuery['openid.claimed_id']);
            
            if (!steamId) {
                return {
                    success: false,
                    error: 'INVALID_STEAM_ID'
                };
            }

            const existingSteam = await User.findBySteamId(steamId);
            
            if (existingSteam && existingSteam.discord_id !== tokenData.discord_id) {
                return {
                    success: false,
                    error: 'STEAM_ALREADY_LINKED'
                };
            }

            const steamProfile = await steamService.getPlayerSummary(steamId);

            await User.upsert({
                discordId: tokenData.discord_id,
                discordUsername: tokenData.discord_username,
                steamId: steamId,
                steamName: steamProfile?.name || null
            });

            await Token.markAsUsed(token);

            await discordService.updateMemberRoles(
                tokenData.discord_id,
                tokenData.discord_username
            );

            logger.success('Link process completed', {
                discordId: tokenData.discord_id,
                steamId: steamId
            });

            return {
                success: true,
                data: {
                    discordId: tokenData.discord_id,
                    discordUsername: tokenData.discord_username,
                    steamId: steamId,
                    steamName: steamProfile?.name || null
                }
            };
        } catch (error) {
            logger.error('Error processing link callback', { error: error.message });
            return {
                success: false,
                error: 'LINK_PROCESS_FAILED'
            };
        }
    }

    async unlinkUser(discordId) {
        try {
            const userData = await User.findByDiscordId(discordId);
            
            if (!userData) {
                return {
                    success: false,
                    error: 'USER_NOT_FOUND'
                };
            }

            await User.remove(discordId);
            await Token.deleteByDiscordId(discordId);

            logger.success('User unlinked', { discordId });

            return {
                success: true,
                data: userData
            };
        } catch (error) {
            logger.error('Error unlinking user', { error: error.message });
            return {
                success: false,
                error: 'UNLINK_FAILED'
            };
        }
    }
}

module.exports = new AuthService();