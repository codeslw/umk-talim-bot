const courseRepository = require('../repositories/courseRepository');
const {
  COURSE_BOOLEAN_FIELDS,
  COURSE_DEFAULTS,
  COURSE_INTEGER_FIELDS,
  COURSE_OPTIONAL_FIELDS
} = require('../constants/course');
const {
  parseBoolean,
  parseInteger,
  toOptionalString,
  toRequiredString
} = require('../utils/normalize');

type CoursePayload = Record<string, any>;

function normalizeCoursePayload(data: CoursePayload = {}, { partial = false } = {}) {
  const payload: CoursePayload = {};

  if (!partial || data.title !== undefined) {
    payload.title = toRequiredString(data.title);
  }

  if (!partial || data.format !== undefined) {
    payload.format = toRequiredString(data.format);
  }

  for (const field of COURSE_OPTIONAL_FIELDS) {
    if (!partial || data[field] !== undefined) {
      payload[field] = toOptionalString(data[field]);
    }
  }

  for (const field of COURSE_INTEGER_FIELDS) {
    if (!partial || data[field] !== undefined) {
      payload[field] = parseInteger(data[field], COURSE_DEFAULTS[field]);
    }
  }

  for (const field of COURSE_BOOLEAN_FIELDS) {
    if (!partial || data[field] !== undefined) {
      payload[field] = parseBoolean(data[field], COURSE_DEFAULTS[field]);
    }
  }

  return payload;
}

function listActiveCourses() {
  return courseRepository.listActiveCourses();
}

function listAllCourses() {
  return courseRepository.listAllCourses();
}

function getCourseById(id) {
  return courseRepository.getCourseById(Number(id));
}

function getActiveCourseById(id) {
  return courseRepository.getActiveCourseById(Number(id));
}

function createCourse(data) {
  return courseRepository.createCourse(normalizeCoursePayload(data));
}

function updateCourse(id, data) {
  return courseRepository.updateCourse(Number(id), normalizeCoursePayload(data, { partial: true }));
}

function deleteCourse(id) {
  return courseRepository.deleteCourse(Number(id));
}

module.exports = {
  normalizeCoursePayload,
  listActiveCourses,
  listAllCourses,
  getCourseById,
  getActiveCourseById,
  createCourse,
  updateCourse,
  deleteCourse
};
