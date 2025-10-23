const serverConfig = require('../../config/server.config.json');
const getLocalCommands = require('../utils/commands/getLocalCommands');
const logger = require('../utils/helpers/logger');

class CommandHandler {
    constructor() {
        this.commands = new Map();
    }

    async handleInteraction(client, interaction) {
        if (!interaction.isChatInputCommand()) return;

        const localCommands = getLocalCommands();

        try {
            const commandObject = localCommands.find(
                (cmd) => cmd.name === interaction.commandName
            );

            if (!commandObject) {
                logger.warn('Unknown command executed', { 
                    command: interaction.commandName,
                    user: interaction.user.tag
                });
                return;
            }

            if (commandObject.devOnly) {
                if (!serverConfig.devs.includes(interaction.member.id)) {
                    await interaction.reply({
                        content: '❌ This command is only available to developers.',
                        ephemeral: true,
                    });
                    logger.warn('Dev-only command attempted', {
                        command: interaction.commandName,
                        user: interaction.user.tag
                    });
                    return;
                }
            }

            if (commandObject.testOnly) {
                if (interaction.guild.id !== serverConfig.testServer) {
                    await interaction.reply({
                        content: '❌ This command cannot be used in this server.',
                        ephemeral: true,
                    });
                    logger.warn('Test-only command attempted in wrong server', {
                        command: interaction.commandName,
                        guild: interaction.guild.name
                    });
                    return;
                }
            }

            if (commandObject.permissionsRequired?.length) {
                for (const permission of commandObject.permissionsRequired) {
                    if (!interaction.member.permissions.has(permission)) {
                        await interaction.reply({
                            content: '❌ You do not have the required permissions to use this command.',
                            ephemeral: true,
                        });
                        logger.warn('Insufficient permissions for command', {
                            command: interaction.commandName,
                            user: interaction.user.tag,
                            missingPermission: permission
                        });
                        return;
                    }
                }
            }

            if (commandObject.botPermissions?.length) {
                for (const permission of commandObject.botPermissions) {
                    const bot = interaction.guild.members.me;

                    if (!bot.permissions.has(permission)) {
                        await interaction.reply({
                            content: '❌ I do not have the required permissions to execute this command.',
                            ephemeral: true,
                        });
                        logger.warn('Bot missing permissions for command', {
                            command: interaction.commandName,
                            missingPermission: permission
                        });
                        return;
                    }
                }
            }

            logger.info('Command executed', {
                command: interaction.commandName,
                user: interaction.user.tag,
                guild: interaction.guild?.name || 'DM'
            });

            await commandObject.callback(client, interaction);
        } catch (error) {
            logger.error('Error executing command', {
                command: interaction.commandName,
                error: error.message,
                stack: error.stack
            });

            const errorMessage = {
                content: '❌ An error occurred while executing this command.',
                ephemeral: true,
            };

            if (interaction.deferred || interaction.replied) {
                await interaction.editReply(errorMessage);
            } else {
                await interaction.reply(errorMessage);
            }
        }
    }
}

module.exports = new CommandHandler();