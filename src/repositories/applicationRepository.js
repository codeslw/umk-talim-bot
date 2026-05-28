const prisma = require('../config/prisma');

async function createApplication(payload) {
  return prisma.application.create({
    data: payload,
    include: { user: true, course: true }
  });
}

async function listApplications(filters = {}) {
  return prisma.application.findMany({
    where: filters,
    include: { user: true, course: true },
    orderBy: { createdAt: 'desc' }
  });
}

async function updateApplicationStatus(id, status) {
  return prisma.application.update({ where: { id }, data: { status } });
}

async function statistics() {
  const [total, byStatus, byCourse, byGender, avgAge] = await Promise.all([
    prisma.application.count(),
    prisma.application.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.application.groupBy({ by: ['courseId'], _count: { _all: true } }),
    prisma.user.groupBy({ by: ['gender'], _count: { _all: true } }),
    prisma.user.aggregate({ _avg: { age: true } })
  ]);

  return { total, byStatus, byCourse, byGender, avgAge: avgAge._avg.age };
}

module.exports = { createApplication, listApplications, updateApplicationStatus, statistics };
