const {
  SESSION_COOKIE,
  SESSION_TTL_MS,
  bootstrapAdminUser,
  countAdminUsers,
  createAdminUser,
  createSessionToken,
  listAdminUsers,
  loginAdminUser,
  updateAdminUser,
  verifyRequestSession
} = require('../services/adminAuth.service');

function cookieOptions(req) {
  const isHttps = req.secure || String(req.header('x-forwarded-proto') || '').includes('https');
  return {
    httpOnly: true,
    secure: isHttps,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_MS
  };
}

async function getAuthStatus(req, res) {
  const user = await verifyRequestSession(req);
  const needsBootstrap = (await countAdminUsers()) === 0;
  res.json({ data: { user, needsBootstrap } });
}

async function bootstrap(req, res) {
  const user = await bootstrapAdminUser(req.body);
  const token = createSessionToken(user);
  res.cookie(SESSION_COOKIE, token, cookieOptions(req));
  res.status(201).json({ data: { user } });
}

async function login(req, res) {
  const user = await loginAdminUser(req.body);
  const token = createSessionToken(user);
  res.cookie(SESSION_COOKIE, token, cookieOptions(req));
  res.json({ data: { user } });
}

function logout(req, res) {
  res.clearCookie(SESSION_COOKIE, { path: '/' });
  res.status(204).send();
}

async function getAdmins(req, res) {
  res.json({ data: await listAdminUsers() });
}

async function postAdmin(req, res) {
  res.status(201).json({ data: await createAdminUser(req.body) });
}

async function patchAdmin(req, res) {
  res.json({ data: await updateAdminUser(req.params.id, req.body, req.adminUser?.id) });
}

module.exports = { bootstrap, getAdmins, getAuthStatus, login, logout, patchAdmin, postAdmin };
