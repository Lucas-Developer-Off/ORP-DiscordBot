const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const User = require('../../models/User');
const authService = require('../../services/authService');
const logger = require('../../utils/helpers/logger');
const { COLORS } = require('../../utils/helpers/constants');
const serverConfig = require('../../../config/server.config.json');

module.exports = {
    name: 'synchronization',
    description: 'Gérer le système de liaison Discord & Steam',
    
    options: [
        {
            name: 'setup',
            description: 'Publier l\'embed public de liaison',
            type: 1,
            default_member_permissions: PermissionFlagsBits.ManageGuild.toString(),
        },

        {
            name: 'info',
            description: 'Voir les informations de liaison d\'un utilisateur',
            type: 1,
            options: [
                {
                    name: 'user',
                    description: 'L\'utilisateur à vérifier (optionnel)',
                    type: 6,
                    required: false,
                },
            ],
        },
        {
            name: 'unlink',
            description: 'Délier le compte d\'un utilisateur',
            type: 1,
            default_member_permissions: PermissionFlagsBits.ManageGuild.toString(),
            options: [
                {
                    name: 'user',
                    description: 'L\'utilisateur à délier',
                    type: 6,
                    required: true,
                },
            ],
        },
    ],

    callback: async (client, interaction) => {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'setup') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
                return interaction.reply({
                    content: '❌ Vous n\'avez pas les permissions nécessaires pour utiliser cette commande.',
                    ephemeral: true
                });
            }
            await handleSetup(client, interaction);
        } else if (subcommand === 'info') {
            await handleInfo(interaction);
        } else if (subcommand === 'unlink') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
                return interaction.reply({
                    content: '❌ Vous n\'avez pas les permissions nécessaires pour utiliser cette commande.',
                    ephemeral: true
                });
            }
            await handleUnlink(interaction);
        }
    },
};

async function handleSetup(client, interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
        const isMainServer = interaction.guild.id === serverConfig.mainServer;
        
        const embed = new EmbedBuilder()
            .setColor(COLORS.ORIGIN)
            .setTitle('`🔗`ㅤ|ㅤSynchronisation')
            .setDescription(
                '** **\n' +
                (isMainServer 
                    ? 'Reliez votre **compte Discord** à **Steam** pour vérifier votre identité, garantir la sécurité de votre profil et obtenir un accès complet au serveur.'
                    : 'Vérifiez la **synchronisation** entre votre compte **Discord** et votre compte **Steam** afin de confirmer votre identité et assurer la sécurité de votre profil.') +
                '\n\n** **'
            )
            .setFooter({ text: 'Origin RolePlay © 2025 • All Rights Reserved' });
        
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(isMainServer ? 'start_link_process' : 'check_link_process')
                    .setLabel(isMainServer ? 'ㅤ|ㅤLier mon compte' : 'ㅤ|ㅤVérifier mon compte')
                    .setEmoji('🔗')
                    .setStyle(ButtonStyle.Success)
            );

        await interaction.channel.send({
            embeds: [embed],
            components: [row],
        });

        const successEmbed = new EmbedBuilder()
            .setColor(COLORS.SUCCESS)
            .setTitle('`✅`ㅤ|ㅤOpération réussie')
            .setDescription(
                '** **\n' +
                `Action effectuée avec succès.\n` +
                '> Vous pouvez poursuivre.\n\n' +
                '** **'
            )
            .setFooter({ text: 'Origin RolePlay © 2025 • All Rights Reserved' });

        await interaction.editReply({
            embeds: [successEmbed],
        });

        logger.info('Link embed posted', {
            postedBy: interaction.user.tag,
            channel: interaction.channel?.name,
            guild: interaction.guild?.name,
            isMainServer
        });
    } catch (error) {
        logger.error('Error posting link embed', { 
            error: error.message,
            user: interaction.user.tag,
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

        await interaction.editReply({
            embeds: [errorEmbed],
        });
    }
}

async function handleInfo(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.ManageGuild);
        const isSelf = targetUser.id === interaction.user.id;

        if (!isSelf && !isAdmin) {
            const noPermEmbed = new EmbedBuilder()
                .setColor(COLORS.ERROR)
                .setTitle('`🔒`ㅤ|ㅤAccès refusé')
                .setDescription(
                    '** **\n' +
                    'Vous ne pouvez consulter que vos propres informations.\n' +
                    '> Seuls les **administrateurs** peuvent consulter les informations d\'autres utilisateurs.\n\n' +
                    '** **'
                )
                .setFooter({ text: 'Origin RolePlay © 2025 • All Rights Reserved' });

            logger.warn('Unauthorized info access attempt', {
                user: interaction.user.tag,
                targetUser: targetUser.tag
            });

            return interaction.editReply({
                embeds: [noPermEmbed],
            });
        }

        const userData = await User.findByDiscordId(targetUser.id);

        if (!userData) {
            const notFoundEmbed = new EmbedBuilder()
                .setColor(COLORS.ERROR)
                .setTitle('`❌`ㅤ|ㅤAucune liaison trouvée')
                .setDescription(
                    '** **\n' +
                    `L'utilisateur **${targetUser}** n'a pas encore lié son compte.\n` +
                    '> Si vous pensez qu\'il s\'agit d\'une erreur, contactez un **développeur**.\n\n' +
                    '** **'
                )
                .setFooter({ text: 'Origin RolePlay © 2025 • All Rights Reserved' });

            return interaction.editReply({
                embeds: [notFoundEmbed],
            });
        }

        const linkedDate = Math.floor(new Date(userData.linked_at).getTime() / 1000);
        const updatedDate = Math.floor(new Date(userData.updated_at).getTime() / 1000);

        const embed = new EmbedBuilder()
            .setColor(COLORS.SUCCESS)
            .setTitle('`🔍`ㅤ|ㅤLiaison trouvée avec succès')
            .setFooter({ text: 'Origin RolePlay © 2025 • All Rights Reserved' });

        if (isAdmin) {
            embed.setDescription(
                '** **\n' +
                `> Données de synchronisation de l'utilisateur **${targetUser}**.\n\n` +
                '👤ㅤ__**Discord**__\n\n' +
                `**ID :** ||\`${userData.discord_id}\`||\n` +
                `**Name :** ||\`${targetUser.tag}\`||\n\n` +
                '🎮ㅤ__**Steam**__\n\n' +
                `**ID :** ||\`${userData.steam_id}\`||\n` +
                `**Name :** ||\`${userData.steam_name || 'N/A'}\`||\n\n` +
                '🎯ㅤ__**FiveM**__\n\n' +
                `**License :** ||\`${userData.fivem_license || 'En attente'}\`||\n` +
                `**Hardware ID :** ||\`${userData.hardware_id || 'En attente'}\`||\n\n` +
                '🕓ㅤ__**Horodatage**__\n\n' +
                `**Lié le :** <t:${linkedDate}:F>\n` +
                `**Mis à jour :** <t:${updatedDate}:R>\n\n` +
                '** **'
            );
        } else {
            embed.setDescription(
                '** **\n' +
                `> Vos données de synchronisation.\n\n` +
                '👤ㅤ__**Discord**__\n\n' +
                `**Name :** \`${targetUser.tag}\`\n\n` +
                '🎮ㅤ__**Steam**__\n\n' +
                `**Name :** \`${userData.steam_name || 'N/A'}\`\n\n` +
                '🕓ㅤ__**Horodatage**__\n\n' +
                `**Lié le :** <t:${linkedDate}:F>\n` +
                `**Mis à jour :** <t:${updatedDate}:R>\n\n` +
                '** **'
            );
        }

        await interaction.editReply({ embeds: [embed] });

        logger.info('Link info checked', {
            checkedBy: interaction.user.tag,
            targetUser: targetUser.tag,
            isAdmin
        });
    } catch (error) {
        logger.error('Error getting user info', { 
            error: error.message,
            user: interaction.user.tag,
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

        await interaction.editReply({
            embeds: [errorEmbed],
        });
    }
}

async function handleUnlink(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
        const targetUser = interaction.options.getUser('user');
        const userData = await User.findByDiscordId(targetUser.id);

        if (!userData) {
            const notFoundEmbed = new EmbedBuilder()
                .setColor(COLORS.ERROR)
                .setTitle('`❌`ㅤ|ㅤAucune liaison trouvée')
                .setDescription(
                    '** **\n' +
                    `L'utilisateur **${targetUser.tag}** n'a pas de compte lié.\n\n` +
                    '** **'
                )
                .setFooter({ text: 'Origin RolePlay © 2025 • All Rights Reserved' });

            return interaction.editReply({
                embeds: [notFoundEmbed],
            });
        }

        const unlinkResult = await authService.unlinkUser(targetUser.id);

        if (!unlinkResult.success) {
            throw new Error(unlinkResult.error);
        }

        const successEmbed = new EmbedBuilder()
            .setColor(COLORS.SUCCESS)
            .setTitle('`✅`ㅤ|ㅤOpération réussie')
            .setDescription(
                '** **\n' +
                'Action effectuée avec succès.\n' +
                '> Vous pouvez poursuivre.\n\n' +
                '** **'
            )
            .setFooter({ text: 'Origin RolePlay © 2025 • All Rights Reserved' });

        await interaction.editReply({
            embeds: [successEmbed],
        });

        logger.success('User unlinked', {
            unlinkedBy: interaction.user.tag,
            targetUser: targetUser.tag,
            steamId: userData.steam_id
        });
    } catch (error) {
        logger.error('Error unlinking user', { 
            error: error.message,
            user: interaction.user.tag,
            stack: error.stack
        });
        
        const errorEmbed = new EmbedBuilder()
            .setColor(COLORS.ERROR)
            .setTitle('`⛔`ㅤ|ㅤOups… une erreur est survenue')
            .setDescription(
                '** **\n' +
                'Une erreur s\'est produite lors du processus de déliaison.\n' +
                '> Si le problème persiste, contactez un **développeur**.\n\n' +
                '** **'
            )
            .setFooter({ text: 'Origin RolePlay © 2025 • All Rights Reserved' });

        await interaction.editReply({
            embeds: [errorEmbed],
        });
    }
}