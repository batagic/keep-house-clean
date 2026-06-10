#!/usr/bin/env node
/**
 * Import dữ liệu export từ Google Sheets (File → Download → CSV).
 *
 * Usage:
 *   node scripts/import-csv.js --profiles ./profiles.csv --logs ./logs.csv
 *
 * Sau import, chạy backfill số dư từ logs (khớp backfillProfileBalances trong GAS).
 */
const fs = require('fs');
const path = require('path');
const { pool } = require('../src/db');
const { withTransaction } = require('../src/db');

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--profiles') args.profiles = argv[++i];
    else if (argv[i] === '--logs') args.logs = argv[++i];
    else if (argv[i] === '--reset') args.reset = true;
    else if (argv[i] === '--help') args.help = true;
  }
  return args;
}

/** Tính lại total_grain/total_exp từ TOÀN BỘ logs trong DB (nguồn sự thật). */
async function reconcileBalancesFromLogs(client) {
  await client.query(`
    UPDATE profiles p
    SET total_grain = COALESCE(t.grain, 0),
        total_exp   = COALESCE(t.exp, 0)
    FROM (
      SELECT profile_id,
             SUM(grain)::int AS grain,
             SUM(exp)::int AS exp
      FROM logs
      GROUP BY profile_id
    ) t
    WHERE p.id = t.profile_id
  `);
}

/** CSV đơn giản — đủ cho export Google Sheets */
function parseCsv(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(Boolean);
  if (!lines.length) return { headers: [], rows: [] };

  const headers = splitCsvLine(lines[0]);
  const rows = lines.slice(1).map(splitCsvLine);
  return { headers, rows };
}

function splitCsvLine(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function rowToObject(headers, row) {
  const obj = {};
  headers.forEach((h, i) => {
    obj[String(h || '').trim()] = row[i] ?? '';
  });
  return obj;
}

function parseBool(val) {
  const s = String(val || '').trim().toUpperCase();
  return s === 'TRUE' || s === '1' || s === 'YES';
}

async function importProfiles(filePath) {
  const { headers, rows } = parseCsv(fs.readFileSync(filePath, 'utf8'));
  let count = 0;

  for (const row of rows) {
    const o = rowToObject(headers, row);
    const id = String(o.id || '').trim();
    if (!id) continue;

    const totalGrain = Number(o.total_grain ?? o.balance) || 0;
    const totalExp = Number(o.total_exp) || 0;

    await pool.query(
      `INSERT INTO profiles (id, name, avatar, total_grain, total_exp)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         avatar = EXCLUDED.avatar`,
      [id, String(o.name || ''), String(o.avatar || '👶'), totalGrain, totalExp]
    );
    count++;
  }

  return count;
}

async function importLogs(filePath, reset = false) {
  const { headers, rows } = parseCsv(fs.readFileSync(filePath, 'utf8'));
  let count = 0;

  await withTransaction(async (client) => {
    if (reset) {
      console.warn('⚠️  --reset: xóa toàn bộ logs trước khi import (chỉ dùng lần đầu / migrate)');
      await client.query('TRUNCATE logs RESTART IDENTITY');
    }

    for (const row of rows) {
      const o = rowToObject(headers, row);
      const profileId = String(o.id || o.profileId || '').trim();
      const date = String(o.date || '').trim();
      if (!profileId || !date) continue;

      const params = [
        profileId,
        String(o.name || o.profileName || ''),
        date,
        Number(o.grain) || 0,
        Number(o.exp) || 0,
        String(o.tasks || ''),
        parseBool(o.bonus),
        String(o.note || ''),
      ];

      if (reset) {
        await client.query(
          `INSERT INTO logs (profile_id, profile_name, date, grain, exp, tasks, bonus, note)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (profile_id, date) DO NOTHING`,
          params
        );
      } else {
        await client.query(
          `INSERT INTO logs (profile_id, profile_name, date, grain, exp, tasks, bonus, note)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (profile_id, date) DO UPDATE SET
             profile_name = EXCLUDED.profile_name,
             grain = EXCLUDED.grain,
             exp = EXCLUDED.exp,
             tasks = EXCLUDED.tasks,
             bonus = EXCLUDED.bonus,
             note = EXCLUDED.note`,
          params
        );
      }
      count++;
    }

    await reconcileBalancesFromLogs(client);
  });

  return count;
}

async function main() {
  const args = parseArgs(process.argv);

  if (args.help || !args.profiles || !args.logs) {
    console.log(`Usage:
  npm run import:csv -- --profiles ./profiles.csv --logs ./logs.csv
  npm run import:csv -- --profiles ./profiles.csv --logs ./logs.csv --reset

Mặc định: merge logs (không xóa dữ liệu live), tính lại số dư từ DB.
--reset: xóa toàn bộ logs rồi import — CHỈ dùng migrate lần đầu từ Sheets.

Export từ Google Sheets:
  File → Download → Comma Separated Values (.csv)
`);
    process.exit(args.help ? 0 : 1);
  }

  const profilesPath = path.resolve(args.profiles);
  const logsPath = path.resolve(args.logs);

  const profileCount = await importProfiles(profilesPath);
  console.log(`profiles: ${profileCount} rows from ${profilesPath}`);

  const logCount = await importLogs(logsPath, !!args.reset);
  console.log(`logs: ${logCount} rows from ${logsPath}`);
  console.log('import done — balances reconciled from all logs in DB');

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
