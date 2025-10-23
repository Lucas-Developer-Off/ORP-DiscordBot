const commandHandler = require('../../../handlers/commandHandler');

module.exports = async (client, interaction) => {
    await commandHandler.handleInteraction(client, interaction);
};