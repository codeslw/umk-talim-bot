const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const { adminApiKey, adminSessionSecret } = require('../config/env');

const SESSION_COOKIE = 'umk_admin_session';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function base64Url(input) {
  return Buffer.from(input).toString('base64url');
}

function sign(value) {
  return crypto.createHmac('sha256', adminSessionSecret).update(value).digest('base64url');
}

function parseCookie(req, name) {
  const cookie = String(req.headers.cookie || '');
  for (const part of cookie.split(';')) {
    const [rawKey, ...rawValue] = part.trim().split('=');
    if (rawKey === name) return decodeURIComponent(rawValue.join('='));
  }
  return '';
}

function publicAdminUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt
  };
}

function httpError(message, status) {
  const error: Error & { status?: number } = new Error(message);
  error.status = status;
  return error;
}

async function countAdminUsers() {
  return prisma.adminUser.count();
}

function normalizeAdminPayload(data, { requirePassword = true } = {}) {
  const username = data.username === undefined ? undefined : String(data.username || '').trim().toLowerCase();
  const password = data.password === undefined ? undefined : String(data.password || '');
  const displayName = data.displayName === undefined ? undefined : String(data.displayName || '').trim() || null;

  if (username !== undefined && !username) {
    throw httpError('Username is required', 400);
  }
  if (requirePassword && (!password || password.length < 8)) {
    throw httpError('Password with at least 8 characters is required', 400);
  }
  if (!requirePassword && password !== undefined && password && password.length < 8) {
    throw httpError('Password must be at least 8 characters', 400);
  }

  return { username, password, displayName };
}

async function bootstrapAdminUser(data) {
  const existingCount = await countAdminUsers();
  if (existingCount > 0) {
    throw httpError('Admin user already exists', 409);
  }

  const { username, password, displayName } = normalizeAdminPayload(data);

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.adminUser.create({
    data: {
      username,
      passwordHash,
      displayName
    }
  });
  return publicAdminUser(user);
}

async function listAdminUsers() {
  const users = await prisma.adminUser.findMany({
    orderBy: { createdAt: 'asc' }
  });
  return users.map(publicAdminUser);
}

async function createAdminUser(data) {
  const { username, password, displayName } = normalizeAdminPayload(data);
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.adminUser.create({
    data: {
      username,
      passwordHash,
      displayName,
      isActive: data.isActive === undefined ? true : Boolean(data.isActive)
    }
  });
  return publicAdminUser(user);
}

async function updateAdminUser(id, data, currentUserId) {
  const adminId = Number(id);
  if (!Number.isInteger(adminId)) throw httpError('Invalid admin id', 400);

  const { password, displayName } = normalizeAdminPayload(data, { requirePassword: false });
  const updateData: Record<string, any> = {};
  if (displayName !== undefined) updateData.displayName = displayName;
  if (password) updateData.passwordHash = await bcrypt.hash(password, 12);
  if (data.isActive !== undefined) {
    if (adminId === currentUserId && !Boolean(data.isActive)) {
      throw httpError('You cannot deactivate your own admin account', 400);
    }
    updateData.isActive = Boolean(data.isActive);
  }

  const user = await prisma.adminUser.update({
    where: { id: adminId },
    data: updateData
  });
  return publicAdminUser(user);
}

async function loginAdminUser(data) {
  const username = String(data.username || '').trim().toLowerCase();
  const password = String(data.password || '');
  const user = await prisma.adminUser.findUnique({ where: { username } });
  if (!user || !user.isActive || !(await bcrypt.compare(password, user.passwordHash))) {
    throw httpError('Invalid username or password', 401);
  }

  await prisma.adminUser.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() }
  });

  return publicAdminUser(user);
}

function createSessionToken(user) {
  const payload = base64Url(JSON.stringify({
    sub: user.id,
    username: user.username,
    exp: Date.now() + SESSION_TTL_MS
  }));
  return `${payload}.${sign(payload)}`;
}

async function verifySessionToken(token) {
  const [payload, signature] = String(token || '').split('.');
  if (!payload || !signature || signature !== sign(payload)) return null;

  let data;
  try {
    data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return null;
  }

  if (!data.sub || Date.now() > Number(data.exp || 0)) return null;
  const user = await prisma.adminUser.findUnique({ where: { id: Number(data.sub) } });
  if (!user || !user.isActive) return null;
  return publicAdminUser(user);
}

function getSessionCookie(req) {
  return parseCookie(req, SESSION_COOKIE);
}

async function verifyRequestSession(req) {
  return verifySessionToken(getSessionCookie(req));
}

function legacyAdminKeyMatches(req) {
  const key = req.header('x-admin-key');
  return Boolean(adminApiKey && key && key === adminApiKey);
}

module.exports = {
  SESSION_COOKIE,
  SESSION_TTL_MS,
  bootstrapAdminUser,
  countAdminUsers,
  createAdminUser,
  createSessionToken,
  getSessionCookie,
  legacyAdminKeyMatches,
  listAdminUsers,
  loginAdminUser,
  updateAdminUser,
  verifyRequestSession
};
