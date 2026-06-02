const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { createCourse, deleteCourse, listActiveCourses, listAllCourses, updateCourse } = require('../services/course.service');

const uploadsDir = path.resolve(process.cwd(), 'uploads/course-images');
fs.mkdirSync(uploadsDir, { recursive: true });
const upload = multer({
  dest: uploadsDir,
  limits: { fileSize: 8 * 1024 * 1024 }
});

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

function uploadCourseImage(req, res, next) {
  upload.single('image')(req, res, (err) => {
    if (err) return next(err);
    if (!req.file) {
      res.status(400).json({ error: 'Image file is required' });
      return;
    }

    const ext = path.extname(req.file.originalname || '').toLowerCase();
    const finalPath = ext && !req.file.path.endsWith(ext) ? `${req.file.path}${ext}` : req.file.path;
    if (finalPath !== req.file.path) fs.renameSync(req.file.path, finalPath);

    res.status(201).json({ data: { fileId: finalPath } });
  });
}

module.exports = { getCourses, postCourse, patchCourse, removeCourse, uploadCourseImage };
