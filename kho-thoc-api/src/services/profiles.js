const { query } = require('../db');
const { createInitialPasscodeForProfile } = require('./auth');

function normalizeProfile(row) {
  return {
    id: String(row.id || ''),
    name: String(row.name || ''),
    avatar: String(row.avatar || '👶'),
    total_grain: Number(row.total_grain) || 0,
    total_exp: Number(row.total_exp) || 0,
  };
}

async function readProfiles() {
  const { rows } = await query(
    `SELECT id, name, avatar, total_grain, total_exp
     FROM profiles
     WHERE id <> ''
     ORDER BY name`
  );
  return rows.map(normalizeProfile);
}

async function writeProfile(params) {
  const id = String(params.id || '');
  if (!id) throw new Error('Thiếu id profile');

  const name = String(params.name || '');
  const avatar = String(params.avatar || '👶');
  const totalGrain = Number(params.total_grain ?? params.balance) || 0;
  const totalExp = Number(params.total_exp) || 0;

  const existing = await query('SELECT id FROM profiles WHERE id = $1', [id]);

  if (existing.rows.length) {
    await query(
      `UPDATE profiles
       SET name = COALESCE(NULLIF($2, ''), name),
           avatar = COALESCE(NULLIF($3, ''), avatar)
       WHERE id = $1`,
      [id, name, avatar]
    );
    return { result: 'success', action: 'updated' };
  }

  await query(
    `INSERT INTO profiles (id, name, avatar, total_grain, total_exp)
     VALUES ($1, $2, $3, $4, $5)`,
    [id, name, avatar, totalGrain, totalExp]
  );
  const passcode = await createInitialPasscodeForProfile(id);
  return { result: 'success', action: 'inserted', passcode };
}

async function deleteProfile(params) {
  const id = String(params.id || params.profileId || '').trim();
  if (!id) throw Object.assign(new Error('Thiếu id profile'), { status: 400 });

  const existing = await query('SELECT id, name FROM profiles WHERE id = $1', [id]);
  if (!existing.rows.length) {
    return { result: 'error', message: 'Không tìm thấy bé' };
  }

  await query('DELETE FROM profiles WHERE id = $1', [id]);

  return { result: 'success', action: 'profile_deleted', name: existing.rows[0].name };
}

async function adjustBalance(profileId, grainDelta, expDelta) {
  if (!profileId) return;

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
