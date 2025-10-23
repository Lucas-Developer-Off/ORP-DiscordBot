const path = require('path');
const fs = require('fs');
const logger = require('../utils/helpers/logger');

function getAllFiles(directory, foldersOnly = false) {
    let fileNames = [];

    if (!fs.existsSync(directory)) {
        logger.warn('Directory does not exist', { directory });
        return fileNames;
    }

    const files = fs.readdirSync(directory, { withFileTypes: true });

    for (const file of files) {
        const filePath = path.join(directory, file.name);

        if (foldersOnly) {
            if (file.isDirectory()) {
                fileNames.push(filePath);
            }
        } else {
            if (file.isFile() && file.name.endsWith('.js')) {
                fileNames.push(filePath);
            }
        }
    }

    return fileNames;
}

module.exports = (client) => {
    try {
        const eventsPath = path.join(__dirname, '..', 'events');
        
        if (!fs.existsSync(eventsPath)) {
            logger.error('Events directory not found', { path: eventsPath });
            return;
        }

        let totalHandlers = 0;

        // Parcourir les catégories (client, guild, interactions)
        const eventCategories = getAllFiles(eventsPath, true);
        
        for (const categoryPath of eventCategories) {
            const categoryName = path.basename(categoryPath);
            
            // Parcourir les dossiers d'événements dans chaque catégorie
            const eventFolders = getAllFiles(categoryPath, true);
            
            for (const eventFolder of eventFolders) {
                const eventName = path.basename(eventFolder);
                const eventFiles = getAllFiles(eventFolder, false).sort();

                if (eventFiles.length === 0) {
                    continue;
                }

                // Enregistrer l'événement Discord
                client.on(eventName, async (...args) => {
                    for (const eventFile of eventFiles) {
                        try {
                            // Vider le cache pour forcer le rechargement
                            delete require.cache[require.resolve(eventFile)];
                            const eventFunction = require(eventFile);
                            await eventFunction(client, ...args);
                        } catch (error) {
                            logger.error('Error executing event handler', {
                                event: eventName,
                                file: path.basename(eventFile),
                                error: error.message,
                                stack: error.stack
                            });
                        }
                    }
                });

                totalHandlers += eventFiles.length;
                
                logger.info('Event registered', { 
                    category: categoryName,
                    event: eventName, 
                    handlers: eventFiles.length 
                });
            }
        }

        logger.success('All events loaded', { totalHandlers });
        
    } catch (error) {
        logger.error('Fatal error loading events', { 
            error: error.message,
            stack: error.stack 
        });
        throw error;
    }
};