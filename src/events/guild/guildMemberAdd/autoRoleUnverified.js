const discordService = require('../../../services/discordService');
const logger = require('../../../utils/helpers/logger');

module.exports = async (client, member) => {
    try {
        await discordService.addUnverifiedRole(member);
        logger.info('Auto role applied', {
            user: member.user.tag,
            guild: member.guild.name
        });
    } catch (error) {
        logger.error('Error in guildMemberAdd', { error: error.message });
    }
};