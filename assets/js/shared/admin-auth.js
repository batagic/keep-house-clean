/** JWT admin — trang /admin */
const ADMIN_TOKEN_KEY = 'kho_thoc_admin_token';

function getAdminToken() {
  return localStorage.getItem(ADMIN_TOKEN_KEY) || '';
}

function setAdminToken(token) {
  if (token) localStorage.setItem(ADMIN_TOKEN_KEY, token);
  else localStorage.removeItem(ADMIN_TOKEN_KEY);
}

function clearAdminSession() {
  setAdminToken('');
}

function isAdminLoggedIn() {
  return !!getAdminToken();
}

async function adminFetch(path, options = {}) {
  const url = `${ADMIN_API_URL}${path.replace(/^\//, '')}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  const token = getAdminToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (res.status === 401) {
    clearAdminSession();
    if (!window.location.pathname.endsWith('login.html')) {
      window.location.href = 'login.html';
    }
  }

  return { res, data };
}
