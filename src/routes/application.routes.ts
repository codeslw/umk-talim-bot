const express = require('express');
const {
  postApplication,
  getApplications,
  patchApplication,
  patchApplicationStatus,
  deleteApplication,
  getStats,
  exportExcel
} = require('../controllers/application.controller');
const { adminAuth } = require('../middlewares/auth');
const { asyncHandler } = require('../middlewares/asyncHandler');

const router = express.Router();

router.post('/', asyncHandler(postApplication));
router.get('/', adminAuth, asyncHandler(getApplications));
router.patch('/:id', adminAuth, asyncHandler(patchApplication));
router.patch('/:id/status', adminAuth, asyncHandler(patchApplicationStatus));
router.delete('/:id', adminAuth, asyncHandler(deleteApplication));
router.get('/stats', adminAuth, asyncHandler(getStats));
router.get('/export/excel', adminAuth, asyncHandler(exportExcel));

module.exports = router;
