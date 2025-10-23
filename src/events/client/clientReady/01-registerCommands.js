const serverConfig = require('../../../../config/server.config.json');
const areCommandsDifferent = require('../../../utils/commands/areCommandsDifferent');
const getApplicationCommands = require('../../../utils/commands/getApplicationCommands');
const getLocalCommands = require('../../../utils/commands/getLocalCommands');
const logger = require('../../../utils/helpers/logger');

module.exports = async (client) => {
    try {
        const localCommands = getLocalCommands();
        const applicationCommands = await getApplicationCommands(
            client,
            serverConfig.testServer
        );

        for (const localCommand of localCommands) {
            const { name, description, options } = localCommand;

            const existingCommand = await applicationCommands.cache.find(
                (cmd) => cmd.name === name
            );

            if (existingCommand) {
                if (localCommand.deleted) {
                    await applicationCommands.delete(existingCommand.id);
                    logger.info('Command deleted', { command: name });
                    continue;
                }

                if (areCommandsDifferent(existingCommand, localCommand)) {
                    await applicationCommands.edit(existingCommand.id, {
                        description,
                        options,
                    });
                    logger.info('Command updated', { command: name });
                }
            } else {
                if (localCommand.deleted) {
                    logger.debug('Skipped deleted command', { command: name });
                    continue;
                }

                await applicationCommands.create({
                    name,
                    description,
                    options,
                });
                logger.success('Command registered', { command: name });
            }
        }
    } catch (error) {
        logger.error('Error registering commands', { error: error.message });
    }
};