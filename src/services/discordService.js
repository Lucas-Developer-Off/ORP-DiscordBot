const logger = require('../utils/helpers/logger');
const serverConfig = require('../../config/server.config.json');

class DiscordService {
    constructor() {
        this.client = null;
    }

    setClient(client) {
        this.client = client;
        logger.info('Discord client set in DiscordService');
    }

    async updateMemberRoles(discordId, username) {
        if (!this.client) {
            logger.warn('Discord client not initialized');
            return;
        }

        try {
            const guilds = this.client.guilds.cache;

            for (const guild of guilds.values()) {
                const guildConfig = serverConfig.servers?.[guild.id];

                if (!guildConfig) {
                    continue;
                }

                try {
                    const member = await guild.members.fetch(discordId);

                    if (!member) {
                        continue;
                    }

                    if (guildConfig.unverifiedRole && member.roles.cache.has(guildConfig.unverifiedRole)) {
                        await member.roles.remove(guildConfig.unverifiedRole);
                        logger.info('Unverified role removed', { 
                            user: username, 
                            guild: guild.name 
                        });
                    }

                    if (guildConfig.verifiedRole && !member.roles.cache.has(guildConfig.verifiedRole)) {
                        await member.roles.add(guildConfig.verifiedRole);
                        logger.success('Verified role added', { 
                            user: username, 
                            guild: guild.name 
                        });
                    }
                } catch (memberError) {
                    logger.debug('Member not found on server', { 
                        guild: guild.name,
                        discordId 
                    });
                }
            }
        } catch (error) {
            logger.error('Error updating member roles', { error: error.message });
        }
    }

    async addUnverifiedRole(member) {
        try {
            const guildId = member.guild.id;
            const guildConfig = serverConfig.servers?.[guildId];

            if (!guildConfig) {
                logger.debug('Server not configured', { guild: member.guild.name });
                return;
            }

            if (!guildConfig.unverifiedRole) {
                logger.warn('Unverified role not configured', { guild: member.guild.name });
                return;
            }

            const role = member.guild.roles.cache.get(guildConfig.unverifiedRole);

            if (!role) {
                logger.error('Unverified role not found', { 
                    roleId: guildConfig.unverifiedRole,
                    guild: member.guild.name 
                });
                return;
            }

            await member.roles.add(role);
            logger.success('Unverified role added to new member', { 
                user: member.user.tag,
                guild: member.guild.name 
            });
        } catch (error) {
            logger.error('Error adding unverified role', { error: error.message });
        }
    }
}

module.exports = new DiscordService();