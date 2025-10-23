const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../../middleware/authMiddleware');
const errorMiddleware = require('../../middleware/errorMiddleware');

router.get(
    '/link',
    authMiddleware.requireToken,
    errorMiddleware.asyncHandler(authController.initiateLink.bind(authController))
);

router.get(
    '/steam/callback',
    authMiddleware.requireDiscordSession,
    errorMiddleware.asyncHandler(authController.handleSteamCallback.bind(authController))
);

router.post(
    '/logout',
    authMiddleware.requireSession,
    errorMiddleware.asyncHandler(authController.logout.bind(authController))
);

module.exports = router;