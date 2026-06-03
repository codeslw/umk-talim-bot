const express = require('express');
const { bootstrap, getAdmins, getAuthStatus, login, logout, patchAdmin, postAdmin } = require('../controllers/auth.controller');
const { adminAuth } = require('../middlewares/auth');
const { asyncHandler } = require('../middlewares/asyncHandler');

const router = express.Router();

router.get('/me', asyncHandler(getAuthStatus));
router.post('/bootstrap', asyncHandler(bootstrap));
router.post('/login', asyncHandler(login));
router.post('/logout', asyncHandler(logout));
router.get('/admins', adminAuth, asyncHandler(getAdmins));
router.post('/admins', adminAuth, asyncHandler(postAdmin));
router.patch('/admins/:id', adminAuth, asyncHandler(patchAdmin));

module.exports = router;
