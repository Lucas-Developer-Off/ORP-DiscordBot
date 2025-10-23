const fs = require('fs');
const path = require('path');

class Logger {
    constructor() {
        this.logsDir = path.join(__dirname, '../../../logs');
        this.ensureLogsDirectory();
    }

    ensureLogsDirectory() {
        if (!fs.existsSync(this.logsDir)) {
            fs.mkdirSync(this.logsDir, { recursive: true });
        }
    }

    formatMessage(level, message, data = null) {
        const timestamp = new Date().toISOString();
        const dataStr = data ? ` | ${JSON.stringify(data)}` : '';
        return `[${timestamp}] [${level.toUpperCase()}] ${message}${dataStr}`;
    }

    writeToFile(filename, message) {
        const filePath = path.join(this.logsDir, filename);
        fs.appendFileSync(filePath, message + '\n', 'utf8');
    }

    log(level, message, data = null) {
        const formattedMessage = this.formatMessage(level, message, data);
        
        console.log(formattedMessage);
        
        this.writeToFile('combined.log', formattedMessage);
        
        if (level === 'error') {
            this.writeToFile('error.log', formattedMessage);
        }
    }

    info(message, data = null) {
        this.log('info', message, data);
    }

    warn(message, data = null) {
        this.log('warn', message, data);
    }

    error(message, data = null) {
        this.log('error', message, data);
    }

    success(message, data = null) {
        this.log('success', message, data);
    }

    debug(message, data = null) {
        if (process.env.NODE_ENV === 'development') {
            this.log('debug', message, data);
        }
    }
}

module.exports = new Logger();