const TRUE_VALUES = new Set(['true', '1', 'yes', 'y', 'on', 'да', 'ha', 'x']);
const FALSE_VALUES = new Set(['false', '0', 'no', 'n', 'off', 'нет', "yo'q"]);

function normalizeUsername(value) {
  const text = String(value || '')
    .trim()
    .replace(/^https?:\/\/t\.me\//i, '')
    .replace(/^@/, '');

  return text ? text.toLowerCase() : '';
}

function toOptionalString(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;

  const text = String(value).trim();
  return text ? text : null;
}

function toRequiredString(value) {
  return String(value || '').trim();
}

function parseBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (value == null) return fallback;

  const normalized = String(value).trim().toLowerCase();
  if (TRUE_VALUES.has(normalized)) return true;
  if (FALSE_VALUES.has(normalized)) return false;

  return fallback;
}

function parseBooleanStrict(value) {
  if (typeof value === 'boolean') return value;
  if (value == null) return null;

  const normalized = String(value).trim().toLowerCase();
  if (TRUE_VALUES.has(normalized)) return true;
  if (FALSE_VALUES.has(normalized)) return false;

  return null;
}

function parseInteger(value, fallback) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;

  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

module.exports = {
  normalizeUsername,
  toOptionalString,
  toRequiredString,
  parseBoolean,
  parseBooleanStrict,
  parseInteger
};
