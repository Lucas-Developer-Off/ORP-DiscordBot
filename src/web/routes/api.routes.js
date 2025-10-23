const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const errorMiddleware = require('../../middleware/errorMiddleware');

router.get(
    '/session',
    errorMiddleware.asyncHandler(authController.getSession.bind(authController))
);

module.exports = router;