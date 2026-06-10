/* ============================================================
       STATE
    ============================================================ */
    let profiles       = [];
    let currentProfile = null;
    let isBonusActive  = false;
    let sheetsLogs     = {};   // { pid: [{date,grain,exp,note,tasks,bonus}] }
    let profileBalances = {};  // { pid: { totalGrain, totalExp } } — precomputed

    const CACHE_KEY         = 'kho_thoc_journal_v2';
    const HISTORY_INITIAL   = 25;
    let _historyShowAll     = false;

    /* ── Pre-computed lookups (build once, reuse everywhere) ── */
    const TASK_MAP   = {};   // id → task object
    const REWARD_MAP = {};   // id → reward object

    /* ============================================================
       DATA CONSTANTS
    ============================================================ */
    // TASKS loaded from data/tasks.js

    // REWARDS loaded from data/rewards.js

    /* Build lookup maps once at startup — O(1) access later */
    TASKS.forEach(t   => TASK_MAP[t.id]   = t);
    REWARDS.forEach(r => REWARD_MAP[r.id] = r);

    /* Pre-compute task categories order (used by renderTasks) */
    const TASK_CATEGORIES = [...new Set(TASKS.map(t => t.category))];

    /* ============================================================
       API & STORAGE
    ============================================================ */
    function getState(pid) {
      return profileBalances[pid] || { totalGrain: 0, totalExp: 0 };
    }

    /** Số dư từ cache server trên Profiles (total_grain / total_exp) */
    function _applyBalancesFromProfiles() {
      for (let i = 0; i < profiles.length; i++) {
        const p = profiles[i];
        profileBalances[p.id] = {
          totalGrain: Number(p.total_grain ?? p.balance) || 0,
          totalExp:   Number(p.total_exp) || 0
        };
      }
    }

    function _rebuildBalances() {
      profileBalances = {};
      for (const pid in sheetsLogs) {
        const logs = sheetsLogs[pid];
        let totalGrain = 0, totalExp = 0;
        for (let i = 0; i < logs.length; i++) {
          totalGrain += logs[i].grain;
          totalExp   += logs[i].exp;
        }
        profileBalances[pid] = { totalGrain, totalExp };
      }
      /* Đồng bộ lại lên object profile để localStorage cache khớp server */
      for (let i = 0; i < profiles.length; i++) {
        const p = profiles[i];
        const b = profileBalances[p.id] || { totalGrain: 0, totalExp: 0 };
        p.total_grain = b.totalGrain;
        p.total_exp   = b.totalExp;
      }
    }

    function _parseLogs(rawLogs) {
      sheetsLogs = {};
      for (let i = 0; i < rawLogs.length; i++) {
        const row = rawLogs[i];
        const pid = row.id || row.profileId;
        if (!pid) continue;
        if (!sheetsLogs[pid]) sheetsLogs[pid] = [];
        sheetsLogs[pid].push({
          profileId: pid,
          date:  row.date  || '',
          grain: Number(row.grain) || 0,
          exp:   Number(row.exp)   || 0,
          note:  row.note  || '',
          tasks: row.tasks || '',
          bonus: row.bonus || false
        });
      }
      _rebuildBalances();
    }

    /* ── localStorage cache: hiển thị ngay, đồng bộ nền ── */
    function _readCache() {
      try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const data = JSON.parse(raw);
        if (!data || !Array.isArray(data.profiles)) return null;
        return data;
      } catch {
        return null;
      }
    }

    function _writeCache(profs, rawLogs) {
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          savedAt: Date.now(),
          profiles: profs,
          logs: rawLogs || []
        }));
      } catch { /* quota exceeded — bỏ qua */ }
    }

    function _setSyncStatus(msg, syncing = false) {
      const el = document.getElementById('syncStatus');
      if (!el) return;
      el.textContent = msg || '';
      el.classList.toggle('syncing', syncing);
      el.hidden = !msg;
    }

    function _showProfileSkeleton() {
      const grid = document.getElementById('profileGrid');
      if (!grid) return;
      grid.innerHTML = `
        <div class="profile-skeleton" style="grid-column:1/-1">
          <div class="skeleton-card"><div class="skeleton-line h24 w60"></div><div class="skeleton-line w40"></div><div class="skeleton-line"></div></div>
          <div class="skeleton-card"><div class="skeleton-line h24 w60"></div><div class="skeleton-line w40"></div><div class="skeleton-line"></div></div>
        </div>`;
    }

    function _applyServerData(profs, rawLogs, autoSelect) {
      profiles = profs;
      if (rawLogs && rawLogs.length) {
        _parseLogs(rawLogs);
      } else {
        _applyBalancesFromProfiles();
        renderProfiles();
      }
      if (autoSelect && profiles.length > 0) {
        const pid = currentProfile?.id && profiles.some(p => p.id === currentProfile.id)
          ? currentProfile.id
          : profiles[0].id;
        selectProfile(pid, true);
      }
    }

    function _selectProfileAfterLoad(prevPid) {
      if (prevPid && profiles.some(p => p.id === prevPid)) {
        selectProfile(prevPid, true);
      } else if (profiles.length > 0) {
        selectProfile(profiles[0].id, true);
      }
    }

    async function saveData(payload) {
      try {
        const res    = await fetch(API_URL, { method:'POST', headers:{'Content-Type':'text/plain'}, body:JSON.stringify(payload) });
        const result = await res.json();
        if (result.result !== 'success') showToast('⚠️ Ghi Sheets thất bại: ' + result.message);
        return result;
      } catch(err) {
        showToast('⚠️ Không kết nối được Server!');
        return null;
      }
    }

    async function loadData(hadCache = false) {
      if (!hadCache) _setSyncStatus('Đang tải dữ liệu bé…', true);

      const prevPid = currentProfile?.id;

      try {
        /* Phase 1: profiles + số dư cache (nhẹ, first paint nhanh) */
        const profRes  = await fetch(`${API_URL}?type=profiles`);
        const profData = await profRes.json();
        const newProfiles = Array.isArray(profData.profiles) ? profData.profiles : [];

        profiles = newProfiles;
        _applyBalancesFromProfiles();
        renderProfiles();
        _selectProfileAfterLoad(prevPid);

        if (!hadCache) _setSyncStatus('Đang tải nhật ký…', true);

        /* Phase 2: logs (nặng hơn, tải nền) */
        const logRes  = await fetch(`${API_URL}?type=logs`);
        const logData = await logRes.json();
        const newLogs = Array.isArray(logData.logs) ? logData.logs : [];

        _writeCache(newProfiles, newLogs);
        _parseLogs(newLogs);
        renderProfiles();
        _selectProfileAfterLoad(prevPid);

        if (currentProfile) {
          renderRewards();
          renderHistory();
        }

        if (hadCache) {
          _setSyncStatus('Đã đồng bộ mới nhất');
          setTimeout(() => _setSyncStatus(''), 2500);
        } else {
          _setSyncStatus('');
        }
      } catch (err) {
        if (!hadCache) {
          showToast('⚠️ Không tải được dữ liệu từ Server!');
          const grid = document.getElementById('profileGrid');
          if (grid) grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:var(--text-muted);padding:2rem;">Không kết nối được server. Thử tải lại trang.</p>';
        } else {
          _setSyncStatus('Không đồng bộ được — đang dùng dữ liệu đã lưu');
        }
      }
    }

    /* ============================================================
       RENDER — DOM manipulation tối thiểu
    ============================================================ */

    /* Render task list — chỉ gọi 1 lần lúc DOMContentLoaded */
    function renderTasks() {
      const container = document.getElementById('tasksCompactGrid');
      if (!container) return;
      const parts = [];
      TASK_CATEGORIES.forEach(cat => {
        parts.push(`<div class="task-category-title">${cat}</div><div class="tasks-compact-grid">`);
        TASKS.filter(t => t.category === cat).forEach(task => {
          const epicCls = task.type === 'epic' ? ' epic-task' : '';
          parts.push(`
            <div class="task-compact-card${epicCls}" id="taskCard_${task.id}" onclick="toggleTask('${task.id}')">
              <input type="checkbox" class="task-cb" id="taskCB_${task.id}" onclick="event.stopPropagation();toggleTask('${task.id}')"/>
              <div class="task-emoji">${task.emoji}</div>
              <div class="task-compact-details">
                <div title="${task.name}">${task.name}</div>
                <div class="task-sub">${task.sub}</div>
              </div>
              <div class="task-compact-rewards">+${task.grain}🌾<br/>+${task.exp}⭐</div>
          </div>`);
        });
        parts.push('</div>');
      });
      container.innerHTML = parts.join('');
    }

    /* Cache DOM refs for counter update — queried once */
    let _elCheckedCount, _elTodayGrain, _elTodayExp;
    function _initCounterRefs() {
      _elCheckedCount = document.getElementById('checkedCount');
      _elTodayGrain   = document.getElementById('todayGrain');
      _elTodayExp     = document.getElementById('todayExp');
    }

    /* updateCounterAndTotals — đọc trực tiếp checked state, không query DOM trong vòng lặp */
    function updateCounterAndTotals() {
      let count = 0, grain = 0, exp = 0;
      for (let i = 0; i < TASKS.length; i++) {
        const cb = document.getElementById(`taskCB_${TASKS[i].id}`);
        if (cb && cb.checked) { count++; grain += TASKS[i].grain; exp += TASKS[i].exp; }
      }
      if (isBonusActive) grain = Math.floor(grain * 1.2);
      _elCheckedCount.textContent = `${count} / ${TASKS.length}`;
      _elTodayGrain.textContent   = grain;
      _elTodayExp.textContent     = exp;
    }

    /* renderProfiles — build HTML string once, set innerHTML once */
    const RANKS = [
      { name:'Tân Binh',      emoji:'🌱', min:0,    max:200  },
      { name:'Thợ Cày',       emoji:'🌿', min:200,  max:500  },
      { name:'Điền Chủ',      emoji:'🌾', min:500,  max:1000 },
      { name:'Lão Làng',      emoji:'🏡', min:1000, max:2000 },
      { name:'Đại Điền Chủ',  emoji:'👑', min:2000, max:Infinity },
    ];

    function renderProfiles() {
      const grid = document.getElementById('profileGrid');
      if (!grid) return;
      if (!profiles.length) {
        grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:var(--text-muted);padding:2rem;">Chưa có bé nào. Nhấn "Đăng ký bé mới" để bắt đầu!</p>';
        return;
      }

      const parts = [];
      for (let i = 0; i < profiles.length; i++) {
        const p        = profiles[i];
        const state    = getState(p.id);
        const isActive = currentProfile && currentProfile.id === p.id;

        const rank    = RANKS.findLast(r => state.totalExp >= r.min) || RANKS[0];
        const isMax   = rank.max === Infinity;
        const lvlExp  = state.totalExp - rank.min;
        const lvlRange = isMax ? 1 : rank.max - rank.min;
        const pct     = isMax ? 100 : Math.min(100, Math.round((lvlExp / lvlRange) * 100));
        const expText = isMax
        ? `${state.totalExp.toLocaleString('vi-VN')} ⭐ MAX`
        : `${state.totalExp.toLocaleString('vi-VN')} / ${rank.max.toLocaleString('vi-VN')}`;

        parts.push(`
      <div class="profile-card${isActive ? ' active' : ''}" data-pid="${p.id}" onclick="selectProfile('${p.id}',true)">
        <div class="profile-header">
          <span class="profile-avatar">${p.avatar || '👶'}</span>
          <div class="profile-info">
            <h3 class="profile-name">${p.name}</h3>
            <div class="profile-level-badge">${rank.emoji} ${rank.name}</div>
          </div>
        </div>
        <div class="profile-stats-container">
          <div class="p-stat-box grain">
            <span>🌾 Gạo Tích Lũy</span>
            ${state.totalGrain.toLocaleString('vi-VN')}
          </div>
          <div class="p-stat-box money">
            <span>💸 Tiền Quy Đổi</span>
            ${(state.totalGrain * 100).toLocaleString('vi-VN')}đ
          </div>
        </div>
        <div class="profile-progress-block">
          <div style="display:flex;justify-content:space-between;margin-bottom:0.25rem;">
            <span>${rank.emoji} ${rank.name}</span>
            <span>${expText}</span>
          </div>
          <div class="profile-bar-bg">
            <div class="profile-bar-fill" style="width:${pct}%"></div>
          </div>
        </div>
        </div>`);
      }
      grid.innerHTML = parts.join('');
    }

    /* renderRewards — chỉ re-render khi profile thay đổi hoặc sau giao dịch */
    function renderRewards() {
      const container = document.getElementById('rewardsSmallGrid');
      if (!container) return;
      if (!currentProfile) {
        container.innerHTML = '<p style="font-size:.9rem;color:var(--text-muted);text-align:center;grid-column:1/-1;padding:2rem;">Chọn bé để xem kho quà.</p>';
        return;
      }
      const { totalGrain } = getState(currentProfile.id);
      const parts = [];
      for (let i = 0; i < REWARDS.length; i++) {
        const rw       = REWARDS[i];
        const canAfford = totalGrain >= rw.cost;
        parts.push(`
          <div class="reward-small-card${canAfford ? '' : ' disabled'}"
               data-reward-id="${rw.id}" data-cost="${rw.cost}" data-name="${rw.name}"
               onclick="toggleRewardSelection(this,${canAfford})">
            <div class="rw-s-emoji">${rw.emoji}</div>
            <div class="rw-s-name" title="${rw.name}">${rw.name}</div>
            <div class="rw-s-cost">${rw.cost.toLocaleString()} 🌾</div>
        </div>`);
      }
      container.innerHTML = parts.join('');
    }

    /* renderHistory — sort cached, không sort lại mỗi lần */
    let _sortedLogsCache = null;
    let _sortedLogsPid   = null;

    function renderHistory() {
      const list = document.getElementById('historyList');
      if (!list) return;
      if (!currentProfile) {
        list.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:1rem;">Vui lòng chọn một bé để hiển thị lịch sử.</p>';
        return;
      }
      /* Chỉ sort lại khi đổi bé hoặc logs thay đổi */
      if (_sortedLogsPid !== currentProfile.id || !_sortedLogsCache) {
        const logs = sheetsLogs[currentProfile.id] || [];
        _sortedLogsCache = [...logs].sort((a,b) => b.date.localeCompare(a.date));
        _sortedLogsPid   = currentProfile.id;
      }
      if (!_sortedLogsCache.length) {
        list.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:1rem;">Chưa có nhật ký nào.</p>';
        return;
      }
      const visible = _historyShowAll
        ? _sortedLogsCache
        : _sortedLogsCache.slice(0, HISTORY_INITIAL);
      const hiddenCount = _sortedLogsCache.length - visible.length;

      const parts = [];
      for (let i = 0; i < visible.length; i++) {
        const lg         = visible[i];
        const isRedeem   = lg.tasks === 'REDEEM';
        const grainColor = lg.grain >= 0 ? 'var(--green-mid)' : 'var(--red)';
        const grainText  = lg.grain >= 0 ? `+${lg.grain}` : `${lg.grain}`;
        const content    = isRedeem
        ? (lg.note || '🎁 Đổi quà')
        : (lg.tasks
          ? lg.tasks.split(',').map(id => TASK_MAP[id.trim()]?.name || id).join(', ')
          : (lg.note || ''));
        parts.push(`
          <div class="history-item">
            <div>
              <div class="h-date">${formatVNDate(lg.date)}</div>
              <div class="h-note">${content}</div>
            </div>
            <div style="display:flex;align-items:center;gap:1rem;">
              <div class="h-gains" style="text-align:right">
                <span style="color:${grainColor}">${grainText} 🌾</span><br/>
          ${lg.exp > 0 ? `<span style="color:var(--green-deep)">+${lg.exp} ⭐</span>` : ''}
              </div>
              <button class="btn-delete" onclick="deleteHistory('${lg.date}')"><i class="fas fa-trash"></i></button>
            </div>
        </div>`);
      }
      if (hiddenCount > 0) {
        parts.push(`<button type="button" class="history-more" onclick="loadMoreHistory()">Xem thêm ${hiddenCount} mục cũ hơn…</button>`);
      }
      list.innerHTML = parts.join('');
    }

    function loadMoreHistory() {
      _historyShowAll = true;
      renderHistory();
    }

    /* ── Invalide sort cache khi logs thay đổi ── */
    function _invalidateSortCache() { _sortedLogsCache = null; }

    /* ============================================================
       USER ACTIONS
    ============================================================ */

    function selectProfile(pid, light = false) {
      currentProfile = profiles.find(p => p.id === pid);
      _invalidateSortCache();
      _historyShowAll = false;

      if (light) {
        document.querySelectorAll('.profile-card').forEach(el => {
          el.classList.toggle('active', el.dataset.pid === pid);
        });
      } else {
        renderProfiles();
      }

      requestAnimationFrame(() => {
        renderRewards();
        renderHistory();
      });
    }

    function toggleTask(id) {
      const cb   = document.getElementById(`taskCB_${id}`);
      const card = document.getElementById(`taskCard_${id}`);
      if (!cb || !card) return;
      if (event.target !== cb) cb.checked = !cb.checked;
      card.classList.toggle('checked', cb.checked);
      updateCounterAndTotals();
    }

    function toggleBonus() {
      isBonusActive = !isBonusActive;
      document.getElementById('bonusToggleDiv').classList.toggle('active', isBonusActive);
      updateCounterAndTotals();
    }

    function toggleRewardSelection(el, canAfford) {
      if (!canAfford) { showToast('Gạo của bé chưa đủ để đổi phần quà này!'); return; }
      el.classList.toggle('selected');
    }

    /* Ghi nhật ký — optimistic update: push vào cache ngay, không chờ reload */
    async function submitDailyLog() {
      if (!currentProfile) { alert('Vui lòng chọn một bé!'); return; }
      let grain = 0, exp = 0, hasChecked = false;
      const tasksDone = [];
      for (let i = 0; i < TASKS.length; i++) {
        const cb = document.getElementById(`taskCB_${TASKS[i].id}`);
        if (cb && cb.checked) { grain += TASKS[i].grain; exp += TASKS[i].exp; hasChecked = true; tasksDone.push(TASKS[i].id); }
      }
      if (!hasChecked) { alert('Vui lòng tích chọn ít nhất một nhiệm vụ!'); return; }
      if (isBonusActive) grain = Math.floor(grain * 1.2);

      const dateString = _nowString();
      const noteText   = document.getElementById('logNote')?.value.trim() || '';
      const logEntry   = { profileId:currentProfile.id, date:dateString, grain, exp, note:noteText, tasks:tasksDone.join(','), bonus:isBonusActive };

      /* Optimistic update — UI phản hồi ngay không cần chờ server */
      if (!sheetsLogs[currentProfile.id]) sheetsLogs[currentProfile.id] = [];
      sheetsLogs[currentProfile.id].push(logEntry);
      _invalidateSortCache();

      /* Reset form */
      document.getElementById('logNote').value = '';
      TASKS.forEach(t => {
        const cb   = document.getElementById(`taskCB_${t.id}`);   if(cb)   cb.checked = false;
        const card = document.getElementById(`taskCard_${t.id}`); if(card) card.classList.remove('checked');
      });
      if (isBonusActive) toggleBonus();

      _rebuildBalances();
      renderProfiles(); renderRewards(); renderHistory(); updateCounterAndTotals();
      _writeCache(profiles, _flattenLogs());
      showToast(`🌾 Đã ghi +${grain} Gạo cho ${currentProfile.name}!`);

      /* Sync lên Sheets background (không await) */
      saveData({ type:'log', profileId:currentProfile.id, profileName:currentProfile.name, date:dateString, grain, exp, tasks:tasksDone.join(','), bonus:isBonusActive, note:noteText });
    }

    /* Đổi quà — optimistic update với grain âm */
    async function redeemReward() {
      if (!currentProfile) { showToast('Vui lòng chọn bé trước!'); return; }
      const selected = document.querySelectorAll('.reward-small-card.selected');
      if (!selected.length) { showToast('Vui lòng chọn ít nhất một món quà!'); return; }

      let totalCost = 0;
      const rewardNames = [];
      selected.forEach(card => { totalCost += Number(card.dataset.cost || 0); rewardNames.push(card.dataset.name); });

      const { totalGrain } = getState(currentProfile.id);
      if (totalGrain < totalCost) { showToast('Không đủ Gạo để đổi quà!'); return; }
      if (!confirm(`Xác nhận đổi quà cho ${currentProfile.name}?\n\n🎁 ${rewardNames.join(', ')}\n🌾 Trừ: ${totalCost.toLocaleString()} Gạo`)) return;

      const dateString = _nowString();
      const logEntry   = { profileId:currentProfile.id, date:dateString, grain:-totalCost, exp:0, tasks:'REDEEM', bonus:false, note:'Đổi quà: ' + rewardNames.join(', ') };

      /* Optimistic update */
      if (!sheetsLogs[currentProfile.id]) sheetsLogs[currentProfile.id] = [];
      sheetsLogs[currentProfile.id].push(logEntry);
      _invalidateSortCache();

      _rebuildBalances();
      renderProfiles(); renderRewards(); renderHistory();
      _writeCache(profiles, _flattenLogs());
      showToast(`🎁 Đổi quà thành công! -${totalCost.toLocaleString()} 🌾`);

      /* Sync background */
      saveData({ type:'log', profileId:currentProfile.id, profileName:currentProfile.name, date:dateString, grain:-totalCost, exp:0, tasks:'REDEEM', bonus:false, note:logEntry.note });
    }

    async function deleteHistory(dateStr) {
      if (!confirm(`Xóa nhật ký ngày ${dateStr}?\nThao tác này sẽ trừ lại số Gạo và EXP!`)) return;
      const result = await saveData({ type:'delete_log', profileId:currentProfile.id, date:dateStr });
      if (result && result.result === 'success') {
        sheetsLogs[currentProfile.id] = sheetsLogs[currentProfile.id].filter(lg => lg.date !== dateStr);
        _invalidateSortCache();
        _rebuildBalances();
        renderProfiles(); renderRewards(); renderHistory();
        _writeCache(profiles, _flattenLogs());
        showToast(`Đã xóa nhật ký ngày ${dateStr}`);
      } else {
        showToast('⚠️ Xóa thất bại, thử lại!');
      }
    }

    /* ============================================================
       PROFILE MANAGEMENT
    ============================================================ */
    function openModal()  { document.getElementById('modalOverlay').classList.add('open'); }
    function closeModal() { document.getElementById('modalOverlay').classList.remove('open'); }

    function confirmAddProfile() {
      const name   = document.getElementById('pName')?.value.trim();
      const avatar = document.getElementById('pAvatar')?.value.trim() || '👶';
      if (!name) { alert('Vui lòng nhập tên của bé!'); return; }
      const newProfile = { id:'p_' + Date.now(), name, avatar, total_grain:0, total_exp:0 };
      profiles.push(newProfile);
      profileBalances[newProfile.id] = { totalGrain: 0, totalExp: 0 };
      saveData({ type:'profile', ...newProfile });
      document.getElementById('pName').value = '';
      closeModal();
      renderProfiles();
      _writeCache(profiles, _flattenLogs());
      showToast(`👶 Đăng ký thành công cho bé ${name}!`);
    }

    /* ============================================================
       HELPERS
    ============================================================ */
    function _flattenLogs() {
      const flat = [];
      for (const pid in sheetsLogs) {
        for (let i = 0; i < sheetsLogs[pid].length; i++) {
          const lg = sheetsLogs[pid][i];
          flat.push({
            id: pid,
            profileId: pid,
            date: lg.date,
            grain: lg.grain,
            exp: lg.exp,
            note: lg.note,
            tasks: lg.tasks,
            bonus: lg.bonus
          });
        }
      }
      return flat;
    }

    function _nowString() {
      const n = new Date();
      return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')} ${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}`;
    }

    function formatVNDate(dateStr) {
      if (!dateStr) return '';
      // Parse ISO hoặc "YYYY-MM-DD HH:mm" → convert sang GMT+7
      const d = new Date(dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T') + '+00:00');
      const gmt7 = new Date(d.getTime() + 7 * 60 * 60 * 1000);
      const dd   = String(gmt7.getUTCDate()).padStart(2, '0');
      const mm   = String(gmt7.getUTCMonth() + 1).padStart(2, '0');
      const yyyy = gmt7.getUTCFullYear();
      const hh   = String(gmt7.getUTCHours()).padStart(2, '0');
      const min  = String(gmt7.getUTCMinutes()).padStart(2, '0');
      return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
    }

    /* Toast — dùng 1 timer, tránh nhiều toast chồng nhau */
    let _toastTimer;
    function showToast(msg) {
      const t = document.getElementById('toast');
      t.textContent = msg;
      t.classList.add('show');
      clearTimeout(_toastTimer);
      _toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
    }

    /* ── Deprecated stubs — giữ lại đề phòng code cũ gọi ── */
    function saveState() {}
    function saveLog()   {}
    function delLog()    {}
    function getLogs(pid) { return sheetsLogs[pid] || []; }
    function reloadLogs() { return loadData(); }

    /* ============================================================
       INIT
    ============================================================ */
    window.addEventListener('DOMContentLoaded', () => {
      _initCounterRefs();
      renderTasks();

      const cached = _readCache();
      if (cached) {
        _applyServerData(cached.profiles, cached.logs, true);
        _setSyncStatus('Đang đồng bộ nền…', true);
        loadData(true);
      } else {
        _showProfileSkeleton();
        loadData(false);
      }
    });
