(function () {
  const TASK_MAP = {};
  TASKS.forEach(t => { TASK_MAP[t.id] = t; });

  function taskRowHtml(task, layout) {
    const extraClass = task.type === 'epic' ? ' epic' : task.type === 'highlight' ? ' highlight' : '';
    const nameClass = task.type === 'epic' ? ' epic' : '';

    if (layout === 'print') {
      return (
        '<div class="task-row' + extraClass + '">' +
          '<div class="t-icon">' + task.emoji + '</div>' +
          '<div class="t-info">' +
            '<div class="t-name">' + task.name + '</div>' +
            '<div class="t-sub">' + task.sub + '</div>' +
          '</div>' +
          '<div class="t-reward">' +
            '<span class="val-grain">+' + task.grain + ' 🌾</span>' +
            '<span class="val-exp">+' + task.exp + ' EXP</span>' +
          '</div>' +
        '</div>'
      );
    }

    return (
      '<div class="task-row' + extraClass + '">' +
        '<span class="task-icon">' + task.emoji + '</span>' +
        '<div class="task-info">' +
          '<div class="task-name' + nameClass + '">' + task.name + '</div>' +
          '<div class="task-sub">' + task.sub + '</div>' +
        '</div>' +
        '<div class="task-reward">' +
          '<span class="val-grain">+' + task.grain + ' 🌾</span>' +
          '<span class="val-exp">+' + task.exp + ' EXP</span>' +
        '</div>' +
      '</div>'
    );
  }

  function renderIndexTasksPreview(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = TASKS.map(t => taskRowHtml(t, 'index')).join('');
  }

  const PRINT_GROUPS = [
    { emoji: '🌱', label: 'Cấp độ 1: Tập sự (Khuyên dùng < 10 tuổi)', ids: ['t5', 't7', 't13', 't14', 't6'] },
    { emoji: '🌿', label: 'Cấp độ 2: Trợ thủ (Khuyên dùng 10–12 tuổi)', ids: ['t3', 't4', 't11', 't8', 't9', 't15'] },
    { emoji: '🔥', label: 'Cấp độ 3: Quản gia (Khuyên dùng 13–15 tuổi)', ids: ['t10', 't12', 't2', 't1'] },
  ];

  function renderPrintTasks(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = PRINT_GROUPS.map(group => (
      '<div class="task-group">' +
        '<div class="task-group-title"><span style="font-size: 2rem;">' + group.emoji + '</span> ' + group.label + '</div>' +
        '<div class="tasks-grid">' +
          group.ids.map(id => taskRowHtml(TASK_MAP[id], 'print')).join('') +
        '</div>' +
      '</div>'
    )).join('');
  }

  window.renderIndexTasksPreview = renderIndexTasksPreview;
  window.renderPrintTasks = renderPrintTasks;
})();
