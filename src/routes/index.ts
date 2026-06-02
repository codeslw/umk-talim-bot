const express = require('express');
const courseRoutes = require('./course.routes');
const applicationRoutes = require('./application.routes');
const userRoutes = require('./user.routes');
const settingsRoutes = require('./settings.routes');
const authRoutes = require('./auth.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/courses', courseRoutes);
router.use('/applications', applicationRoutes);
router.use('/users', userRoutes);
router.use('/settings', settingsRoutes);

module.exports = router;
