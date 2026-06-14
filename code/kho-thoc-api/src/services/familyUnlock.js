const bcrypt = require('bcryptjs');
const { query } = require('../db');

const failAttempts = new Map();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

function clientKey(req) {
  const raw = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  return String(raw).split(',')[0].trim() || 'unknown';
}

function isRateLimited(key) {
  const entry = failAttempts.get(key);
  if (!entry) return false;
  if (Date.now() - entry.since > WINDOW_MS) {
    failAttempts.delete(key);
    return false;
  }
  return entry.count >= MAX_ATTEMPTS;
}

function recordFail(key) {
  const entry = failAttempts.get(key);
  if (!entry || Date.now() - entry.since > WINDOW_MS) {
    failAttempts.set(key, { count: 1, since: Date.now() });
    return;
  }
  entry.count += 1;
}

function clearFails(key) {
  failAttempts.delete(key);
}

async function unlockFamilyByPasscode(passcode, req) {
  const code = String(passcode || '').trim();
  if (!code) {
    throw Object.assign(new Error('Thiếu mã xác nhận'), { status: 400 });
  }

  const rateKey = clientKey(req);
  if (isRateLimited(rateKey)) {
    throw Object.assign(
      new Error('Thử sai quá nhiều lần. Chờ 15 phút hoặc hỏi bố/mẹ.'),
      { status: 429 }
    );
  }

  const { rows } = await query(
    `SELECT rp.id, rp.profile_id, rp.passcode_hash,
            p.family_id, p.name AS profile_name
     FROM redeem_passcodes rp
     INNER JOIN profiles p ON p.id = rp.profile_id
     WHERE rp.revoked_at IS NULL AND p.id <> ''`
  );

  for (const row of rows) {
    const ok = await bcrypt.compare(code, row.passcode_hash);
    if (!ok) continue;

    await query(
      'UPDATE redeem_passcodes SET last_used_at = now() WHERE id = $1',
      [row.id]
    );
    clearFails(rateKey);

    return {
      result: 'success',
      familyId: String(row.family_id),
      matchedProfileId: String(row.profile_id),
      matchedProfileName: String(row.profile_name || ''),
    };
  }

  recordFail(rateKey);
  throw Object.assign(new Error('Mã xác nhận không đúng'), { status: 403 });
}

module.exports = { unlockFamilyByPasscode };
