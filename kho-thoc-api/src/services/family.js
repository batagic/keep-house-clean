const { query } = require('../db');

async function assertProfileInFamily(profileId, familyId) {
  const pid = String(profileId || '').trim();
  const fid = String(familyId || '').trim();
  if (!pid || !fid) {
    throw Object.assign(new Error('Thiếu profileId hoặc gia đình'), { status: 400 });
  }

  const { rows } = await query(
    'SELECT id FROM profiles WHERE id = $1 AND family_id = $2',
    [pid, fid]
  );
  if (!rows.length) {
    throw Object.assign(
      new Error('Không tìm thấy bé trong gia đình của bạn'),
      { status: 404 }
    );
  }
  return rows[0];
}

module.exports = { assertProfileInFamily };
