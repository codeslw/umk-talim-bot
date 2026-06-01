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

module.exports = {
  findUserByTelegramId,
  upsertTelegramUser
};
