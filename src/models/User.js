const db = require('../database/connection');
const logger = require('../utils/helpers/logger');

class User {
    async upsert({ discordId, discordUsername, steamId, steamName }) {
        try {
            await db.query(
                `INSERT INTO synchronization 
                (discord_id, discord_username, steam_id, steam_name, is_verified) 
                VALUES (?, ?, ?, ?, TRUE)
                ON DUPLICATE KEY UPDATE 
                discord_username = VALUES(discord_username),
                steam_id = VALUES(steam_id),
                steam_name = VALUES(steam_name),
                is_verified = TRUE,
                updated_at = CURRENT_TIMESTAMP`,
                [discordId, discordUsername, steamId, steamName]
            );

            logger.success('User link upserted', { discordId, steamId });
            return await this.findByDiscordId(discordId);
        } catch (error) {
            logger.error('Error upserting user link', { error: error.message });
            throw error;
        }
    }

    async findByDiscordId(discordId) {
        try {
            const rows = await db.query(
                'SELECT * FROM synchronization WHERE discord_id = ? LIMIT 1',
                [discordId]
            );
            return rows.length > 0 ? rows[0] : null;
        } catch (error) {
            logger.error('Error finding user by Discord ID', { error: error.message });
            throw error;
        }
    }

    async findBySteamId(steamId) {
        try {
            const rows = await db.query(
                'SELECT * FROM synchronization WHERE steam_id = ? LIMIT 1',
                [steamId]
            );
            return rows.length > 0 ? rows[0] : null;
        } catch (error) {
            logger.error('Error finding user by Steam ID', { error: error.message });
            throw error;
        }
    }

    async findByFiveMLicense(license) {
        try {
            const rows = await db.query(
                'SELECT * FROM synchronization WHERE fivem_license = ? LIMIT 1',
                [license]
            );
            return rows.length > 0 ? rows[0] : null;
        } catch (error) {
            logger.error('Error finding user by FiveM license', { error: error.message });
            throw error;
        }
    }

    async updateFiveMInfo(discordId, { fivemLicense, hardwareId }) {
        try {
            await db.query(
                `UPDATE synchronization 
                SET fivem_license = ?, hardware_id = ?, updated_at = CURRENT_TIMESTAMP
                WHERE discord_id = ?`,
                [fivemLicense, hardwareId, discordId]
            );

            logger.info('FiveM info updated', { discordId });
            return await this.findByDiscordId(discordId);
        } catch (error) {
            logger.error('Error updating FiveM info', { error: error.message });
            throw error;
        }
    }

    async remove(discordId) {
        try {
            await db.query(
                'DELETE FROM synchronization WHERE discord_id = ?',
                [discordId]
            );
            logger.info('User link removed', { discordId });
        } catch (error) {
            logger.error('Error removing user link', { error: error.message });
            throw error;
        }
    }

    async getAll() {
        try {
            return await db.query(
                'SELECT * FROM synchronization ORDER BY linked_at DESC'
            );
        } catch (error) {
            logger.error('Error getting all user links', { error: error.message });
            throw error;
        }
    }

    async getStats() {
        try {
            const [total] = await db.query(
                'SELECT COUNT(*) as total FROM synchronization'
            );
            const [withSteam] = await db.query(
                'SELECT COUNT(*) as total FROM synchronization WHERE steam_id IS NOT NULL'
            );
            const [withFiveM] = await db.query(
                'SELECT COUNT(*) as total FROM synchronization WHERE fivem_license IS NOT NULL'
            );
            
            return {
                total: total[0].total,
                withSteam: withSteam[0].total,
                withFiveM: withFiveM[0].total,
            };
        } catch (error) {
            logger.error('Error getting stats', { error: error.message });
            throw error;
        }
    }
}

module.exports = new User();