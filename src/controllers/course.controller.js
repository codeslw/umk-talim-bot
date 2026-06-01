const { createCourse, deleteCourse, listActiveCourses } = require('../repositories/courseRepository');

async function getCourses(req, res, next) {
  try {
    const courses = await listActiveCourses();
    res.json({ data: courses });
  } catch (err) {
    next(err);
  }
}

async function postCourse(req, res, next) {
  try {
    const course = await createCourse(req.body);
    res.status(201).json({ data: course });
  } catch (err) {
    next(err);
  }
}

async function removeCourse(req, res, next) {
  try {
    const result = await deleteCourse(Number(req.params.id));
    if (result.deleted) {
      res.status(204).send();
      return;
    }

    res.status(200).json({
      data: result.course,
      deleted: false,
      deactivated: true,
      applicationCount: result.applicationCount,
      message: 'Course has applications and was deactivated instead of deleted.'
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getCourses, postCourse, removeCourse };
