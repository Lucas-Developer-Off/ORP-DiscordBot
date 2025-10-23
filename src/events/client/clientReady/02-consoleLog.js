const logger = require('../../../utils/helpers/logger');

module.exports = (client) => {
    logger.success('Discord bot ready', {
        username: client.user.tag,
        id: client.user.id,
        servers: client.guilds.cache.size
    });
};