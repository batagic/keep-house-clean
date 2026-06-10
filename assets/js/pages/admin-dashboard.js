if (!isAdminLoggedIn()) {
  window.location.replace('login.html');
}

const statusBox = document.getElementById('statusBox');
const passcodeReveal = document.getElementById('passcodeReveal');
const newPasscodeEl = document.getElementById('newPasscode');
const actionError = document.getElementById('actionError');

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
}

function renderStatus(data) {
  if (data.active) {
    statusBox.className = 'status-box';
    statusBox.innerHTML = `
      <strong>Đang có mã active</strong><br/>
      Tạo lúc: ${formatDate(data.createdAt)}<br/>
      Dùng lần cuối: ${formatDate(data.lastUsedAt)}
    `;
  } else {
    statusBox.className = 'status-box inactive';
    statusBox.innerHTML = '<strong>Chưa có mã active</strong><br/>Bé không thể đổi quà cho đến khi bạn tạo mã mới.';
  }
}

async function loadStatus() {
  const { res, data } = await adminFetch('passcode');
  if (res.ok && data.result === 'success') {
    renderStatus(data);
  } else {
    statusBox.className = 'status-box inactive';
    statusBox.textContent = data.message || 'Không tải được trạng thái';
  }
}

function showError(msg) {
  actionError.textContent = msg;
  actionError.classList.remove('hidden');
}

function hideError() {
  actionError.classList.add('hidden');
}

document.getElementById('generateBtn').addEventListener('click', async () => {
  if (!confirm('Tạo mã mới sẽ thu hồi mã cũ. Tiếp tục?')) return;
  hideError();
  passcodeReveal.classList.add('hidden');

  const btn = document.getElementById('generateBtn');
  btn.disabled = true;

  try {
    const { res, data } = await adminFetch('passcode/generate', {
      method: 'POST',
      body: JSON.stringify({ length: 4 }),
    });

    if (!res.ok || data.result !== 'success') {
      showError(data.message || 'Tạo mã thất bại');
      return;
    }

    newPasscodeEl.textContent = data.passcode;
    passcodeReveal.classList.remove('hidden');
    await loadStatus();
  } catch {
    showError('Không kết nối được server');
  } finally {
    btn.disabled = false;
  }
});

document.getElementById('revokeBtn').addEventListener('click', async () => {
  if (!confirm('Thu hồi mã? Bé sẽ không đổi quà được.')) return;
  hideError();
  passcodeReveal.classList.add('hidden');

  const { res, data } = await adminFetch('passcode/revoke', { method: 'POST' });
  if (!res.ok) {
    showError(data.message || 'Thu hồi thất bại');
    return;
  }
  await loadStatus();
});

document.getElementById('logoutBtn').addEventListener('click', () => {
  clearAdminSession();
  window.location.href = 'login.html';
});

loadStatus();
