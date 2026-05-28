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
    educationType: String(data.educationType || '').trim(),
    format: String(data.format || '').trim(),
    duration: data.duration ? String(data.duration).trim() : null,
    cost: data.cost ? String(data.cost).trim() : null,
    additionalInfo: data.additionalInfo ? String(data.additionalInfo).trim() : null,
    ageMin: parseInteger(data.ageMin, 18),
    ageMax: parseInteger(data.ageMax, 45),
    hasPractice: parseBoolean(data.hasPractice, false),
    canPayInInstallments: parseBoolean(data.canPayInInstallments, false),
    isActive: parseBoolean(data.isActive, true)
  };

  return prisma.course.create({ data: payload });
}

async function deleteCourse(id) {
  return prisma.course.delete({ where: { id } });
}

module.exports = { listActiveCourses, createCourse, deleteCourse };
