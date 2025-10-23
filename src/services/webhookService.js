const axios = require('axios');
const { EmbedBuilder } = require('discord.js');
const logger = require('../utils/helpers/logger');
const path = require('path');

// ✅ Chemin absolu vers la config
const webhookConfig = require(path.resolve(__dirname, '../config/webhooks.config.json'));

class WebhookService {
    async sendLog(category, embedData) {
        try {
            const webhookUrl = webhookConfig.webhooks[category]?.url;
            
            if (!webhookUrl || webhookUrl.includes('VOTRE_WEBHOOK')) {
                logger.warn('Webhook not configured for category', { category });
                return;
            }

            const embed = this.createLogEmbed(embedData);

            await axios.post(webhookUrl, {
                username: webhookConfig.webhooks[category].name,
                avatar_url: webhookConfig.webhooks[category].avatar,
                embeds: [embed]
            });

            logger.debug('Webhook log sent', { category, action: embedData.title });
        } catch (error) {
            logger.error('Error sending webhook log', { 
                category, 
                error: error.message 
            });
        }
    }

    createLogEmbed(data) {
        const { 
            title, 
            description, 
            color, 
            fields, 
            footer, 
            timestamp = true,
            thumbnail,
            icon
        } = data;

        const embed = new EmbedBuilder()
            .setColor(color || '#FF0000')
            .setTitle(`${icon || '⚙️'} | ${title}`)
            .setFooter({ 
                text: footer || 'Origin RolePlay © 2025 • All Rights Reserved' 
            });

        if (description) {
            embed.setDescription(description);
        }

        if (fields && fields.length > 0) {
            embed.addFields(fields);
        }

        if (thumbnail) {
            embed.setThumbnail(thumbnail);
        }

        if (timestamp) {
            embed.setTimestamp();
        }

        return embed.toJSON();
    }

    // ============================================
    // LOGS DE SYNCHRONISATION
    // ============================================

    async logLinkSuccess(userData, sessionData) {
        await this.sendLog('synchronization', {
            title: 'Link Successful',
            description: 'A user has successfully linked their Discord and Steam accounts.',
            color: '#00FF88',
            icon: '✅',
            fields: [
                { 
                    name: '🕐 Timestamp', 
                    value: `\`\`\`${new Date().toISOString()}\`\`\``,
                    inline: false 
                },
                { 
                    name: '👤 User', 
                    value: `\`\`\`${userData.discordUsername}\`\`\``,
                    inline: true 
                },
                { 
                    name: '🆔 Discord ID', 
                    value: `\`\`\`${userData.discordId}\`\`\``,
                    inline: true 
                },
                { 
                    name: '\u200b', 
                    value: '\u200b',
                    inline: false 
                },
                { 
                    name: '🎮 Steam ID', 
                    value: `\`\`\`${userData.steamId}\`\`\``,
                    inline: true 
                },
                { 
                    name: '🎯 Steam Name', 
                    value: `\`\`\`${userData.steamName || 'N/A'}\`\`\``,
                    inline: true 
                },
                { 
                    name: '\u200b', 
                    value: '\u200b',
                    inline: false 
                },
                { 
                    name: '🌐 IP Address', 
                    value: `\`\`\`${sessionData.ip || 'N/A'}\`\`\``,
                    inline: true 
                },
                { 
                    name: '🔑 Session ID', 
                    value: `\`\`\`${sessionData.sessionId || 'N/A'}\`\`\``,
                    inline: true 
                }
            ]
        });
    }

    async logLinkAttempt(discordUser, ip, success = false) {
        await this.sendLog('synchronization', {
            title: success ? 'Link Attempt' : 'Link Attempt Failed',
            description: success 
                ? 'A user initiated the link process.' 
                : 'A link attempt was unsuccessful.',
            color: success ? '#0099FF' : '#FF6B6B',
            icon: success ? '🔗' : '⚠️',
            fields: [
                { 
                    name: '🕐 Timestamp', 
                    value: `\`\`\`${new Date().toISOString()}\`\`\``,
                    inline: false 
                },
                { 
                    name: '👤 User', 
                    value: `\`\`\`${discordUser.tag}\`\`\``,
                    inline: true 
                },
                { 
                    name: '🆔 Discord ID', 
                    value: `\`\`\`${discordUser.id}\`\`\``,
                    inline: true 
                },
                { 
                    name: '\u200b', 
                    value: '\u200b',
                    inline: false 
                },
                { 
                    name: '🌐 IP Address', 
                    value: `\`\`\`${ip || 'N/A'}\`\`\``,
                    inline: true 
                },
                { 
                    name: '✅ Status', 
                    value: `\`\`\`${success ? 'Success' : 'Failed'}\`\`\``,
                    inline: true 
                }
            ]
        });
    }

    async logUnlink(targetUser, executor, userData) {
        await this.sendLog('synchronization', {
            title: 'Account Unlinked',
            description: 'An administrator has unlinked a user\'s account.',
            color: '#FF9800',
            icon: '🔓',
            fields: [
                { 
                    name: '🕐 Timestamp', 
                    value: `\`\`\`${new Date().toISOString()}\`\`\``,
                    inline: false 
                },
                { 
                    name: '👤 Target User', 
                    value: `\`\`\`${targetUser.tag}\`\`\``,
                    inline: true 
                },
                { 
                    name: '🆔 Discord ID', 
                    value: `\`\`\`${targetUser.id}\`\`\``,
                    inline: true 
                },
                { 
                    name: '\u200b', 
                    value: '\u200b',
                    inline: false 
                },
                { 
                    name: '🎮 Steam ID (Removed)', 
                    value: `\`\`\`${userData.steam_id || 'N/A'}\`\`\``,
                    inline: true 
                },
                { 
                    name: '📜 FiveM License (Removed)', 
                    value: `\`\`\`${userData.fivem_license || 'N/A'}\`\`\``,
                    inline: true 
                },
                { 
                    name: '\u200b', 
                    value: '\u200b',
                    inline: false 
                },
                { 
                    name: '👮 Executor', 
                    value: `\`\`\`${executor.tag}\`\`\``,
                    inline: true 
                },
                { 
                    name: '🆔 Executor ID', 
                    value: `\`\`\`${executor.id}\`\`\``,
                    inline: true 
                }
            ]
        });
    }

    async logSetupEmbed(executor, channel, guildId) {
        const isMainServer = guildId === webhookConfig.mainServer;
        
        await this.sendLog('synchronization', {
            title: 'Setup Embed Posted',
            description: `Synchronization embed has been posted in ${isMainServer ? 'main server' : 'test server'}.`,
            color: '#667eea',
            icon: '📋',
            fields: [
                { 
                    name: '🕐 Timestamp', 
                    value: `\`\`\`${new Date().toISOString()}\`\`\``,
                    inline: false 
                },
                { 
                    name: '👤 Posted By', 
                    value: `\`\`\`${executor.tag}\`\`\``,
                    inline: true 
                },
                { 
                    name: '🆔 Executor ID', 
                    value: `\`\`\`${executor.id}\`\`\``,
                    inline: true 
                },
                { 
                    name: '\u200b', 
                    value: '\u200b',
                    inline: false 
                },
                { 
                    name: '📺 Channel', 
                    value: `\`\`\`${channel.name}\`\`\``,
                    inline: true 
                },
                { 
                    name: '🏠 Server Type', 
                    value: `\`\`\`${isMainServer ? 'Main Server' : 'Test Server'}\`\`\``,
                    inline: true 
                }
            ]
        });
    }

    async logAuthenticationFailure(data) {
        await this.sendLog('authentication', {
            title: 'Authentication Failure',
            description: 'Access denied.',
            color: '#FF0000',
            icon: '⚙️',
            fields: [
                { 
                    name: '🕐 Timestamp', 
                    value: `\`\`\`${data.timestamp || new Date().toISOString()}\`\`\``,
                    inline: false 
                },
                { 
                    name: '🌐 IP Address', 
                    value: `\`\`\`${data.ip || 'N/A'}\`\`\``,
                    inline: true 
                },
                { 
                    name: '🔑 Session ID', 
                    value: `\`\`\`${data.sessionId || 'N/A'}\`\`\``,
                    inline: true 
                },
                { 
                    name: '\u200b', 
                    value: '\u200b',
                    inline: false 
                },
                { 
                    name: '🔄 Attempt', 
                    value: `\`\`\`${data.attempt || 1}\`\`\``,
                    inline: true 
                },
                { 
                    name: '👤 User', 
                    value: `\`\`\`${data.user || 'Unknown'}\`\`\``,
                    inline: true 
                },
                { 
                    name: '\u200b', 
                    value: '\u200b',
                    inline: false 
                },
                { 
                    name: '✖️ Reason', 
                    value: `\`\`\`${data.reason || 'Unknown'}\`\`\``,
                    inline: false 
                }
            ]
        });
    }
}

module.exports = new WebhookService();