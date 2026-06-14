#!/usr/bin/env node
/**
 * Seed bé Lan Phương (p_phuong) từ data/profiles.csv + data/logs.csv
 *
 * Usage (local hoặc trong container):
 *   npm run seed:lan-phuong
 *   npm run seed:lan-phuong -- --family-id fam_v1_default
 *   npm run seed:lan-phuong -- --dry-run
 *
 * Production (VPS):
 *   docker compose exec kho-thoc-api npm run seed:lan-phuong
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../src/db');
const { createInitialPasscodeForProfile } = require('../src/services/auth');

const PROFILE_ID = 'p_phuong';
const DEFAULT_FAMILY_ID = 'fam_v1_default';
const DATA_DIR = path.join(__dirname, '..', 'data');

const PROFILE = {
  id: PROFILE_ID,
  name: 'Lan Phương',
  avatar: '🐡',
  total_grain: 674,
  total_exp: 725,
};

function parseArgs(argv) {
  const out = { familyId: DEFAULT_FAMILY_ID, dryRun: false, skipPasscode: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--family-id') {
      out.familyId = String(argv[++i] || '').trim() || DEFAULT_FAMILY_ID;
    } else if (arg === '--dry-run') {
      out.dryRun = true;
    } else if (arg === '--skip-passcode') {
      out.skipPasscode = true;
    } else if (arg === '--help' || arg === '-h') {
      out.help = true;
    }
  }
  return out;
}

function splitCsvLine(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
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

function parseCsv(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(Boolean);
  if (!lines.length) return [];
  const headers = splitCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const row = splitCsvLine(line);
    const obj = {};
    headers.forEach((h, i) => {
      obj[String(h || '').trim()] = row[i] ?? '';
    });
    return obj;
  });
}

function parseBool(val) {
  const s = String(val || '').trim().toUpperCase();
  return s === 'TRUE' || s === '1' || s === 'YES';
}

function loadLanPhuongLogs() {
  const logsPath = path.join(DATA_DIR, 'logs.csv');
  if (!fs.existsSync(logsPath)) {
    throw new Error(`Không tìm thấy ${logsPath}`);
  }
  return parseCsv(logsPath).filter((row) => {
    const pid = String(row.id || row.profileId || '').trim();
    return pid === PROFILE_ID;
  });
}

async function upsertProfile(client, familyId) {
  await client.query(
    `INSERT INTO profiles (id, name, avatar, total_grain, total_exp, family_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name,
       avatar = EXCLUDED.avatar,
       total_grain = EXCLUDED.total_grain,
       total_exp = EXCLUDED.total_exp,
       family_id = EXCLUDED.family_id`,
    [
      PROFILE.id,
      PROFILE.name,
      PROFILE.avatar,
      PROFILE.total_grain,
      PROFILE.total_exp,
      familyId,
    ]
  );
}

async function upsertLogs(client, logRows) {
  let count = 0;
  for (const row of logRows) {
    const date = String(row.date || '').trim();
    if (!date) continue;

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
      [
        PROFILE_ID,
        String(row.name || PROFILE.name),
        date,
        Number(row.grain) || 0,
        Number(row.exp) || 0,
        String(row.tasks || ''),
        parseBool(row.bonus),
        String(row.note || ''),
      ]
    );
    count += 1;
  }
  return count;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    console.log(`Usage:
  npm run seed:lan-phuong
  npm run seed:lan-phuong -- --family-id ${DEFAULT_FAMILY_ID}
  npm run seed:lan-phuong -- --dry-run
  npm run seed:lan-phuong -- --skip-passcode

Nguồn: code/kho-thoc-api/data/profiles.csv + logs.csv (chỉ dòng p_phuong)
`);
    process.exit(0);
  }

  const logRows = loadLanPhuongLogs();
  console.log(`Bé: ${PROFILE.name} (${PROFILE_ID})`);
  console.log(`family_id: ${args.familyId}`);
  console.log(`Gạo/EXP (từ profiles.csv): ${PROFILE.total_grain} / ${PROFILE.total_exp}`);
  console.log(`Nhật ký: ${logRows.length} dòng trong logs.csv`);

  if (args.dryRun) {
    console.log('Dry-run — không ghi database.');
    process.exit(0);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await upsertProfile(client, args.familyId);
    const logCount = await upsertLogs(client, logRows);

    await client.query('COMMIT');

    console.log(`✓ profiles: upsert ${PROFILE_ID}`);
    console.log(`✓ logs: ${logCount} dòng`);

    let passcode = null;
    if (!args.skipPasscode) {
      passcode = await createInitialPasscodeForProfile(PROFILE_ID);
      if (passcode) {
        console.log(`✓ passcode mới (ghi nhớ, chỉ hiện một lần): ${passcode}`);
      } else {
        console.log('⚠ passcode: bé đã có mã active — bỏ qua (dùng admin Sinh mã mới nếu cần)');
      }
    }

    console.log('');
    console.log('Tiếp theo:');
    console.log('  • Admin → Mã đổi quà → thấy Lan Phương');
    console.log('  • Nhật Ký → nhập passcode → mở phiên gia đình');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
