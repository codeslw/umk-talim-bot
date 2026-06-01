function parseBirthDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const match = value.trim().match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!match) {
    return null;
  }

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

function calculateAge(birthDate, now = new Date()) {
  const date = birthDate instanceof Date ? birthDate : parseBirthDate(birthDate);
  if (!date) {
    return null;
  }

  let age = now.getUTCFullYear() - date.getUTCFullYear();
  const monthDiff = now.getUTCMonth() - date.getUTCMonth();
  const hasBirthdayPassed =
    monthDiff > 0 || (monthDiff === 0 && now.getUTCDate() >= date.getUTCDate());

  if (!hasBirthdayPassed) {
    age -= 1;
  }

  return age;
}

module.exports = { parseBirthDate, calculateAge };
