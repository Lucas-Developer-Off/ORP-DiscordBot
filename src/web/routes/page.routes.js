const express = require('express');
const router = express.Router();
const pageController = require('../controllers/pageController');
const authMiddleware = require('../../middleware/authMiddleware');

router.get('/', pageController.show404);

router.get(
    '/success',
    authMiddleware.requireCompletedLink,
    pageController.showSuccess
);

module.exports = router;