const express = require('express');
const { getCourses, postCourse, patchCourse, removeCourse, uploadCourseImage } = require('../controllers/course.controller');
const { adminAuth } = require('../middlewares/auth');
const { asyncHandler } = require('../middlewares/asyncHandler');

const router = express.Router();

router.get('/', asyncHandler(getCourses));
router.post('/image', adminAuth, uploadCourseImage);
router.post('/', adminAuth, asyncHandler(postCourse));
router.patch('/:id', adminAuth, asyncHandler(patchCourse));
router.delete('/:id', adminAuth, asyncHandler(removeCourse));

module.exports = router;
