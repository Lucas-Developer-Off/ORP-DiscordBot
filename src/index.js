require('dotenv').config();
const { Client, IntentsBitField } = require('discord.js');
const eventHandler = require('./handlers/eventHandler');
const { initializeDatabase, setupGracefulShutdown } = require('./handlers/databaseHandler');
const { startServer } = require('./web/server');
const logger = require('./utils/helpers/logger');

const client = new Client({
    intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.MessageContent,
    ],
});

(async () => {
    try {
        logger.info('Sentryn Starting...');
        
        // 1. Initialiser la base de données
        logger.info('Connecting to database...');
        await initializeDatabase();
        
        // 2. Charger les gestionnaires d'événements
        logger.info('Loading event handlers...');
        eventHandler(client);
        
        // 3. Se connecter à Discord
        logger.info('Connecting to Discord...');
        await client.login(process.env.TOKEN);
        
        // 4. Attendre que le bot soit prêt
        await new Promise(resolve => {
            client.once('clientReady', resolve);
        });
        
        // 5. Démarrer le serveur web
        logger.info('Starting web server...');
        startServer(client);
        
        // 6. Configurer l'arrêt propre
        setupGracefulShutdown();
        
        logger.success('Sentryn is fully operational!');
        
    } catch (error) {
        logger.error('Fatal error during startup', { 
            error: error.message,
            stack: error.stack 
        });
        process.exit(1);
    }
})();