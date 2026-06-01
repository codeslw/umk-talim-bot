const prisma = require('../config/prisma');

function parseBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (value == null) return fallback;

  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'y', 'on', 'да', 'ha'].includes(normalized)) return true;
  if (['false', '0', 'no', 'n', 'off', 'нет', "yo'q"].includes(normalized)) return false;
  return fallback;
}

function parseInteger(value, fallback) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function listActiveCourses() {
  return prisma.course.findMany({ where: { isActive: true }, orderBy: { createdAt: 'asc' } });
}

async function createCourse(data) {
  const payload = {
    ...data,
    title: String(data.title || '').trim(),
    educationType: data.educationType ? String(data.educationType).trim() : null,
    format: String(data.format || '').trim(),
    duration: data.duration ? String(data.duration).trim() : null,
    cost: data.cost ? String(data.cost).trim() : null,
    additionalInfo: data.additionalInfo ? String(data.additionalInfo).trim() : null,
    imageFileId: data.imageFileId ? String(data.imageFileId).trim() : null,
    ageMin: parseInteger(data.ageMin, 18),
    ageMax: parseInteger(data.ageMax, 45),
    hasPractice: parseBoolean(data.hasPractice, false),
    canPayInInstallments: parseBoolean(data.canPayInInstallments, false),
    isActive: parseBoolean(data.isActive, true)
  };

  return prisma.course.create({ data: payload });
}

async function updateCourse(id, data) {
  const payload = {};
  if (data.title !== undefined) payload.title = String(data.title).trim();
  if (data.educationType !== undefined) payload.educationType = data.educationType ? String(data.educationType).trim() : null;
  if (data.format !== undefined) payload.format = String(data.format).trim();
  if (data.duration !== undefined) payload.duration = data.duration ? String(data.duration).trim() : null;
  if (data.cost !== undefined) payload.cost = data.cost ? String(data.cost).trim() : null;
  if (data.additionalInfo !== undefined) payload.additionalInfo = data.additionalInfo ? String(data.additionalInfo).trim() : null;
  if (data.imageFileId !== undefined) payload.imageFileId = data.imageFileId ? String(data.imageFileId).trim() : null;
  if (data.ageMin !== undefined) payload.ageMin = parseInteger(data.ageMin, 18);
  if (data.ageMax !== undefined) payload.ageMax = parseInteger(data.ageMax, 45);
  if (data.hasPractice !== undefined) payload.hasPractice = parseBoolean(data.hasPractice, false);
  if (data.canPayInInstallments !== undefined) payload.canPayInInstallments = parseBoolean(data.canPayInInstallments, false);
  if (data.isActive !== undefined) payload.isActive = parseBoolean(data.isActive, true);

  return prisma.course.update({ where: { id }, data: payload });
}

async function getCourseById(id) {
  return prisma.course.findUnique({ where: { id } });
}

async function listAllCourses() {
  return prisma.course.findMany({ orderBy: { createdAt: 'desc' } });
}

async function deleteCourse(id) {
  const applicationCount = await prisma.application.count({ where: { courseId: id } });

  if (applicationCount > 0) {
    const course = await prisma.course.update({
      where: { id },
      data: { isActive: false }
    });
    return { course, deleted: false, deactivated: true, applicationCount };
  }

  try {
    const course = await prisma.course.delete({ where: { id } });
    return { course, deleted: true, deactivated: false, applicationCount: 0 };
  } catch (err) {
    if (err.code === 'P2003') {
      const latestApplicationCount = await prisma.application.count({ where: { courseId: id } });
      const course = await prisma.course.update({
        where: { id },
        data: { isActive: false }
      });
      return { course, deleted: false, deactivated: true, applicationCount: latestApplicationCount };
    }
    throw err;
  }
}

module.exports = { listActiveCourses, listAllCourses, createCourse, updateCourse, deleteCourse, getCourseById };
