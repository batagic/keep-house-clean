if (isAdminLoggedIn()) {
  window.location.replace('dashboard.html');
}

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('loginBtn');
  const errEl = document.getElementById('loginError');
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;

  errEl.classList.add('hidden');
  btn.disabled = true;
  btn.textContent = 'Đang đăng nhập…';

  try {
    const { res, data } = await adminFetch('login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok || !data.token) {
      errEl.textContent = data.message || 'Đăng nhập thất bại';
      errEl.classList.remove('hidden');
      return;
    }

    setAdminToken(data.token);
    window.location.href = 'dashboard.html';
  } catch {
    errEl.textContent = 'Không kết nối được server';
    errEl.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Đăng nhập';
  }
});
