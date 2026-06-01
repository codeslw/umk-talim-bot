const prisma = require('../config/prisma');

async function listActiveCourses() {
  return prisma.course.findMany({ where: { isActive: true }, orderBy: { createdAt: 'asc' } });
}

async function createCourse(data) {
  return prisma.course.create({ data });
}

async function updateCourse(id, data) {
  return prisma.course.update({ where: { id }, data });
}

async function getCourseById(id) {
  return prisma.course.findUnique({ where: { id } });
}

async function getActiveCourseById(id) {
  return prisma.course.findFirst({ where: { id, isActive: true } });
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

module.exports = {
  listActiveCourses,
  listAllCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  getCourseById,
  getActiveCourseById
};
