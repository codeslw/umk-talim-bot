const prisma = require('../config/prisma');

function getSetting(key) {
  return prisma.adminSetting.findUnique({ where: { key } });
}

function upsertSetting(key, value) {
  return prisma.adminSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value }
  });
}

module.exports = {
  getSetting,
  upsertSetting
};
