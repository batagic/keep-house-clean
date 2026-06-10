const { query } = require('../db');
const { adjustBalance } = require('./profiles');

/** Khớp format cột Google Sheets: id, name, date, grain, exp, tasks, bonus, note */
function rowToLog(row) {
  return {
    id: String(row.profile_id || ''),
    name: String(row.profile_name || ''),
    date: String(row.date || ''),
    grain: Number(row.grain) || 0,
    exp: Number(row.exp) || 0,
    tasks: String(row.tasks || ''),
    bonus: !!row.bonus,
    note: String(row.note || ''),
  };
}

async function readLogs(opts = {}) {
  const profileId = opts.profileId ? String(opts.profileId) : '';
  const limit = opts.limit > 0 ? opts.limit : 0;
  const offset = opts.offset > 0 ? opts.offset : 0;

  const where = profileId ? 'WHERE profile_id = $1' : '';
  const countParams = profileId ? [profileId] : [];

  const { rows: countRows } = await query(
    `SELECT COUNT(*)::int AS total FROM logs ${where}`,
    countParams
  );
  const total = countRows[0]?.total ?? 0;

  let sql = `SELECT profile_id, profile_name, date, grain, exp, tasks, bonus, note
             FROM logs ${where}
             ORDER BY date DESC`;
  const params = [...countParams];

  if (limit > 0) {
    sql += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
  }

  const { rows } = await query(sql, params);
  const logs = rows.map(rowToLog);

  return {
    logs,
    total,
    hasMore: limit > 0 ? offset + logs.length < total : false,
  };
}

async function writeLog(params) {
  const profileId = String(params.profileId || '');
  const profileName = String(params.profileName || '');
  const date = String(params.date || new Date().toISOString());
  const grain = Number(params.grain) || 0;
  const exp = Number(params.exp) || 0;
  const tasks = String(params.tasks || '');
  const bonus = !!params.bonus;
  const note = String(params.note || '');

  if (!profileId) throw new Error('Thiếu profileId');

  const existing = await query(
    'SELECT grain, exp FROM logs WHERE profile_id = $1 AND date = $2',
    [profileId, date]
  );

  if (existing.rows.length) {
    const oldGrain = Number(existing.rows[0].grain) || 0;
    const oldExp = Number(existing.rows[0].exp) || 0;
    await query(
      `UPDATE logs
       SET profile_name = $3, grain = $4, exp = $5, tasks = $6, bonus = $7, note = $8
       WHERE profile_id = $1 AND date = $2`,
      [profileId, date, profileName, grain, exp, tasks, bonus, note]
    );
    await adjustBalance(profileId, grain - oldGrain, exp - oldExp);
    return { result: 'success', action: 'log_updated' };
  }

  await query(
    `INSERT INTO logs (profile_id, profile_name, date, grain, exp, tasks, bonus, note)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [profileId, profileName, date, grain, exp, tasks, bonus, note]
  );

  await adjustBalance(profileId, grain, exp);
  return { result: 'success', action: 'log_inserted' };
}

async function deleteLog(params) {
  const profileId = String(params.profileId || '');
  const date = String(params.date || '');

  const { rows } = await query(
    `DELETE FROM logs
     WHERE profile_id = $1 AND date = $2
     RETURNING grain, exp`,
    [profileId, date]
  );

  if (!rows.length) {
    return { result: 'error', message: 'Không tìm thấy log để xóa' };
  }

  const grain = Number(rows[0].grain) || 0;
  const exp = Number(rows[0].exp) || 0;
  await adjustBalance(profileId, -grain, -exp);
  return { result: 'success', action: 'log_deleted' };
}

module.exports = {
  readLogs,
  writeLog,
  deleteLog,
  rowToLog,
};
