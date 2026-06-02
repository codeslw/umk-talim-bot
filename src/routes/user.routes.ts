const express = require('express');
const { deleteUser, getUsers, patchUser } = require('../controllers/user.controller');
const { adminAuth } = require('../middlewares/auth');
const { asyncHandler } = require('../middlewares/asyncHandler');

const router = express.Router();

router.get('/', adminAuth, asyncHandler(getUsers));
router.patch('/:id', adminAuth, asyncHandler(patchUser));
router.delete('/:id', adminAuth, asyncHandler(deleteUser));

module.exports = router;
