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

async function getActivePasscodeRow(profileId) {
  const { rows } = await query(
    `SELECT id, profile_id, passcode_hash, created_at, last_used_at
     FROM redeem_passcodes
     WHERE profile_id = $1 AND revoked_at IS NULL
     ORDER BY created_at DESC
     LIMIT 1`,
    [String(profileId)]
  );
  return rows[0] || null;
}

async function getPasscodeStatusForProfile(profileId) {
  const row = await getActivePasscodeRow(profileId);
  if (!row) {
    return { active: false, createdAt: null, lastUsedAt: null };
  }
  return {
    active: true,
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at,
  };
}

async function listPasscodesWithProfiles() {
  const { rows } = await query(
    `SELECT p.id, p.name, p.avatar,
            rp.created_at AS passcode_created_at,
            rp.last_used_at AS passcode_last_used_at
     FROM profiles p
     LEFT JOIN LATERAL (
       SELECT created_at, last_used_at
       FROM redeem_passcodes
       WHERE profile_id = p.id AND revoked_at IS NULL
       ORDER BY created_at DESC
       LIMIT 1
     ) rp ON true
     WHERE p.id <> ''
     ORDER BY p.name`
  );

  return rows.map((row) => ({
    profileId: String(row.id),
    profileName: String(row.name || ''),
    avatar: String(row.avatar || '👶'),
    hasActivePasscode: !!row.passcode_created_at,
    createdAt: row.passcode_created_at || null,
    lastUsedAt: row.passcode_last_used_at || null,
  }));
}

function generateNumericPasscode(length = 4) {
  const len = Math.min(Math.max(Number(length) || 4, 4), 6);
  let code = '';
  for (let i = 0; i < len; i += 1) {
    code += crypto.randomInt(0, 10).toString();
  }
  return code;
}

async function insertPasscode(profileId, passcode, adminId = null) {
  const passcodeHash = await bcrypt.hash(passcode, BCRYPT_ROUNDS);
  const { rows } = await query(
    `INSERT INTO redeem_passcodes (profile_id, passcode_hash, created_by)
     VALUES ($1, $2, $3)
     RETURNING created_at`,
    [String(profileId), passcodeHash, adminId || null]
  );
  return rows[0].created_at;
}

async function createInitialPasscodeForProfile(profileId) {
  const existing = await getActivePasscodeRow(profileId);
  if (existing) return null;

  const passcode = generateNumericPasscode(4);
  await insertPasscode(profileId, passcode, null);
  return passcode;
}

async function generateRedeemPasscode(adminId, profileId, length = 4) {
  const pid = String(profileId || '').trim();
  if (!pid) throw Object.assign(new Error('Thiếu profileId'), { status: 400 });

  const profileCheck = await query('SELECT id, name FROM profiles WHERE id = $1', [pid]);
  if (!profileCheck.rows.length) {
    throw Object.assign(new Error('Không tìm thấy hồ sơ bé'), { status: 400 });
  }

  await query(
    `UPDATE redeem_passcodes SET revoked_at = now()
     WHERE profile_id = $1 AND revoked_at IS NULL`,
    [pid]
  );

  const passcode = generateNumericPasscode(length);
  const createdAt = await insertPasscode(pid, passcode, adminId || null);
  const profileName = profileCheck.rows[0].name;

  return {
    profileId: pid,
    profileName,
    passcode,
    createdAt,
    message: `Copy mã và gửi bố/mẹ qua Zalo cho bé ${profileName}. Mã cũ của bé này đã bị thu hồi.`,
  };
}

async function revokeActivePasscode(profileId) {
  const pid = String(profileId || '').trim();
  if (!pid) throw Object.assign(new Error('Thiếu profileId'), { status: 400 });

  const { rowCount } = await query(
    `UPDATE redeem_passcodes SET revoked_at = now()
     WHERE profile_id = $1 AND revoked_at IS NULL`,
    [pid]
  );
  return rowCount > 0;
}

async function verifyRedeemPasscode(passcode, profileId) {
  const pid = String(profileId || '').trim();
  if (!pid) return { ok: false, reason: 'no_profile' };

  const row = await getActivePasscodeRow(pid);
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
  getPasscodeStatusForProfile,
  listPasscodesWithProfiles,
  generateRedeemPasscode,
  revokeActivePasscode,
  verifyRedeemPasscode,
  createInitialPasscodeForProfile,
};
