const prisma = require('../config/prisma');

function findUserByTelegramId(telegramId) {
  return prisma.user.findUnique({
    where: { telegramId: String(telegramId) }
  });
}

function upsertTelegramUser(data) {
  const payload = {
    telegramId: String(data.telegramId),
    username: data.telegramUsername || null,
    fullName: data.fullName,
    phone: data.phone,
    gender: data.gender,
    age: data.age,
    birthDate: data.birthDate,
    city: data.city
  };

  return prisma.user.upsert({
    where: { telegramId: payload.telegramId },
    create: payload,
    update: payload
  });
}

function listUsers(filters: Record<string, any> = {}) {
  const where: Record<string, any> = {};
  if (filters.search) {
    where.OR = [
      { fullName: { contains: String(filters.search), mode: 'insensitive' } },
      { username: { contains: String(filters.search), mode: 'insensitive' } },
      { phone: { contains: String(filters.search), mode: 'insensitive' } },
      { city: { contains: String(filters.search), mode: 'insensitive' } },
      { telegramId: { contains: String(filters.search), mode: 'insensitive' } }
    ];
  }

  return prisma.user.findMany({
    where,
    include: { _count: { select: { applications: true } } },
    orderBy: { createdAt: 'desc' }
  });
}

function updateUser(id, payload) {
  return prisma.user.update({
    where: { id },
    data: payload,
    include: { _count: { select: { applications: true } } }
  });
}

function deleteUser(id) {
  return prisma.user.delete({ where: { id } });
}

module.exports = {
  findUserByTelegramId,
  listUsers,
  updateUser,
  deleteUser,
  upsertTelegramUser
};
