const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { verifyAdminToken } = require('../middleware/authMiddleware');
const { verifyKioskOrAdminToken } = require('../middleware/kioskAuth');
const faceRoutes = require('../routes/faceRoutes');

const secret = process.env.JWT_SECRET || 'your_secret_key';
const token = type => jwt.sign({ id: 7, type }, secret, { expiresIn: '1h' });
const response = () => ({
  code: 200,
  status(code) { this.code = code; return this; },
  json(body) { this.body = body; return this; }
});

test('scanner session cannot access admin endpoints', async () => {
  const req = { headers: { authorization: `Bearer ${token('scanner')}` } };
  const res = response();
  let nextCalled = false;
  await verifyAdminToken(req, res, () => { nextCalled = true; });
  assert.equal(res.code, 403);
  assert.equal(nextCalled, false);
});

test('scanner session cannot submit a claimed identity through kiosk attendance', () => {
  const req = { headers: { authorization: `Bearer ${token('scanner')}` } };
  const res = response();
  let nextCalled = false;
  verifyKioskOrAdminToken(req, res, () => { nextCalled = true; });
  assert.equal(res.code, 403);
  assert.equal(nextCalled, false);
});

test('admin token uses current account permissions for admin routes', async () => {
  const originalQuery = pool.query;
  pool.query = async () => [[{ id: 7, username: 'reviewer', position: 'Admin' }]];
  const req = { headers: { authorization: `Bearer ${token('admin')}` } };
  const res = response();
  let nextCalled = false;
  try { await verifyAdminToken(req, res, () => { nextCalled = true; }); }
  finally { pool.query = originalQuery; }
  assert.equal(nextCalled, true);
  assert.equal(req.user.id, 7);
  assert.equal(req.user.position, 'Admin');
});

test('deleted administrators cannot continue using an unexpired token', async () => {
  const originalQuery = pool.query;
  pool.query = async () => [[]];
  const res = response();
  let nextCalled = false;
  try { await verifyAdminToken({ headers: { authorization: `Bearer ${token('admin')}` } }, res, () => { nextCalled = true; }); }
  finally { pool.query = originalQuery; }
  assert.equal(res.code, 401);
  assert.equal(nextCalled, false);
});

test('production rejects the legacy kiosk key', () => {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  try {
    const req = { headers: { 'x-kiosk-api-key': process.env.KIOSK_API_KEY || 'kiosk_dev_secret_key_2026' } };
    const res = response();
    let nextCalled = false;
    verifyKioskOrAdminToken(req, res, () => { nextCalled = true; });
    assert.equal(res.code, 401);
    assert.equal(nextCalled, false);
  } finally {
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
  }
});

test('browser kiosk route requires origin but no administrator token', () => {
  const route = faceRoutes.stack.find(layer => layer.route?.path === '/kiosk-attendance').route;
  assert.equal(route.stack.length, 2);
  const originCheck = route.stack[0].handle;
  const expected = process.env.FRONTEND_URL || 'http://localhost:3000';
  let nextCalled = false;
  originCheck({ get: () => expected }, response(), () => { nextCalled = true; });
  assert.equal(nextCalled, true);
  const res = response();
  originCheck({ get: () => 'https://unapproved.example' }, res, () => {});
  assert.equal(res.code, 403);
});

test('automatic kiosk allows another scan after two minutes', () => {
  assert.equal(faceRoutes.isWithinToggleCooldown(1.99, true), true);
  assert.equal(faceRoutes.isWithinToggleCooldown(2, true), false);
  assert.equal(faceRoutes.isWithinToggleCooldown(0.99, false), true);
  assert.equal(faceRoutes.isWithinToggleCooldown(1, false), false);
});
