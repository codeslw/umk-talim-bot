const express = require('express');
const courseRoutes = require('./course.routes');
const applicationRoutes = require('./application.routes');

const router = express.Router();

router.use('/courses', courseRoutes);
router.use('/applications', applicationRoutes);

module.exports = router;
