/* ============================================================
       STATE
    ============================================================ */
    let profiles        = [];
    let currentProfile  = null;
    let isBonusActive   = false;
    let sheetsLogs      = {};   // { pid: [{date,grain,exp,note,tasks,bonus}] }
    let profileBalances = {};   // { pid: { totalGrain, totalExp } }
    let logsMeta        = {};   // { pid: { total, hasMore, loaded } }

    const CACHE_PROFILES_KEY = 'kho_thoc_v3_profiles';
    const CACHE_LAST_PID_KEY = 'kho_thoc_v3_last_pid';
    const HISTORY_PAGE       = 25;
    let _historyShowAll      = false;
    let _tasksRendered       = false;
    let _logsLoading         = false;

    const TASK_MAP   = {};
    const REWARD_MAP = {};

    TASKS.forEach(t   => TASK_MAP[t.id]   = t);
    REWARDS.forEach(r => REWARD_MAP[r.id] = r);

    const TASK_CATEGORIES = [...new Set(TASKS.map(t => t.category))];

    /* ============================================================
       API & STORAGE
    ============================================================ */
    function getState(pid) {
      return profileBalances[pid] || { totalGrain: 0, totalExp: 0 };
    }

    function _logsCacheKey(pid) {
      return `kho_thoc_v3_logs_${pid}`;
    }

    function _applyBalancesFromProfiles() {
      for (let i = 0; i < profiles.length; i++) {
        const p = profiles[i];
        profileBalances[p.id] = {
          totalGrain: Number(p.total_grain ?? p.balance) || 0,
          totalExp:   Number(p.total_exp) || 0
        };
      }
    }

    function _bumpBalance(pid, grainDelta, expDelta) {
      const b = profileBalances[pid] || { totalGrain: 0, totalExp: 0 };
      b.totalGrain += grainDelta;
      b.totalExp   += expDelta;
      profileBalances[pid] = b;
      const p = profiles.find(x => x.id === pid);
      if (p) {
        p.total_grain = b.totalGrain;
        p.total_exp   = b.totalExp;
      }
    }

    function _normalizeLogRow(row) {
      const pid = row.id || row.profileId;
      return {
        profileId: pid,
        date:  row.date  || '',
        grain: Number(row.grain) || 0,
        exp:   Number(row.exp)   || 0,
        note:  row.note  || '',
        tasks: row.tasks || '',
        bonus: row.bonus || false
      };
    }

    /** Gộp logs vào sheetsLogs[pid] — không cộng lại số dư (dùng cache Profiles) */
    function _mergeLogsForProfile(pid, rawLogs, replace) {
      if (replace || !sheetsLogs[pid]) sheetsLogs[pid] = [];
      const existing = new Set(sheetsLogs[pid].map(l => l.date));
      for (let i = 0; i < rawLogs.length; i++) {
        const entry = _normalizeLogRow(rawLogs[i]);
        if (!existing.has(entry.date)) {
          sheetsLogs[pid].push(entry);
          existing.add(entry.date);
        }
      }
      sheetsLogs[pid].sort((a, b) => b.date.localeCompare(a.date));
    }

    function _readProfilesCache() {
      try {
        const raw = localStorage.getItem(CACHE_PROFILES_KEY);
        if (!raw) return null;
        const data = JSON.parse(raw);
        return Array.isArray(data) ? data : null;
      } catch {
        return null;
      }
    }

    function _writeProfilesCache() {
      try {
        localStorage.setItem(CACHE_PROFILES_KEY, JSON.stringify(profiles));
      } catch { /* quota */ }
    }

    function _readLogsCache(pid) {
      try {
        const raw = localStorage.getItem(_logsCacheKey(pid));
        if (!raw) return null;
        return JSON.parse(raw);
      } catch {
        return null;
      }
    }

    function _writeLogsCache(pid) {
      try {
        localStorage.setItem(_logsCacheKey(pid), JSON.stringify({
          savedAt: Date.now(),
          logs: sheetsLogs[pid] || [],
          meta: logsMeta[pid] || { total: 0, hasMore: false, loaded: 0 }
        }));
      } catch { /* quota */ }
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

    function _selectProfileAfterLoad(prevPid) {
      const pid = (prevPid && profiles.some(p => p.id === prevPid))
        ? prevPid
        : (profiles[0] && profiles[0].id);
      if (pid) selectProfile(pid, true, false);
    }

    async function saveData(payload) {
      try {
        const res    = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': API_USE_PLAIN_TEXT ? 'text/plain' : 'application/json' },
          body: JSON.stringify(payload)
        });
        const result = await res.json();
        if (result.result !== 'success') showToast('⚠️ Ghi dữ liệu thất bại: ' + (result.message || ''));
        return result;
      } catch {
        showToast('⚠️ Không kết nối được Server!');
        return null;
      }
    }

    async function fetchLogsPage(pid, offset = 0, replace = false) {
      const url = `${API_URL}?type=logs&profileId=${encodeURIComponent(pid)}&limit=${HISTORY_PAGE}&offset=${offset}`;
      const res  = await fetch(url);
      const data = await res.json();
      const rawLogs = Array.isArray(data.logs) ? data.logs : [];

      _mergeLogsForProfile(pid, rawLogs, replace);
      logsMeta[pid] = {
        total:   data.total   ?? rawLogs.length,
        hasMore: !!data.hasMore,
        loaded:  (sheetsLogs[pid] || []).length
      };
      _writeLogsCache(pid);
      _invalidateSortCache();
      return rawLogs.length;
    }

    async function loadLogsForProfile(pid, replace = false) {
      if (!pid || _logsLoading) return;
      _logsLoading = true;
      try {
        await fetchLogsPage(pid, 0, replace);
        if (currentProfile && currentProfile.id === pid) {
          renderHistory();
        }
      } catch {
        if (currentProfile && currentProfile.id === pid) {
          const list = document.getElementById('historyList');
          if (list && !(sheetsLogs[pid] || []).length) {
            list.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:1rem;">Không tải được lịch sử.</p>';
          }
        }
      } finally {
        _logsLoading = false;
      }
    }

    async function loadData(hadCache = false) {
      if (!hadCache) _setSyncStatus('Đang tải dữ liệu bé…', true);

      const prevPid = currentProfile?.id || localStorage.getItem(CACHE_LAST_PID_KEY);

      try {
        const profRes  = await fetch(`${API_URL}?type=profiles`);
        const profData = await profRes.json();
        const newProfiles = Array.isArray(profData.profiles) ? profData.profiles : [];

        profiles = newProfiles;
        _applyBalancesFromProfiles();
        _writeProfilesCache();
        renderProfiles();

        const activePid = (prevPid && profiles.some(p => p.id === prevPid))
          ? prevPid
          : profiles[0]?.id;

        if (activePid) {
          localStorage.setItem(CACHE_LAST_PID_KEY, activePid);
          currentProfile = profiles.find(p => p.id === activePid) || null;
          document.querySelectorAll('.profile-card').forEach(el => {
            el.classList.toggle('active', el.dataset.pid === activePid);
          });
          renderRewards();
        }

        if (!hadCache) _setSyncStatus('Đang tải nhật ký…', true);

        if (activePid) {
          await loadLogsForProfile(activePid, true);
        }

        if (hadCache) {
          _setSyncStatus('Đã đồng bộ mới nhất');
          setTimeout(() => _setSyncStatus(''), 2500);
        } else {
          _setSyncStatus('');
        }
      } catch {
        if (!hadCache) {
          showToast('⚠️ Không tải được dữ liệu từ Server!');
          const grid = document.getElementById('profileGrid');
          if (grid && !profiles.length) {
            grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:var(--text-muted);padding:2rem;">Không kết nối được server. Thử tải lại trang.</p>';
          }
        } else {
          _setSyncStatus('Không đồng bộ được — đang dùng dữ liệu đã lưu');
        }
      }
    }

    /* ============================================================
       RENDER
    ============================================================ */
    function renderTasks() {
      if (_tasksRendered) return;
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
      _tasksRendered = true;
    }

    let _elCheckedCount, _elTodayGrain, _elTodayExp;
    function _initCounterRefs() {
      _elCheckedCount = document.getElementById('checkedCount');
      _elTodayGrain   = document.getElementById('todayGrain');
      _elTodayExp     = document.getElementById('todayExp');
    }

    function updateCounterAndTotals() {
      let count = 0, grain = 0, exp = 0;
      for (let i = 0; i < TASKS.length; i++) {
        const cb = document.getElementById(`taskCB_${TASKS[i].id}`);
        if (cb && cb.checked) { count++; grain += TASKS[i].grain; exp += TASKS[i].exp; }
      }
      if (isBonusActive) grain = Math.floor(grain * 1.2);
      if (_elCheckedCount) _elCheckedCount.textContent = `${count} / ${TASKS.length}`;
      if (_elTodayGrain)   _elTodayGrain.textContent   = grain;
      if (_elTodayExp)     _elTodayExp.textContent     = exp;
    }

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
        const rank     = RANKS.findLast(r => state.totalExp >= r.min) || RANKS[0];
        const isMax    = rank.max === Infinity;
        const lvlExp   = state.totalExp - rank.min;
        const lvlRange = isMax ? 1 : rank.max - rank.min;
        const pct      = isMax ? 100 : Math.min(100, Math.round((lvlExp / lvlRange) * 100));
        const expText  = isMax
          ? `${state.totalExp.toLocaleString('vi-VN')} ⭐ MAX`
          : `${state.totalExp.toLocaleString('vi-VN')} / ${rank.max.toLocaleString('vi-VN')}`;

        parts.push(`
      <div class="profile-card${isActive ? ' active' : ''}" data-pid="${p.id}" onclick="selectProfile('${p.id}',true)">
        <button type="button" class="profile-delete-btn" onclick="event.stopPropagation();deleteProfile('${p.id}')" aria-label="Xóa bé ${p.name}" title="Xóa bé">🗑️</button>
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
        const rw = REWARDS[i];
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

    let _sortedLogsCache = null;
    let _sortedLogsPid   = null;

    function renderHistory() {
      const list = document.getElementById('historyList');
      if (!list) return;
      if (!currentProfile) {
        list.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:1rem;">Vui lòng chọn một bé để hiển thị lịch sử.</p>';
        return;
      }

      const logs = sheetsLogs[currentProfile.id] || [];
      if (_logsLoading && !logs.length) {
        list.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:1rem;">Đang tải lịch sử…</p>';
        return;
      }

      if (_sortedLogsPid !== currentProfile.id || !_sortedLogsCache) {
        _sortedLogsCache = [...logs];
        _sortedLogsPid   = currentProfile.id;
      }

      if (!_sortedLogsCache.length) {
        list.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:1rem;">Chưa có nhật ký nào.</p>';
        return;
      }

      const visible = _historyShowAll
        ? _sortedLogsCache
        : _sortedLogsCache.slice(0, HISTORY_PAGE);

      const meta = logsMeta[currentProfile.id];
      const serverHasMore = meta && meta.hasMore;
      const localHidden   = _sortedLogsCache.length - visible.length;
      const showMoreBtn   = localHidden > 0 || serverHasMore;

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
              <button class="btn-delete" onclick="deleteHistory('${lg.date}')" aria-label="Xóa">🗑️</button>
            </div>
        </div>`);
      }

      if (showMoreBtn) {
        const label = localHidden > 0
          ? `Xem thêm ${localHidden} mục…`
          : 'Tải thêm lịch sử cũ…';
        parts.push(`<button type="button" class="history-more" onclick="loadMoreHistory()">${label}</button>`);
      }
      list.innerHTML = parts.join('');
    }

    async function loadMoreHistory() {
      if (!currentProfile) return;
      const pid  = currentProfile.id;
      const logs = sheetsLogs[pid] || [];

      if (!_historyShowAll && logs.length > HISTORY_PAGE) {
        _historyShowAll = true;
        renderHistory();
        return;
      }

      const meta = logsMeta[pid];
      if (meta && meta.hasMore) {
        const btn = document.querySelector('.history-more');
        if (btn) btn.textContent = 'Đang tải…';
        await fetchLogsPage(pid, logs.length, false);
        _historyShowAll = true;
        renderHistory();
      }
    }

    function _invalidateSortCache() { _sortedLogsCache = null; }

    /* ============================================================
       USER ACTIONS
    ============================================================ */
    function selectProfile(pid, light = false, loadLogs = true) {
      currentProfile = profiles.find(p => p.id === pid);
      localStorage.setItem(CACHE_LAST_PID_KEY, pid);
      _invalidateSortCache();
      _historyShowAll = false;

      if (light) {
        document.querySelectorAll('.profile-card').forEach(el => {
          el.classList.toggle('active', el.dataset.pid === pid);
        });
      } else {
        renderProfiles();
      }

      renderRewards();

      const cached = _readLogsCache(pid);
      if (cached && Array.isArray(cached.logs)) {
        _mergeLogsForProfile(pid, cached.logs, true);
        if (cached.meta) logsMeta[pid] = cached.meta;
      }

      renderHistory();

      if (loadLogs) {
        loadLogsForProfile(pid, true);
      }
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

      const pid        = currentProfile.id;
      const dateString = _nowString();
      const noteText   = document.getElementById('logNote')?.value.trim() || '';
      const logEntry   = { profileId: pid, date: dateString, grain, exp, note: noteText, tasks: tasksDone.join(','), bonus: isBonusActive };

      if (!sheetsLogs[pid]) sheetsLogs[pid] = [];
      sheetsLogs[pid].unshift(logEntry);
      _invalidateSortCache();

      document.getElementById('logNote').value = '';
      TASKS.forEach(t => {
        const cb   = document.getElementById(`taskCB_${t.id}`);   if (cb)   cb.checked = false;
        const card = document.getElementById(`taskCard_${t.id}`); if (card) card.classList.remove('checked');
      });
      if (isBonusActive) toggleBonus();

      _bumpBalance(pid, grain, exp);
      renderProfiles(); renderRewards(); renderHistory(); updateCounterAndTotals();
      _writeProfilesCache();
      _writeLogsCache(pid);
      showToast(`🌾 Đã ghi +${grain} Gạo cho ${currentProfile.name}!`);

      saveData({ type:'log', profileId: pid, profileName: currentProfile.name, date: dateString, grain, exp, tasks: tasksDone.join(','), bonus: isBonusActive, note: noteText });
    }

    function _getRedeemSelection() {
      if (!currentProfile) { showToast('Vui lòng chọn bé trước!'); return null; }
      const selected = document.querySelectorAll('.reward-small-card.selected');
      if (!selected.length) { showToast('Vui lòng chọn ít nhất một món quà!'); return null; }

      let totalCost = 0;
      const rewardNames = [];
      const rewardIds = [];
      selected.forEach(card => {
        totalCost += Number(card.dataset.cost || 0);
        rewardNames.push(card.dataset.name);
        rewardIds.push(card.dataset.rewardId);
      });

      const { totalGrain } = getState(currentProfile.id);
      if (totalGrain < totalCost) { showToast('Không đủ Gạo để đổi quà!'); return null; }

      return { rewardIds, rewardNames, totalCost };
    }

    function openRedeemModal() {
      const pending = _getRedeemSelection();
      if (!pending) return;

      const summary = document.getElementById('redeemSummary');
      summary.innerHTML = `
        <strong>${currentProfile.name}</strong><br/>
        🎁 ${pending.rewardNames.join(', ')}<br/>
        🌾 Trừ: ${pending.totalCost.toLocaleString()} Gạo`;

      document.getElementById('redeemPasscode').value = '';
      document.getElementById('redeemModalOverlay').classList.add('open');
      document.getElementById('redeemPasscode').focus();
      window._pendingRedeem = pending;
    }

    function closeRedeemModal() {
      document.getElementById('redeemModalOverlay').classList.remove('open');
      window._pendingRedeem = null;
    }

    async function confirmRedeem() {
      const pending = window._pendingRedeem;
      if (!pending || !currentProfile) return;

      const passcode = document.getElementById('redeemPasscode').value.trim();
      if (!passcode) { showToast('Vui lòng nhập mã xác nhận!'); return; }

      const btn = document.getElementById('redeemConfirmBtn');
      btn.disabled = true;
      btn.textContent = 'Đang xử lý…';

      const pid = currentProfile.id;
      try {
        const res = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': API_USE_PLAIN_TEXT ? 'text/plain' : 'application/json' },
          body: JSON.stringify({
            type: 'redeem',
            passcode,
            profileId: pid,
            profileName: currentProfile.name,
            rewardIds: pending.rewardIds,
          }),
        });
        const result = await res.json();

        if (!res.ok || result.result !== 'success') {
          showToast('⚠️ ' + (result.message || 'Đổi quà thất bại'));
          return;
        }

        const dateString = result.date || _nowString();
        const logEntry = {
          profileId: pid,
          date: dateString,
          grain: result.grain ?? -pending.totalCost,
          exp: 0,
          tasks: 'REDEEM',
          bonus: false,
          note: result.note || ('Đổi quà: ' + pending.rewardNames.join(', ')),
        };

        if (!sheetsLogs[pid]) sheetsLogs[pid] = [];
        sheetsLogs[pid].unshift(logEntry);
        _invalidateSortCache();

        _bumpBalance(pid, -pending.totalCost, 0);
        renderProfiles();
        renderRewards();
        renderHistory();
        _writeProfilesCache();
        _writeLogsCache(pid);
        closeRedeemModal();
        showToast(`🎁 Đổi quà thành công! -${pending.totalCost.toLocaleString()} 🌾`);
      } catch {
        showToast('⚠️ Không kết nối được Server!');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Xác nhận';
      }
    }

    async function deleteHistory(dateStr) {
      if (!confirm(`Xóa nhật ký ngày ${dateStr}?\nThao tác này sẽ trừ lại số Gạo và EXP!`)) return;
      const pid = currentProfile.id;
      const removed = (sheetsLogs[pid] || []).find(l => l.date === dateStr);
      const result = await saveData({ type:'delete_log', profileId: pid, date: dateStr });
      if (result && result.result === 'success') {
        sheetsLogs[pid] = sheetsLogs[pid].filter(lg => lg.date !== dateStr);
        _invalidateSortCache();
        if (removed) _bumpBalance(pid, -removed.grain, -removed.exp);
        renderProfiles(); renderRewards(); renderHistory();
        _writeProfilesCache();
        _writeLogsCache(pid);
        showToast(`Đã xóa nhật ký ngày ${dateStr}`);
      } else {
        showToast('⚠️ Xóa thất bại, thử lại!');
      }
    }

    function openModal()  { document.getElementById('modalOverlay').classList.add('open'); }
    function closeModal() { document.getElementById('modalOverlay').classList.remove('open'); }

    async function deleteProfile(pid) {
      const p = profiles.find(x => x.id === pid);
      if (!p) return;

      const state = getState(pid);
      const msg = `Xóa hồ sơ bé "${p.name}"?\n\nToàn bộ nhật ký (${state.totalGrain.toLocaleString('vi-VN')} 🌾, ${state.totalExp.toLocaleString('vi-VN')} ⭐) và mã đổi quà sẽ bị xóa vĩnh viễn.`;
      if (!confirm(msg)) return;

      const result = await saveData({ type: 'delete_profile', profileId: pid });
      if (!result || result.result !== 'success') return;

      const wasCurrent = currentProfile && currentProfile.id === pid;

      profiles = profiles.filter(x => x.id !== pid);
      delete profileBalances[pid];
      delete sheetsLogs[pid];
      delete logsMeta[pid];
      try { localStorage.removeItem(_logsCacheKey(pid)); } catch { /* quota */ }

      _writeProfilesCache();

      if (wasCurrent) {
        const nextPid = profiles[0]?.id;
        if (nextPid) {
          selectProfile(nextPid, false, true);
        } else {
          currentProfile = null;
          localStorage.removeItem(CACHE_LAST_PID_KEY);
          renderProfiles();
          renderRewards();
          renderHistory();
        }
      } else {
        renderProfiles();
      }

      showToast(`Đã xóa hồ sơ bé ${p.name}`);
    }

    async function confirmAddProfile() {
      const name   = document.getElementById('pName')?.value.trim();
      const avatar = document.getElementById('pAvatar')?.value.trim() || '👶';
      if (!name) { alert('Vui lòng nhập tên của bé!'); return; }

      const newProfile = { id:'p_' + Date.now(), name, avatar, total_grain:0, total_exp:0 };
      const btn = document.querySelector('#modalOverlay .btn-main');
      if (btn) { btn.disabled = true; btn.textContent = 'Đang tạo…'; }

      const result = await saveData({ type:'profile', ...newProfile });

      if (btn) { btn.disabled = false; btn.textContent = 'Tạo Mới'; }
      if (!result || result.result !== 'success') return;

      profiles.push(newProfile);
      profileBalances[newProfile.id] = { totalGrain: 0, totalExp: 0 };
      sheetsLogs[newProfile.id] = [];
      document.getElementById('pName').value = '';
      closeModal();
      renderProfiles();
      _writeProfilesCache();
      selectProfile(newProfile.id, true, false);

      if (result.passcode) {
        showNewProfilePasscode(name, result.passcode);
      } else {
        showToast(`👶 Đăng ký thành công cho bé ${name}!`);
      }
    }

    function showNewProfilePasscode(name, passcode) {
      document.getElementById('newProfilePasscodeName').textContent = name;
      document.getElementById('newProfilePasscodeValue').textContent = passcode;
      document.getElementById('passcodeModalOverlay').classList.add('open');
    }

    function closePasscodeModal() {
      document.getElementById('passcodeModalOverlay').classList.remove('open');
    }

    function _nowString() {
      const n = new Date();
      return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')} ${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}`;
    }

    function formatVNDate(dateStr) {
      if (!dateStr) return '';
      const d = new Date(dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T') + '+00:00');
      const gmt7 = new Date(d.getTime() + 7 * 60 * 60 * 1000);
      const dd   = String(gmt7.getUTCDate()).padStart(2, '0');
      const mm   = String(gmt7.getUTCMonth() + 1).padStart(2, '0');
      const yyyy = gmt7.getUTCFullYear();
      const hh   = String(gmt7.getUTCHours()).padStart(2, '0');
      const min  = String(gmt7.getUTCMinutes()).padStart(2, '0');
      return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
    }

    let _toastTimer;
    function showToast(msg) {
      const t = document.getElementById('toast');
      t.textContent = msg;
      t.classList.add('show');
      clearTimeout(_toastTimer);
      _toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
    }

    function saveState() {}
    function saveLog()   {}
    function delLog()    {}
    function getLogs(pid) { return sheetsLogs[pid] || []; }
    function reloadLogs() { return loadData(); }

    /* ============================================================
       INIT — profiles cache trước, tasks defer, sync nền
    ============================================================ */
    function _bootstrapFromCache() {
      const profCache = _readProfilesCache();
      if (!profCache || !profCache.length) return false;

      profiles = profCache;
      _applyBalancesFromProfiles();
      renderProfiles();

      const lastPid = localStorage.getItem(CACHE_LAST_PID_KEY);
      const pid = (lastPid && profiles.some(p => p.id === lastPid))
        ? lastPid
        : profiles[0].id;

      const logCache = _readLogsCache(pid);
      if (logCache && Array.isArray(logCache.logs)) {
        _mergeLogsForProfile(pid, logCache.logs, true);
        if (logCache.meta) logsMeta[pid] = logCache.meta;
      }

      selectProfile(pid, true, false);
      return true;
    }

    window.addEventListener('DOMContentLoaded', () => {
      _initCounterRefs();

      const hadCache = _bootstrapFromCache();
      if (hadCache) {
        _setSyncStatus('Đang đồng bộ nền…', true);
      } else {
        _showProfileSkeleton();
      }

      requestAnimationFrame(() => renderTasks());

      loadData(hadCache);
    });
