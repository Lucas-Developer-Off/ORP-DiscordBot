const session = require('express-session');
const { SESSION_MAX_AGE } = require('../utils/helpers/constants');

function createSessionMiddleware() {
    const BASE_URL = process.env.WEB_URL || `http://localhost:${process.env.WEB_PORT || 50000}`;
    
    return session({
        secret: process.env.SESSION_SECRET || 'your-secret-key-change-this',
        resave: false,
        saveUninitialized: false,
        proxy: true,
        cookie: { 
            maxAge: SESSION_MAX_AGE,
            secure: BASE_URL.startsWith('https'),
            sameSite: 'lax',
            httpOnly: true
        },
        name: 'arcane.sid'
    });
}

module.exports = createSessionMiddleware;