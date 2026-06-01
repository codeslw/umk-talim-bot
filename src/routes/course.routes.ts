const express = require('express');
const { getCourses, postCourse, removeCourse } = require('../controllers/course.controller');
const { adminAuth } = require('../middlewares/auth');
const { asyncHandler } = require('../middlewares/asyncHandler');

const router = express.Router();

router.get('/', asyncHandler(getCourses));
router.post('/', adminAuth, asyncHandler(postCourse));
router.delete('/:id', adminAuth, asyncHandler(removeCourse));

module.exports = router;
