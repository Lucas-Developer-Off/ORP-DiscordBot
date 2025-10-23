const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const authService = require('../services/authService');
const discordService = require('../services/discordService');
const User = require('../models/User');
const logger = require('../utils/helpers/logger');
const { COLORS } = require('../utils/helpers/constants');

class ButtonHandler {
    async handleInteraction(client, interaction) {
        if (!interaction.isButton()) return;

        try {
            if (interaction.customId === 'start_link_process') {
                await this.handleStartLinkProcess(client, interaction);
            } else if (interaction.customId === 'check_link_process') {
                await this.handleCheckLinkProcess(client, interaction);
            }
        } catch (error) {
            logger.error('Error handling button interaction', {
                buttonId: interaction.customId,
                user: interaction.user.tag,
                error: error.message,
                stack: error.stack
            });

            const errorEmbed = new EmbedBuilder()
                .setColor(COLORS.ERROR)
                .setTitle('`⛔`ㅤ|ㅤOups… une erreur est survenue')
                .setDescription(
                    '** **\n' +
                    'Une erreur inattendue s\'est produite.\n' +
                    '> Si le problème persiste, contactez un **développeur**.\n\n' +
                    '** **'
                )
                .setFooter({ text: 'Origin RolePlay © 2025 • All Rights Reserved' });

            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ embeds: [errorEmbed] }).catch(() => {});
            } else {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true }).catch(() => {});
            }
        }
    }

    async handleStartLinkProcess(client, interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const existingLink = await User.findByDiscordId(interaction.user.id);
            
            if (existingLink && existingLink.steam_id) {
                const alreadyLinkedEmbed = new EmbedBuilder()
                    .setColor(COLORS.ERROR)
                    .setTitle('`🔗`ㅤ|ㅤSynchronisation')
                    .setDescription(
                        '** **\n' +
                        'Votre compte **Discord** est déjà synchronisé avec **Steam**. Aucune action requise. Vous disposez de l\'accès complet au serveur.\n' +
                        '> Si vous pensez qu\'il s\'agit d\'une erreur, contactez un **développeur**.\n\n' +
                        '** **'
                    )
                    .setFooter({ text: 'Origin RolePlay © 2025 • All Rights Reserved' });

                return interaction.editReply({ embeds: [alreadyLinkedEmbed] });
            }

            const result = await authService.createLinkToken(
                interaction.user.id,
                interaction.user.tag
            );

            if (!result.success) {
                throw new Error(result.error);
            }

            const { token, expiresAt } = result.data;
            const linkUrl = `${process.env.WEB_URL || 'http://localhost:50000'}/auth/link?token=${token}`;
            const expiresInMinutes = Math.floor((new Date(expiresAt) - new Date()) / 60000);

            const embed = new EmbedBuilder()
                .setColor(COLORS.SUCCESS)
                .setTitle('`🔐`ㅤ|ㅤLien de synchronisation')
                .setDescription(
                    '** **\n' +
                    'Votre lien personnel a été généré avec succès !\n' +
                    '> Ce lien est **unique**, **temporaire** et **à usage unique**.\n\n' +
                    '** **'
                )
                .setFooter({ text: 'Origin RolePlay © 2025 • All Rights Reserved' });

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setStyle(ButtonStyle.Link)
                        .setLabel('ㅤ|ㅤOuvrir le lien')
                        .setURL(linkUrl)
                        .setEmoji('🔗')
                );

            await interaction.editReply({
                embeds: [embed],
                components: [row],
            });

            logger.success('Link token generated for user', {
                user: interaction.user.tag,
                userId: interaction.user.id,
                expiresInMinutes
            });
        } catch (error) {
            logger.error('Error in start link process', { 
                user: interaction.user.tag,
                error: error.message,
                stack: error.stack
            });
            
            const errorEmbed = new EmbedBuilder()
                .setColor(COLORS.ERROR)
                .setTitle('`⛔`ㅤ|ㅤOups… une erreur est survenue')
                .setDescription(
                    '** **\n' +
                    'Une erreur inattendue s\'est produite.\n' +
                    '> Si le problème persiste, contactez un **développeur**.\n\n' +
                    '** **'
                )
                .setFooter({ text: 'Origin RolePlay © 2025 • All Rights Reserved' });

            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }

    async handleCheckLinkProcess(client, interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const userData = await User.findByDiscordId(interaction.user.id);

            if (!userData || !userData.steam_id) {
                const notLinkedEmbed = new EmbedBuilder()
                    .setColor(COLORS.ERROR)
                    .setTitle('`❌`ㅤ|ㅤCompte non synchronisé')
                    .setDescription(
                        '** **\n' +
                        'Votre compte **Discord** n\'est pas encore synchronisé avec **Steam**.\n' +
                        '> Veuillez vous rendre sur le **serveur principal** pour effectuer la synchronisation.\n\n' +
                        '** **'
                    )
                    .setFooter({ text: 'Origin RolePlay © 2025 • All Rights Reserved' });

                logger.warn('User attempted verification without link', {
                    user: interaction.user.tag,
                    userId: interaction.user.id,
                    guild: interaction.guild?.name
                });

                return interaction.editReply({ embeds: [notLinkedEmbed] });
            }

            await discordService.updateMemberRoles(
                userData.discord_id,
                userData.discord_username
            );

            const linkedEmbed = new EmbedBuilder()
                .setColor(COLORS.SUCCESS)
                .setTitle('`✅`ㅤ|ㅤCompte synchronisé')
                .setDescription(
                    '** **\n' +
                    'Votre compte **Discord** est bien synchronisé avec **Steam**.\n' +
                    '> Vos rôles ont été actualisés. Vous disposez de l\'accès complet au serveur.\n\n' +
                    '** **'
                )
                .addFields(
                    { 
                        name: '👤 Utilisateur Discord', 
                        value: `\`${interaction.user.tag}\``,
                        inline: false 
                    },
                    { 
                        name: '🎮 Nom Steam', 
                        value: `\`${userData.steam_name || 'Non disponible'}\``,
                        inline: false 
                    }
                )
                .setFooter({ text: 'Origin RolePlay © 2025 • All Rights Reserved' });

            logger.success('User verified their link and roles updated', {
                user: interaction.user.tag,
                userId: interaction.user.id,
                guild: interaction.guild?.name,
                linked: true
            });

            await interaction.editReply({ embeds: [linkedEmbed] });

        } catch (error) {
            logger.error('Error in check link process', { 
                user: interaction.user.tag,
                error: error.message,
                stack: error.stack
            });
            
            const errorEmbed = new EmbedBuilder()
                .setColor(COLORS.ERROR)
                .setTitle('`⛔`ㅤ|ㅤOups… une erreur est survenue')
                .setDescription(
                    '** **\n' +
                    'Une erreur inattendue s\'est produite.\n' +
                    '> Si le problème persiste, contactez un **développeur**.\n\n' +
                    '** **'
                )
                .setFooter({ text: 'Origin RolePlay © 2025 • All Rights Reserved' });

            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
}

module.exports = new ButtonHandler();