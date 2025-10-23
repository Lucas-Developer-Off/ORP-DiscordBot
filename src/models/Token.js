const db = require('../database/connection');
const logger = require('../utils/helpers/logger');
const crypto = require('crypto');
const { TOKEN_EXPIRATION_MINUTES } = require('../utils/helpers/constants');

class Token {
    async create(discordId, discordUsername) {
        try {
            const token = crypto.randomUUID();
            const expiresAt = new Date(Date.now() + TOKEN_EXPIRATION_MINUTES * 60 * 1000);

            await db.query(
                `INSERT INTO synchronization_token (discord_id, discord_username, token, expires_at)
                VALUES (?, ?, ?, ?)`,
                [discordId, discordUsername, token, expiresAt]
            );

            logger.info('Synchronization token created', { discordId, expiresAt });
            return { token, expiresAt };
        } catch (error) {
            logger.error('Error creating synchronization token', { error: error.message });
            throw error;
        }
    }

    async validate(token) {
        try {
            const rows = await db.query(
                `SELECT * FROM synchronization_token 
                WHERE token = ? AND used = FALSE AND expires_at > NOW()
                LIMIT 1`,
                [token]
            );

            if (rows.length === 0) {
                logger.warn('Token validation failed', { token });
                return null;
            }

            logger.info('Token validated successfully', { token });
            return rows[0];
        } catch (error) {
            logger.error('Error validating token', { error: error.message });
            throw error;
        }
    }

    async markAsUsed(token) {
        try {
            await db.query(
                `UPDATE synchronization_token SET used = TRUE WHERE token = ?`,
                [token]
            );
            logger.info('Token marked as used', { token });
        } catch (error) {
            logger.error('Error marking token as used', { error: error.message });
            throw error;
        }
    }

    async cleanupExpired() {
        try {
            const result = await db.query(
                `DELETE FROM synchronization_token WHERE expires_at < NOW() OR used = TRUE`
            );
            
            const deletedCount = result.affectedRows || 0;
            if (deletedCount > 0) {
                logger.info('Expired tokens cleaned up', { count: deletedCount });
            }
            
            return deletedCount;
        } catch (error) {
            logger.error('Error cleaning up expired tokens', { error: error.message });
            throw error;
        }
    }

    async deleteByDiscordId(discordId) {
        try {
            await db.query(
                `DELETE FROM synchronization_token WHERE discord_id = ?`,
                [discordId]
            );
            logger.info('Tokens deleted for user', { discordId });
        } catch (error) {
            logger.error('Error deleting tokens by Discord ID', { error: error.message });
            throw error;
        }
    }

    async hasActiveToken(discordId) {
        try {
            const rows = await db.query(
                `SELECT 1 FROM synchronization_token WHERE discord_id = ? AND used = FALSE AND expires_at > NOW() LIMIT 1`,
                [discordId]
            );
            const hasOne = rows.length > 0;
            logger.info('Checked active token existence', { discordId, hasOne });
            return hasOne;
        } catch (error) {
            logger.error('Error checking active token existence', { error: error.message, discordId });
            throw error;
        }
    }

    async getActiveTokenByDiscordId(discordId) {
        try {
            const rows = await db.query(
                `SELECT * FROM synchronization_token WHERE discord_id = ? AND used = FALSE AND expires_at > NOW() ORDER BY expires_at DESC LIMIT 1`,
                [discordId]
            );

            if (rows.length === 0) {
                logger.warn('No active token found for user', { discordId });
                return null;
            }

            const record = rows[0];
            logger.info('Active token retrieved for user', { discordId, token: record.token });
            return record;
        } catch (error) {
            logger.error('Error retrieving active token by Discord ID', { error: error.message, discordId });
            throw error;
        }
    }
}

module.exports = new Token();