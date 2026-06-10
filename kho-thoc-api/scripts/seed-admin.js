#!/usr/bin/env node
/**
 * Tạo tài khoản admin (một lần).
 * Usage: npm run seed:admin -- --username admin --password 'your-secret'
 */
require('dotenv').config();
const { pool } = require('../src/db');
const { findAdminByUsername, createAdminUser } = require('../src/services/auth');

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--username' || arg === '-u') {
      out.username = argv[i + 1];
      i += 1;
    } else if (arg === '--password' || arg === '-p') {
      out.password = argv[i + 1];
      i += 1;
    }
  }
  return out;
}

async function main() {
  const { username, password } = parseArgs(process.argv.slice(2));

  if (!username || !password) {
    console.error('Usage: npm run seed:admin -- --username admin --password "..."');
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('Password phải có ít nhất 8 ký tự');
    process.exit(1);
  }

  const existing = await findAdminByUsername(username);
  if (existing) {
    console.error(`Admin "${username}" đã tồn tại`);
    process.exit(1);
  }

  const admin = await createAdminUser(username, password);
  console.log(`Created admin id=${admin.id} username=${admin.username}`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
