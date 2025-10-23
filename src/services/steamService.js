const axios = require('axios');
const logger = require('../utils/helpers/logger');

class SteamService {
    constructor() {
        this.apiKey = process.env.STEAM_API_KEY;
        this.baseUrl = 'https://api.steampowered.com';
        this.openIdUrl = 'https://steamcommunity.com/openid/login';
    }

    extractSteamId(claimedId) {
        if (!claimedId) {
            return null;
        }

        const steamIdMatch = claimedId.match(/\/id\/(\d+)/);
        return steamIdMatch ? steamIdMatch[1] : null;
    }

    async verifyOpenIdAuthentication(params) {
        try {
            const verificationParams = { ...params };
            verificationParams['openid.mode'] = 'check_authentication';

            const response = await axios.post(
                this.openIdUrl,
                new URLSearchParams(verificationParams).toString(),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                }
            );

            const isValid = response.data.includes('is_valid:true');
            
            if (isValid) {
                logger.info('Steam OpenID verification successful');
            } else {
                logger.warn('Steam OpenID verification failed');
            }

            return isValid;
        } catch (error) {
            logger.error('Error verifying Steam OpenID', { error: error.message });
            throw error;
        }
    }

    async getPlayerSummary(steamId) {
        if (!this.apiKey) {
            logger.warn('Steam API key not configured');
            return null;
        }

        try {
            const response = await axios.get(
                `${this.baseUrl}/ISteamUser/GetPlayerSummaries/v2/`,
                {
                    params: {
                        key: this.apiKey,
                        steamids: steamId
                    }
                }
            );

            const player = response.data.response.players[0];
            
            if (player) {
                logger.info('Steam player data retrieved', { steamId, name: player.personaname });
                return {
                    steamId: player.steamid,
                    name: player.personaname,
                    profileUrl: player.profileurl,
                    avatar: player.avatarfull,
                    createdAt: player.timecreated
                };
            }

            return null;
        } catch (error) {
            logger.error('Error fetching Steam player data', { error: error.message, steamId });
            return null;
        }
    }

    buildLoginUrl(baseUrl, returnUrl) {
        const params = new URLSearchParams({
            'openid.ns': 'http://specs.openid.net/auth/2.0',
            'openid.mode': 'checkid_setup',
            'openid.return_to': returnUrl,
            'openid.realm': baseUrl,
            'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
            'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select'
        });

        return `${this.openIdUrl}?${params.toString()}`;
    }
}

module.exports = new SteamService();