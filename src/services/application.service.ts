const {
  createApplication,
  deleteApplication,
  listApplications,
  updateApplication,
  updateApplicationStatus,
  updateApplicationNotificationReference,
  statistics
} = require('../repositories/applicationRepository');
const { getCourseById } = require('./course.service');
const { findUserByTelegramId, upsertTelegramUser } = require('../repositories/userRepository');
const { APPLICATION_STATUSES } = require('../constants/application');
const { calculateAge } = require('../utils/date');
const logger = require('../utils/logger');

type ApplicationQuery = {
  courseId?: string | number;
  status?: string;
  minAge?: string | number;
  maxAge?: string | number;
  city?: string;
};

type NotificationContext = {
  birthDate?: Date | string;
  source?: string;
};

function assertValidApplicationStatus(status) {
  if (!APPLICATION_STATUSES.includes(status)) {
    const error = new Error('Invalid status') as Error & { statusCode?: number };
    error.statusCode = 400;
    throw error;
  }
}

function buildApplicationFilters(query: ApplicationQuery = {}) {
  const where: Record<string, any> = {};

  if (query.courseId) where.courseId = Number(query.courseId);
  if (query.status) where.status = query.status;

  if (query.minAge || query.maxAge || query.city) {
    where.user = {};
    if (query.city) where.user.city = { contains: String(query.city), mode: 'insensitive' };

    if (query.minAge || query.maxAge) {
      where.user.age = {};
      if (query.minAge) where.user.age.gte = Number(query.minAge);
      if (query.maxAge) where.user.age.lte = Number(query.maxAge);
    }
  }

  return where;
}

function toApplicationCreateData(payload, userId) {
  return {
    userId,
    courseId: payload.courseId,
    experience: payload.experience,
    workplace: payload.workplace,
    educationType: payload.educationType,
    specialization: payload.specialization,
    learningGoal: payload.learningGoal,
    studyFormat: payload.studyFormat,
    studyTime: payload.studyTime,
    source: payload.source,
    comment: payload.comment === '-' ? null : payload.comment
  };
}

function normalizeApplicationUpdatePayload(payload = {}) {
  const allowedFields = [
    'courseId',
    'experience',
    'workplace',
    'educationType',
    'specialization',
    'learningGoal',
    'studyFormat',
    'studyTime',
    'source',
    'comment',
    'status'
  ];
  const data: Record<string, any> = {};

  for (const field of allowedFields) {
    if (payload[field] !== undefined) data[field] = payload[field] === '' ? null : payload[field];
  }

  if (data.courseId !== undefined) data.courseId = Number(data.courseId);
  if (data.status !== undefined) assertValidApplicationStatus(data.status);

  return data;
}

async function createCourseApplication(payload, notificationContext: NotificationContext = {}) {
  const age = payload.age || calculateAge(payload.birthDate);
  const user = await upsertTelegramUser({ ...payload, age });
  const application = await createApplication(toApplicationCreateData(payload, user.id));
  const course = application.course || await getCourseById(payload.courseId);

  try {
    const { notifyNewApplication } = require('./notification.service');
    const notification = await notifyNewApplication(
      application,
      user,
      course,
      notificationContext.birthDate || payload.birthDate,
      age
    );

    if (notification.channelMessage) {
      await updateApplicationNotificationReference(application.id, notification.channelMessage);
    }
  } catch (err) {
    logger.error('Failed to notify about new application', {
      err,
      applicationId: application.id,
      source: notificationContext.source || 'unknown'
    });
  }

  return { application, user, course, age };
}

async function changeApplicationStatus(id, status, changedBy) {
  assertValidApplicationStatus(status);
  const application = await updateApplicationStatus(Number(id), status);

  try {
    const { notifyApplicationStatusChanged } = require('./notification.service');
    await notifyApplicationStatusChanged(application, changedBy);
  } catch (err) {
    logger.error('Failed to notify about application status change', {
      err,
      applicationId: application.id
    });
  }

  return application;
}

function getApplications(query = {}) {
  return listApplications(buildApplicationFilters(query));
}

function editApplication(id, payload) {
  return updateApplication(Number(id), normalizeApplicationUpdatePayload(payload));
}

function removeApplication(id) {
  return deleteApplication(Number(id));
}

function getApplicationStats() {
  return statistics();
}

module.exports = {
  assertValidApplicationStatus,
  buildApplicationFilters,
  createCourseApplication,
  changeApplicationStatus,
  editApplication,
  removeApplication,
  getApplications,
  getApplicationStats,
  findUserByTelegramId
};
