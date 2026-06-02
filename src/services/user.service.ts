const { deleteUser, listUsers, updateUser } = require('../repositories/userRepository');
const { parseBirthDate } = require('../utils/date');

function normalizeUserPayload(payload = {}) {
  const allowedFields = ['telegramId', 'username', 'fullName', 'phone', 'gender', 'age', 'birthDate', 'city'];
  const data: Record<string, any> = {};

  for (const field of allowedFields) {
    if (payload[field] !== undefined) data[field] = payload[field] === '' ? null : payload[field];
  }

  if (data.telegramId !== undefined) data.telegramId = String(data.telegramId);
  if (data.age !== undefined && data.age !== null) data.age = Number(data.age);
  if (data.birthDate !== undefined && data.birthDate !== null) {
    data.birthDate = typeof data.birthDate === 'string' && /^\d{2}\.\d{2}\.\d{4}$/.test(data.birthDate)
      ? parseBirthDate(data.birthDate)
      : new Date(data.birthDate);
  }

  return data;
}

function getUsers(query = {}) {
  return listUsers(query);
}

function editUser(id, payload) {
  return updateUser(Number(id), normalizeUserPayload(payload));
}

function removeUser(id) {
  return deleteUser(Number(id));
}

module.exports = {
  getUsers,
  editUser,
  removeUser
};
