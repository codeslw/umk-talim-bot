const express = require('express');
const { getSchemas, putSchemas, getMeta } = require('../controllers/settings.controller');
const { adminAuth } = require('../middlewares/auth');
const { asyncHandler } = require('../middlewares/asyncHandler');

const router = express.Router();

router.get('/schemas', adminAuth, asyncHandler(getSchemas));
router.put('/schemas', adminAuth, asyncHandler(putSchemas));
router.get('/meta', adminAuth, asyncHandler(getMeta));

module.exports = router;
