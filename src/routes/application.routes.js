const express = require('express');
const { postApplication, getApplications, patchApplicationStatus, getStats, exportExcel } = require('../controllers/application.controller');
const { adminAuth } = require('../middlewares/auth');

const router = express.Router();

router.post('/', postApplication);
router.get('/', adminAuth, getApplications);
router.patch('/:id/status', adminAuth, patchApplicationStatus);
router.get('/stats', adminAuth, getStats);
router.get('/export/excel', adminAuth, exportExcel);

module.exports = router;
