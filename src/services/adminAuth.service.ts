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
    isActive: user.isActive
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

async function bootstrapAdminUser(data) {
  const existingCount = await countAdminUsers();
  if (existingCount > 0) {
    throw httpError('Admin user already exists', 409);
  }

  const username = String(data.username || '').trim().toLowerCase();
  const password = String(data.password || '');
  if (!username || password.length < 8) {
    throw httpError('Username and password with at least 8 characters are required', 400);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.adminUser.create({
    data: {
      username,
      passwordHash,
      displayName: data.displayName ? String(data.displayName).trim() : null
    }
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
  createSessionToken,
  getSessionCookie,
  legacyAdminKeyMatches,
  loginAdminUser,
  verifyRequestSession
};
