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
    await deleteCourse(Number(req.params.id));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { getCourses, postCourse, removeCourse };
