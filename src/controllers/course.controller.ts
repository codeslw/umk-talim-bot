const { createCourse, deleteCourse, listActiveCourses, listAllCourses, updateCourse } = require('../services/course.service');

async function getCourses(req, res) {
  const includeInactive = String(req.query.includeInactive || '') === 'true';
  const courses = includeInactive ? await listAllCourses() : await listActiveCourses();
  res.json({ data: courses });
}

async function postCourse(req, res) {
  const course = await createCourse(req.body);
  res.status(201).json({ data: course });
}

async function patchCourse(req, res) {
  const course = await updateCourse(req.params.id, req.body);
  res.json({ data: course });
}

async function removeCourse(req, res) {
  const result = await deleteCourse(req.params.id);
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
}

module.exports = { getCourses, postCourse, patchCourse, removeCourse };
