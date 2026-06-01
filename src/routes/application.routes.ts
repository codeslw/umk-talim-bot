const express = require('express');
const { postApplication, getApplications, patchApplicationStatus, getStats, exportExcel } = require('../controllers/application.controller');
const { adminAuth } = require('../middlewares/auth');
const { asyncHandler } = require('../middlewares/asyncHandler');

const router = express.Router();

router.post('/', asyncHandler(postApplication));
router.get('/', adminAuth, asyncHandler(getApplications));
router.patch('/:id/status', adminAuth, asyncHandler(patchApplicationStatus));
router.get('/stats', adminAuth, asyncHandler(getStats));
router.get('/export/excel', adminAuth, asyncHandler(exportExcel));

module.exports = router;
