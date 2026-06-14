const { query } = require('../db');
const { createInitialPasscodeForProfile } = require('./auth');
const { assertProfileInFamily } = require('./family');

const MAX_PROFILES_PER_FAMILY = 3;

function normalizeProfile(row) {
  return {
    id: String(row.id || ''),
    name: String(row.name || ''),
    avatar: String(row.avatar || '👶'),
    total_grain: Number(row.total_grain) || 0,
    total_exp: Number(row.total_exp) || 0,
  };
}

async function readProfiles(familyId) {
  const fid = String(familyId || '').trim();
  if (!fid) throw Object.assign(new Error('Thiếu family_id'), { status: 400 });

  const { rows } = await query(
    `SELECT id, name, avatar, total_grain, total_exp
     FROM profiles
     WHERE family_id = $1 AND id <> ''
     ORDER BY name`,
    [fid]
  );
  return rows.map(normalizeProfile);
}

async function writeProfile(params, familyId) {
  const id = String(params.id || '');
  if (!id) throw new Error('Thiếu id profile');

  const fid = String(familyId || '').trim();
  if (!fid) throw Object.assign(new Error('Thiếu family_id'), { status: 400 });

  const name = String(params.name || '');
  const avatar = String(params.avatar || '👶');
  const totalGrain = Number(params.total_grain ?? params.balance) || 0;
  const totalExp = Number(params.total_exp) || 0;

  const existing = await query(
    'SELECT id FROM profiles WHERE id = $1 AND family_id = $2',
    [id, fid]
  );

  if (existing.rows.length) {
    await query(
      `UPDATE profiles
       SET name = COALESCE(NULLIF($3, ''), name),
           avatar = COALESCE(NULLIF($4, ''), avatar)
       WHERE id = $1 AND family_id = $2`,
      [id, fid, name, avatar]
    );
    return { result: 'success', action: 'updated' };
  }

  const { rows: countRows } = await query(
    `SELECT COUNT(*)::int AS n FROM profiles WHERE family_id = $1`,
    [fid]
  );
  if ((countRows[0]?.n || 0) >= MAX_PROFILES_PER_FAMILY) {
    throw Object.assign(
      new Error('Mỗi gia đình chỉ đăng ký tối đa 3 bé'),
      { status: 400 }
    );
  }

  await query(
    `INSERT INTO profiles (id, name, avatar, total_grain, total_exp, family_id)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, name, avatar, totalGrain, totalExp, fid]
  );
  const passcode = await createInitialPasscodeForProfile(id);
  return { result: 'success', action: 'inserted', passcode };
}

async function deleteProfile(params, familyId) {
  const id = String(params.id || params.profileId || '').trim();
  if (!id) throw Object.assign(new Error('Thiếu id profile'), { status: 400 });

  const fid = String(familyId || '').trim();
  if (!fid) throw Object.assign(new Error('Thiếu family_id'), { status: 400 });

  const existing = await query(
    'SELECT id, name FROM profiles WHERE id = $1 AND family_id = $2',
    [id, fid]
  );
  if (!existing.rows.length) {
    return { result: 'error', message: 'Không tìm thấy bé' };
  }

  await query('DELETE FROM profiles WHERE id = $1 AND family_id = $2', [id, fid]);

  return { result: 'success', action: 'profile_deleted', name: existing.rows[0].name };
}

async function adjustBalance(profileId, grainDelta, expDelta, familyId = null) {
  if (!profileId) return;

  if (familyId) {
    await assertProfileInFamily(profileId, familyId);
  }

  await query(
    `UPDATE profiles
     SET total_grain = total_grain + $2,
         total_exp   = total_exp + $3
     WHERE id = $1`,
    [String(profileId), Number(grainDelta) || 0, Number(expDelta) || 0]
  );
}

module.exports = {
  readProfiles,
  writeProfile,
  deleteProfile,
  adjustBalance,
  normalizeProfile,
};
