/**
 * NK-SES-F* — Test function phiên gia đình (family-api.js)
 */
import { describe, test, mock } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import vm from 'vm';

const REPO_ROOT = path.resolve(import.meta.dirname, '../../../..');
const CODE_ROOT = path.join(REPO_ROOT, 'code');

function loadFamilyApi(storage = {}) {
  const store = { ...storage };
  const context = {
    localStorage: {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; },
    },
    API_URL: 'https://example.test/kho-thoc/',
    API_USE_PLAIN_TEXT: false,
    fetch: mock.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ result: 'success', familyId: 'fam_unlocked' }),
    })),
    console,
  };
  const code = fs.readFileSync(
    path.join(CODE_ROOT, 'assets/js/shared/family-api.js'),
    'utf8'
  );
  vm.runInNewContext(code, context);
  return { ...context, store };
}

describe('NK-SES-F — family session', () => {
  test('NK-SES-F01 getFamilyId trả rỗng khi chưa unlock', () => {
    const ctx = loadFamilyApi();
    assert.equal(ctx.getFamilyId(), '');
  });

  test('NK-SES-F02 setFamilySession + isFamilyUnlocked', () => {
    const ctx = loadFamilyApi();
    ctx.setFamilySession('fam_abc');
    assert.equal(ctx.isFamilyUnlocked(), true);
    assert.equal(ctx.getFamilyId(), 'fam_abc');
  });

  test('NK-SES-F03 migrateLegacyFamilyIfNeeded — cache cũ → fam_v1_default + unlocked', () => {
    const ctx = loadFamilyApi({
      kho_thoc_v3_profiles: JSON.stringify([{ id: 'p_old', name: 'Bé cũ' }]),
    });
    assert.equal(ctx.isFamilyUnlocked(), true);
    assert.equal(ctx.getFamilyId(), 'fam_v1_default');
  });

  test('NK-SES-F04 apiFetch không gửi X-Family-Id khi chưa unlock', async () => {
    const ctx = loadFamilyApi();
    await ctx.apiFetch('https://example.test/api', { method: 'GET' });
    const [, opts] = ctx.fetch.mock.calls[0].arguments;
    assert.equal(opts.headers['X-Family-Id'], undefined);
  });

  test('NK-SES-F05 apiFetch gửi X-Family-Id sau unlock', async () => {
    const ctx = loadFamilyApi();
    ctx.setFamilySession('fam_fetch');
    await ctx.apiFetch('https://example.test/api', { method: 'GET' });
    const [, opts] = ctx.fetch.mock.calls[0].arguments;
    assert.equal(opts.headers['X-Family-Id'], 'fam_fetch');
  });

  test('NK-SES-F08 unlockFamily lưu familyId', async () => {
    const ctx = loadFamilyApi();
    await ctx.unlockFamily('4829');
    assert.equal(ctx.store.kho_thoc_family_id, 'fam_unlocked');
    assert.equal(ctx.store.kho_thoc_family_unlocked, '1');
  });
});

describe('NK-SES-F — nhat-ky.html / nhat-ky.js', () => {
  const html = fs.readFileSync(path.join(CODE_ROOT, 'nhat-ky.html'), 'utf8');
  const nhatKy = fs.readFileSync(path.join(CODE_ROOT, 'assets/js/pages/nhat-ky.js'), 'utf8');

  test('NK-SES-F09 nhat-ky.html có modal unlock', () => {
    assert.match(html, /unlockModalOverlay/);
    assert.match(html, /unlockPasscode/);
  });

  test('NK-SES-F10 nhat-ky.js có requireFamilySession', () => {
    assert.match(nhatKy, /requireFamilySession/);
    assert.match(nhatKy, /confirmUnlockSession/);
  });
});
