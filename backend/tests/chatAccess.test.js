const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { chatAdmin, canAccessRoom, requireChatRoom, markRoomRead } = require('../services/chatAccess');

test('chat identity comes from a current account, not a stale privilege claim', async () => {
  const original = pool.query;
  const token = jwt.sign({ id: 7, type: 'admin', position: 'Superadmin' }, process.env.JWT_SECRET || 'your_secret_key');
  try {
    pool.query = async () => [[{ id: 7, username: 'reviewer', position: 'Admin' }]];
    assert.equal((await chatAdmin(token)).position, 'Admin');
    pool.query = async () => [[]];
    assert.equal(await chatAdmin(token), null);
  } finally { pool.query = original; }
});

test('private-room reads require membership and cannot grant access by reading', async () => {
  const original = pool.query, queries = [];
  pool.query = async (sql, params) => { queries.push({ sql, params }); return [[]]; };
  try {
    let next = false;
    const res = { status(code) { this.code = code; return this; }, json(body) { this.body = body; } };
    await requireChatRoom({ user: { id: 7, type: 'admin' }, params: { roomId: '12' } }, res, () => { next = true; });
    assert.equal(res.code, 403); assert.equal(next, false);
    assert.match(queries[0].sql, /EXISTS/);
    assert.deepEqual(queries[0].params, [12, 7, 'admin']);
    assert.equal(queries.some(query => /INSERT|UPDATE|DELETE/.test(query.sql)), false);
    assert.equal(await canAccessRoom({ id: 7, type: 'admin' }, 'invalid'), false);
  } finally { pool.query = original; }
});

test('allowed public or joined rooms can be read', async () => {
  const original = pool.query;
  pool.query = async () => [[{ id: 12 }]];
  try { assert.equal(await canAccessRoom({ id: 7, type: 'admin' }, 12), true); }
  finally { pool.query = original; }
});

test('live read receipts are saved only for an accessible room', async () => {
  const original = pool.query, writes = [];
  let allowed = false;
  pool.query = async (sql, params) => {
    if (sql.startsWith('SELECT')) return [allowed ? [{ id: 12 }] : []];
    writes.push(params); return [{ affectedRows: 1 }];
  };
  try {
    assert.equal(await markRoomRead({ id: 7, type: 'admin' }, 12), false);
    assert.equal(writes.length, 0);
    allowed = true;
    assert.equal(await markRoomRead({ id: 7, type: 'admin' }, 12), true);
    assert.deepEqual(writes[0], [12, 7, 'admin']);
  } finally { pool.query = original; }
});
