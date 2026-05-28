const express = require('express');
const { getCourses, postCourse, removeCourse } = require('../controllers/course.controller');
const { adminAuth } = require('../middlewares/auth');

const router = express.Router();

router.get('/', getCourses);
router.post('/', adminAuth, postCourse);
router.delete('/:id', adminAuth, removeCourse);

module.exports = router;
