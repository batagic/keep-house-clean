#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { pool } = require('../src/db');

function resolveMigrationsDir() {
  const candidates = [
    process.env.MIGRATIONS_DIR,
    path.join(__dirname, '..', 'migrations'),
  ].filter(Boolean);

  for (const dir of candidates) {
    if (fs.existsSync(dir)) return dir;
  }
  throw new Error(
    `Không tìm thấy thư mục migrations. Đã thử: ${candidates.join(', ')}. ` +
      'Nguồn chạy: code/kho-thoc-api/migrations/ — xem docs/db/README.md'
  );
}

async function main() {
  const migrationsDir = resolveMigrationsDir();
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  for (const file of files) {
    const { rows } = await pool.query(
      'SELECT 1 FROM schema_migrations WHERE name = $1',
      [file]
    );
    if (rows.length) {
      console.log(`skip ${file}`);
      continue;
    }

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    console.log(`apply ${file}`);
    await pool.query(sql);
    await pool.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
  }

  console.log('migrations done');
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
