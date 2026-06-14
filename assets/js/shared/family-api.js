/** Mã gia đình legacy — khớp migration 004 (bé đã có trước khi bật family_id) */
const LEGACY_FAMILY_ID = 'fam_v1_default';
const FAMILY_ID_KEY = 'kho_thoc_family_id';

function migrateLegacyFamilyIfNeeded() {
  if (localStorage.getItem(FAMILY_ID_KEY)) return;
  try {
    const raw = localStorage.getItem('kho_thoc_v3_profiles');
    if (!raw) return;
    const data = JSON.parse(raw);
    if (Array.isArray(data) && data.length > 0) {
      localStorage.setItem(FAMILY_ID_KEY, LEGACY_FAMILY_ID);
    }
  } catch { /* quota / parse */ }
}

function getFamilyId() {
  migrateLegacyFamilyIfNeeded();
  let id = localStorage.getItem(FAMILY_ID_KEY);
  if (!id) {
    id = typeof crypto !== 'undefined' && crypto.randomUUID
      ? `fam_${crypto.randomUUID()}`
      : `fam_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(FAMILY_ID_KEY, id);
  }
  return id;
}

function familyStorageKey(base) {
  return `${base}_${getFamilyId()}`;
}

function apiFetch(url, options = {}) {
  const headers = {
    ...(options.headers || {}),
    'X-Family-Id': getFamilyId(),
  };
  if (options.body != null && !(options.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type']
      || (typeof API_USE_PLAIN_TEXT !== 'undefined' && API_USE_PLAIN_TEXT
        ? 'text/plain'
        : 'application/json');
  }
  return fetch(url, { ...options, headers });
}
