const { query } = require('../db');
const { resolveRewards } = require('../data/rewards');
const { verifyRedeemPasscode } = require('./auth');
const { writeLog } = require('./logs');

const failAttempts = new Map();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

function rateLimitKey(profileId) {
  return String(profileId || 'unknown');
}

function isRateLimited(profileId) {
  const key = rateLimitKey(profileId);
  const entry = failAttempts.get(key);
  if (!entry) return false;
  if (Date.now() - entry.since > WINDOW_MS) {
    failAttempts.delete(key);
    return false;
  }
  return entry.count >= MAX_ATTEMPTS;
}

function recordFail(profileId) {
  const key = rateLimitKey(profileId);
  const entry = failAttempts.get(key);
  if (!entry || Date.now() - entry.since > WINDOW_MS) {
    failAttempts.set(key, { count: 1, since: Date.now() });
    return;
  }
  entry.count += 1;
}

function clearFails(profileId) {
  failAttempts.delete(rateLimitKey(profileId));
}

async function redeemWithPasscode(params, familyId) {
  const profileId = String(params.profileId || '');
  const profileName = String(params.profileName || '');
  const passcode = String(params.passcode || '');

  if (!profileId) throw Object.assign(new Error('Thiếu profileId'), { status: 400 });
  if (!passcode) throw Object.assign(new Error('Thiếu mã xác nhận'), { status: 400 });

  const { rows: profileRows } = await query(
    'SELECT id, total_grain FROM profiles WHERE id = $1 AND family_id = $2',
    [profileId, String(familyId || '').trim()]
  );
  if (!profileRows.length) {
    throw Object.assign(new Error('Không tìm thấy hồ sơ bé'), { status: 404 });
  }

  if (isRateLimited(profileId)) {
    throw Object.assign(
      new Error('Thử sai quá nhiều lần. Chờ 15 phút hoặc hỏi bố/mẹ.'),
      { status: 429 }
    );
  }

  const verification = await verifyRedeemPasscode(passcode, profileId);
  if (!verification.ok) {
    recordFail(profileId);
    if (verification.reason === 'no_active') {
      throw Object.assign(
        new Error('Chưa có mã đổi quà cho bé này. Bố/mẹ liên hệ admin.'),
        { status: 403 }
      );
    }
    throw Object.assign(new Error('Mã xác nhận không đúng'), { status: 403 });
  }

  clearFails(profileId);

  const { totalCost, rewardNames } = resolveRewards(params.rewardIds);

  const balance = Number(profileRows[0].total_grain) || 0;
  if (balance < totalCost) {
    throw Object.assign(new Error('Không đủ Gạo để đổi quà'), { status: 400 });
  }

  const date = new Date().toISOString().replace('T', ' ').slice(0, 16);
  const note = `Đổi quà: ${rewardNames.join(', ')}`;

  const result = await writeLog({
    profileId,
    profileName,
    date,
    grain: -totalCost,
    exp: 0,
    tasks: 'REDEEM',
    bonus: false,
    note,
  }, familyId);

  return {
    ...result,
    date,
    grain: -totalCost,
    exp: 0,
    tasks: 'REDEEM',
    note,
  };
}

module.exports = { redeemWithPasscode };
