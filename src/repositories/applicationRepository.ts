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
  const current = await prisma.application.findUnique({
    where: { id },
    select: { status: true }
  });
  const updated = await prisma.application.update({
    where: { id },
    data: { status },
    include: { user: true, course: true }
  });

  return { ...updated, previousStatus: current?.status || null };
}

async function updateApplication(id, payload) {
  return prisma.application.update({
    where: { id },
    data: payload,
    include: { user: true, course: true }
  });
}

async function deleteApplication(id) {
  return prisma.application.delete({
    where: { id },
    include: { user: true, course: true }
  });
}

async function updateApplicationNotificationReference(id, reference) {
  return prisma.application.update({
    where: { id },
    data: {
      notificationChatId: reference.chatId,
      notificationMessageId: reference.messageId
    }
  });
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

module.exports = {
  createApplication,
  listApplications,
  updateApplication,
  updateApplicationStatus,
  deleteApplication,
  updateApplicationNotificationReference,
  statistics
};
