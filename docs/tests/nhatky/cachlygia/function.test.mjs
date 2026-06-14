/**
 * NK-ISO-F* — Test function (frontend family-api + backend middleware)
 * Chạy: node --test docs/tests/nhatky/cachlygia/function.test.mjs
 */
import { describe, test, mock } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { createRequire } from 'module';

const REPO_ROOT = path.resolve(import.meta.dirname, '../../../..');
const require = createRequire(import.meta.url);

// Cho phép require profiles.js mà không cần Postgres thật (chỉ test pure function)
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://test:test@127.0.0.1:5432/kho_thoc_test';
}

function loadFamilyApi(storage = {}) {
  const store = { ...storage };
  const context = {
    localStorage: {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; },
    },
    crypto: { randomUUID: () => '11111111-2222-4333-8444-555555555555' },
    API_USE_PLAIN_TEXT: false,
    fetch: mock.fn(() => Promise.resolve({ ok: true })),
    console,
  };
  const code = fs.readFileSync(
    path.join(REPO_ROOT, 'assets/js/shared/family-api.js'),
    'utf8'
  );
  vm.runInNewContext(code, context);
  return { ...context, store };
}

describe('NK-ISO-F — frontend family-api.js', () => {
  test('NK-ISO-F01 getFamilyId tạo mã mới khi chưa có', () => {
    const ctx = loadFamilyApi();
    const id = ctx.getFamilyId();
    assert.match(id, /^fam_/);
    assert.equal(ctx.store.kho_thoc_family_id, id);
  });

  test('NK-ISO-F02 getFamilyId trả lại mã đã lưu', () => {
    const ctx = loadFamilyApi({ kho_thoc_family_id: 'fam_existing_abc' });
    assert.equal(ctx.getFamilyId(), 'fam_existing_abc');
  });

  test('NK-ISO-F03 migrateLegacyFamilyIfNeeded — cache cũ → fam_v1_default', () => {
    const ctx = loadFamilyApi({
      kho_thoc_v3_profiles: JSON.stringify([{ id: 'p_old', name: 'Bé cũ' }]),
    });
    assert.equal(ctx.getFamilyId(), 'fam_v1_default');
  });

  test('NK-ISO-F04 familyStorageKey gắn family_id vào key', () => {
    const ctx = loadFamilyApi({ kho_thoc_family_id: 'fam_key_test' });
    assert.equal(ctx.familyStorageKey('kho_thoc_v3_profiles'), 'kho_thoc_v3_profiles_fam_key_test');
  });

  test('NK-ISO-F05 apiFetch gửi header X-Family-Id', async () => {
    const ctx = loadFamilyApi({ kho_thoc_family_id: 'fam_fetch_test' });
    await ctx.apiFetch('https://example.test/api', { method: 'GET' });
    assert.equal(ctx.fetch.mock.calls.length, 1);
    const [, opts] = ctx.fetch.mock.calls[0].arguments;
    assert.equal(opts.headers['X-Family-Id'], 'fam_fetch_test');
  });
});

describe('NK-ISO-F — backend middleware', () => {
  const { requireFamilyId } = require(
    path.join(REPO_ROOT, 'kho-thoc-api/src/middleware/familyContext.js')
  );

  test('NK-ISO-F06 requireFamilyId từ chối thiếu header', () => {
    const req = { headers: {} };
    const res = {
      statusCode: 0,
      body: null,
      status(code) { this.statusCode = code; return this; },
      json(data) { this.body = data; },
    };
    let nextCalled = false;
    requireFamilyId(req, res, () => { nextCalled = true; });
    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 400);
    assert.match(res.body.message, /X-Family-Id/);
  });

  test('NK-ISO-F07 requireFamilyId gắn req.familyId', () => {
    const req = { headers: { 'x-family-id': 'fam_mw_test' } };
    let nextCalled = false;
    requireFamilyId(req, resStub(), () => { nextCalled = true; });
    assert.equal(nextCalled, true);
    assert.equal(req.familyId, 'fam_mw_test');
  });
});

describe('NK-ISO-F — backend normalizeProfile', () => {
  const { normalizeProfile } = require(
    path.join(REPO_ROOT, 'kho-thoc-api/src/services/profiles.js')
  );

  test('NK-ISO-F08 normalizeProfile chuẩn hóa row DB', () => {
    const out = normalizeProfile({
      id: 'p1',
      name: 'An',
      avatar: '🧒',
      total_grain: '120',
      total_exp: 50,
    });
    assert.deepEqual(out, {
      id: 'p1',
      name: 'An',
      avatar: '🧒',
      total_grain: 120,
      total_exp: 50,
    });
  });
});

describe('NK-ISO-F — frontend nhat-ky.js tích hợp family-api', () => {
  const nhatKy = fs.readFileSync(
    path.join(REPO_ROOT, 'assets/js/pages/nhat-ky.js'),
    'utf8'
  );

  test('NK-ISO-F09 nhat-ky.js dùng apiFetch thay fetch', () => {
    assert.match(nhatKy, /apiFetch\(/);
    assert.doesNotMatch(nhatKy, /await fetch\(/);
  });

  test('NK-ISO-F10 nhat-ky.js scope cache theo familyStorageKey', () => {
    assert.match(nhatKy, /familyStorageKey\('kho_thoc_v3_profiles'\)/);
    assert.match(nhatKy, /familyStorageKey\('kho_thoc_v3_last_pid'\)/);
  });
});

function resStub() {
  return {
    status() { return this; },
    json() {},
  };
}
