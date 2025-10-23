const buttonHandler = require('../../../handlers/buttonHandler');

module.exports = async (client, interaction) => {
    await buttonHandler.handleInteraction(client, interaction);
};