if (!isAdminLoggedIn()) {
  window.location.replace('login.html');
}

const profileTableBody = document.getElementById('profileTableBody');
const passcodeReveal = document.getElementById('passcodeReveal');
const newPasscodeEl = document.getElementById('newPasscode');
const revealProfileName = document.getElementById('revealProfileName');
const actionError = document.getElementById('actionError');

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
}

function showError(msg) {
  actionError.textContent = msg;
  actionError.classList.remove('hidden');
}

function hideError() {
  actionError.classList.add('hidden');
}

function hideReveal() {
  passcodeReveal.classList.add('hidden');
}

function renderProfiles(profiles) {
  if (!profiles.length) {
    profileTableBody.innerHTML = `
      <tr>
        <td colspan="5" class="table-empty">Chưa có bé nào. Bé được đăng ký từ trang Nhật Ký.</td>
      </tr>`;
    return;
  }

  profileTableBody.innerHTML = profiles.map((p) => {
    const statusClass = p.hasActivePasscode ? 'badge-active' : 'badge-inactive';
    const statusText = p.hasActivePasscode ? 'Có mã active' : 'Chưa có mã';
    const safeName = p.profileName.replace(/"/g, '&quot;');

    return `
      <tr data-profile-id="${p.profileId}">
        <td>
          <div class="profile-cell">
            <span class="profile-avatar-sm">${p.avatar || '👶'}</span>
            <span>${p.profileName}</span>
          </div>
        </td>
        <td><span class="badge ${statusClass}">${statusText}</span></td>
        <td>${formatDate(p.createdAt)}</td>
        <td>${formatDate(p.lastUsedAt)}</td>
        <td>
          <div class="table-actions">
            <button type="button" class="btn-sm btn-main" data-action="generate" data-profile-id="${p.profileId}" data-profile-name="${safeName}">
              Sinh mã mới
            </button>
            <button type="button" class="btn-sm btn-danger" data-action="revoke" data-profile-id="${p.profileId}" data-profile-name="${safeName}" ${p.hasActivePasscode ? '' : 'disabled'}>
              Thu hồi
            </button>
          </div>
        </td>
      </tr>`;
  }).join('');
}

async function loadProfiles() {
  profileTableBody.innerHTML = '<tr><td colspan="5" class="table-loading">Đang tải…</td></tr>';

  const { res, data } = await adminFetch('passcode');
  if (res.ok && data.result === 'success') {
    renderProfiles(data.profiles || []);
  } else {
    profileTableBody.innerHTML = `
      <tr><td colspan="5" class="table-empty">${data.message || 'Không tải được danh sách bé'}</td></tr>`;
  }
}

profileTableBody.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn || btn.disabled) return;

  const action = btn.dataset.action;
  const profileId = btn.dataset.profileId;
  const profileName = btn.dataset.profileName || 'bé';

  hideError();
  hideReveal();

  if (action === 'generate') {
    if (!confirm(`Sinh mã mới cho ${profileName}? Mã cũ sẽ bị thu hồi.`)) return;

    btn.disabled = true;
    try {
      const { res, data } = await adminFetch('passcode/generate', {
        method: 'POST',
        body: JSON.stringify({ profileId, length: 4 }),
      });

      if (!res.ok || data.result !== 'success') {
        showError(data.message || 'Sinh mã thất bại');
        return;
      }

      revealProfileName.textContent = data.profileName || profileName;
      newPasscodeEl.textContent = data.passcode;
      passcodeReveal.classList.remove('hidden');
      await loadProfiles();
    } catch {
      showError('Không kết nối được server');
    } finally {
      btn.disabled = false;
    }
    return;
  }

  if (action === 'revoke') {
    if (!confirm(`Thu hồi mã của ${profileName}? Bé sẽ không đổi quà được.`)) return;

    btn.disabled = true;
    try {
      const { res, data } = await adminFetch('passcode/revoke', {
        method: 'POST',
        body: JSON.stringify({ profileId }),
      });

      if (!res.ok) {
        showError(data.message || 'Thu hồi thất bại');
        return;
      }

      await loadProfiles();
    } catch {
      showError('Không kết nối được server');
    } finally {
      btn.disabled = false;
    }
  }
});

document.getElementById('logoutBtn').addEventListener('click', () => {
  clearAdminSession();
  window.location.href = 'login.html';
});

document.getElementById('sidebarToggle')?.addEventListener('click', () => {
  document.getElementById('adminSidebar')?.classList.toggle('open');
});

loadProfiles();
