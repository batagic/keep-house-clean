const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { query } = require('../db');
const { jwtSecret, jwtExpiresIn, bcryptRounds } = require('../config');

const BCRYPT_ROUNDS = bcryptRounds;

async function findAdminByUsername(username) {
  const { rows } = await query(
    'SELECT id, username, password_hash FROM admin_users WHERE username = $1',
    [String(username).trim()]
  );
  return rows[0] || null;
}

async function verifyAdminPassword(username, password) {
  const admin = await findAdminByUsername(username);
  if (!admin) return null;
  const ok = await bcrypt.compare(String(password), admin.password_hash);
  if (!ok) return null;
  return admin;
}

function signAdminToken(admin) {
  const expiresIn = jwtExpiresIn;
  const token = jwt.sign(
    { sub: `admin:${admin.id}`, role: 'admin' },
    jwtSecret,
    { expiresIn }
  );
  const decoded = jwt.decode(token);
  const expiresInSec = decoded.exp - decoded.iat;
  return { token, expiresIn: expiresInSec };
}

function verifyAdminToken(token) {
  try {
    const payload = jwt.verify(token, jwtSecret);
    if (payload.role !== 'admin') return null;
    const match = String(payload.sub || '').match(/^admin:(\d+)$/);
    if (!match) return null;
    return { id: Number(match[1]), role: 'admin' };
  } catch {
    return null;
  }
}

async function hashPassword(password) {
  return bcrypt.hash(String(password), BCRYPT_ROUNDS);
}

async function createAdminUser(username, password) {
  const hash = await hashPassword(password);
  const { rows } = await query(
    `INSERT INTO admin_users (username, password_hash)
     VALUES ($1, $2)
     RETURNING id, username, created_at`,
    [String(username).trim(), hash]
  );
  return rows[0];
}

async function getActivePasscodeRow() {
  const { rows } = await query(
    `SELECT id, passcode_hash, created_at, last_used_at
     FROM redeem_passcodes
     WHERE revoked_at IS NULL
     ORDER BY created_at DESC
     LIMIT 1`
  );
  return rows[0] || null;
}

async function getPasscodeStatus() {
  const row = await getActivePasscodeRow();
  if (!row) {
    return { active: false, createdAt: null, lastUsedAt: null };
  }
  return {
    active: true,
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at,
  };
}

function generateNumericPasscode(length = 4) {
  const len = Math.min(Math.max(Number(length) || 4, 4), 6);
  let code = '';
  for (let i = 0; i < len; i += 1) {
    code += crypto.randomInt(0, 10).toString();
  }
  return code;
}

async function generateRedeemPasscode(adminId, length = 4) {
  await query(
    `UPDATE redeem_passcodes SET revoked_at = now()
     WHERE revoked_at IS NULL`
  );

  const passcode = generateNumericPasscode(length);
  const passcodeHash = await bcrypt.hash(passcode, BCRYPT_ROUNDS);

  const { rows } = await query(
    `INSERT INTO redeem_passcodes (passcode_hash, created_by)
     VALUES ($1, $2)
     RETURNING created_at`,
    [passcodeHash, adminId || null]
  );

  return {
    passcode,
    createdAt: rows[0].created_at,
    message: 'Copy mã và gửi bố/mẹ qua Zalo. Mã cũ đã bị thu hồi.',
  };
}

async function revokeActivePasscode() {
  const { rowCount } = await query(
    `UPDATE redeem_passcodes SET revoked_at = now()
     WHERE revoked_at IS NULL`
  );
  return rowCount > 0;
}

async function verifyRedeemPasscode(passcode) {
  const row = await getActivePasscodeRow();
  if (!row) return { ok: false, reason: 'no_active' };

  const ok = await bcrypt.compare(String(passcode), row.passcode_hash);
  if (!ok) return { ok: false, reason: 'invalid' };

  await query(
    'UPDATE redeem_passcodes SET last_used_at = now() WHERE id = $1',
    [row.id]
  );

  return { ok: true };
}

module.exports = {
  verifyAdminPassword,
  signAdminToken,
  verifyAdminToken,
  hashPassword,
  createAdminUser,
  findAdminByUsername,
  getPasscodeStatus,
  generateRedeemPasscode,
  revokeActivePasscode,
  verifyRedeemPasscode,
};
