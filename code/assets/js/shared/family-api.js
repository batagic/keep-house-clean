/** Mã gia đình legacy — khớp migration 004 (bé đã có trước khi bật family_id) */
const LEGACY_FAMILY_ID = 'fam_v1_default';
const FAMILY_ID_KEY = 'kho_thoc_family_id';
const FAMILY_UNLOCKED_KEY = 'kho_thoc_family_unlocked';

function setFamilySession(familyId) {
  const fid = String(familyId || '').trim();
  if (!fid) return;
  localStorage.setItem(FAMILY_ID_KEY, fid);
  localStorage.setItem(FAMILY_UNLOCKED_KEY, '1');
}

function clearFamilySession() {
  localStorage.removeItem(FAMILY_ID_KEY);
  localStorage.removeItem(FAMILY_UNLOCKED_KEY);
}

function migrateLegacyFamilyIfNeeded() {
  if (localStorage.getItem(FAMILY_UNLOCKED_KEY) === '1') return;
  try {
    const raw = localStorage.getItem('kho_thoc_v3_profiles');
    if (!raw) return;
    const data = JSON.parse(raw);
    if (Array.isArray(data) && data.length > 0) {
      setFamilySession(LEGACY_FAMILY_ID);
    }
  } catch { /* quota / parse */ }
}

function isFamilyUnlocked() {
  migrateLegacyFamilyIfNeeded();
  return localStorage.getItem(FAMILY_UNLOCKED_KEY) === '1'
    && !!localStorage.getItem(FAMILY_ID_KEY);
}

function getFamilyId() {
  if (!isFamilyUnlocked()) return '';
  return localStorage.getItem(FAMILY_ID_KEY) || '';
}

function familyStorageKey(base) {
  const fid = getFamilyId();
  return fid ? `${base}_${fid}` : base;
}

function apiFetch(url, options = {}) {
  const headers = { ...(options.headers || {}) };
  const fid = getFamilyId();
  if (fid) headers['X-Family-Id'] = fid;
  if (options.body != null && !(options.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type']
      || (typeof API_USE_PLAIN_TEXT !== 'undefined' && API_USE_PLAIN_TEXT
        ? 'text/plain'
        : 'application/json');
  }
  return fetch(url, { ...options, headers });
}

function apiPostPublic(payload) {
  const headers = {
    'Content-Type': typeof API_USE_PLAIN_TEXT !== 'undefined' && API_USE_PLAIN_TEXT
      ? 'text/plain'
      : 'application/json',
  };
  return fetch(API_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
}

async function unlockFamily(passcode) {
  const res = await apiPostPublic({ type: 'unlock_family', passcode: String(passcode || '').trim() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.result !== 'success') {
    const err = new Error(data.message || 'Mã xác nhận không đúng');
    err.status = res.status;
    throw err;
  }
  setFamilySession(data.familyId);
  return data;
}
