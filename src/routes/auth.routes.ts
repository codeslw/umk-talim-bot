const express = require('express');
const { bootstrap, getAuthStatus, login, logout } = require('../controllers/auth.controller');
const { asyncHandler } = require('../middlewares/asyncHandler');

const router = express.Router();

router.get('/me', asyncHandler(getAuthStatus));
router.post('/bootstrap', asyncHandler(bootstrap));
router.post('/login', asyncHandler(login));
router.post('/logout', asyncHandler(logout));

module.exports = router;
