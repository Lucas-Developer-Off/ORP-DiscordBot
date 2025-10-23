const { EmbedBuilder } = require('discord.js');
const logger = require('../../utils/helpers/logger');

module.exports = {
    name: 'ping',
    description: 'Check bot latency and response time',

    callback: async (client, interaction) => {
        try {
            await interaction.deferReply();

            const reply = await interaction.fetchReply();
            const ping = reply.createdTimestamp - interaction.createdTimestamp;

            const embed = new EmbedBuilder()
                .setColor('#00ff88')
                .setTitle('🏓 Pong!')
                .addFields(
                    { name: '📡 API Latency', value: `\`${ping}ms\``, inline: true },
                    { name: '💓 Websocket', value: `\`${client.ws.ping}ms\``, inline: true }
                )
                .setFooter({ text: `Requested by ${interaction.user.tag}` })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

            logger.info('Ping command executed', {
                user: interaction.user.tag,
                apiLatency: ping,
                websocket: client.ws.ping
            });
        } catch (error) {
            logger.error('Error in ping command', { error: error.message });
        }
    },
};