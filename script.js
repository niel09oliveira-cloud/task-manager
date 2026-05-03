let tasks = JSON.parse(localStorage.getItem('todopro-tasks') || '[]');
let currentFilter    = 'all';
let currentCategory  = '';
let selectedCategory = '';
let dragSrcId        = null;

// Track which tasks have their subtask section expanded
const expandedTasks = new Set();

const input        = document.getElementById('task-input');
const addBtn       = document.getElementById('add-btn');
const taskList     = document.getElementById('task-list');
const emptyState   = document.getElementById('empty-state');
const emptyMsg     = document.getElementById('empty-msg');
const pendingCnt   = document.getElementById('pending-count');
const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');
const filterBtns   = document.querySelectorAll('.filter-btn');
const clearDoneBtn = document.getElementById('clear-done-btn');
const clockEl      = document.getElementById('clock');
const dateEl       = document.getElementById('date');
const motivationEl = document.getElementById('motivation');
const chartEl      = document.getElementById('chart');
const chartTotal   = document.getElementById('chart-total');
const catPills     = document.querySelectorAll('.cat-pill');
const catFilters   = document.getElementById('cat-filters');
const catFilterBtns = document.querySelectorAll('.cat-filter-btn');
const dueInput     = document.getElementById('due-input');
const clearDueBtn  = document.getElementById('clear-due-btn');

const catLabels = { trabalho: '💼 Trabalho', pessoal: '🏠 Pessoal', estudo: '📚 Estudo' };

const phrases = [
  "O sucesso é a soma de pequenos esforços repetidos dia após dia. 💪",
  "Foco no processo. Os resultados vêm naturalmente. 🎯",
  "Uma tarefa de cada vez. Você chega lá. 🚀",
  "Disciplina é escolher o que você quer mais sobre o que quer agora. 🔥",
  "Cada tarefa concluída é um passo mais perto do seu objetivo. ✅",
  "Comece. O resto vem no caminho. ⚡",
  "Progresso, não perfeição. 📈",
  "Tudo que você faz hoje, o seu eu do futuro agradece. 🙏",
  "Organização é o primeiro passo para a conquista. 🏆",
  "Você é mais capaz do que imagina. Confie no processo. 💡"
];

function updateMotivation() {
  const hour = new Date().getHours();
  let index;
  if (hour < 12)      index = Math.floor(Math.random() * 3);
  else if (hour < 18) index = 3 + Math.floor(Math.random() * 3);
  else                index = 6 + Math.floor(Math.random() * 4);
  motivationEl.textContent = phrases[index];
}

function updateClock() {
  const now = new Date();
  const h   = String(now.getHours()).padStart(2, '0');
  const m   = String(now.getMinutes()).padStart(2, '0');
  clockEl.textContent = `${h}:${m}`;

  const dias  = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
  const meses = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  dateEl.textContent = `${dias[now.getDay()]}, ${now.getDate()} de ${meses[now.getMonth()]}`;
}

function save() {
  localStorage.setItem('todopro-tasks', JSON.stringify(tasks));
}

// ── Due date helpers ──

function formatDueDate(dueDate) {
  const [Y, M, D] = dueDate.split('-').map(Number);
  const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return `${D} ${meses[M - 1]}`;
}

function getDueStatus(dueDate, isDone) {
  if (!dueDate) return null;

  if (isDone) return { label: `📅 ${formatDueDate(dueDate)}`, cls: 'done' };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [Y, M, D] = dueDate.split('-').map(Number);
  const due  = new Date(Y, M - 1, D);
  const diff = Math.round((due - today) / 86400000);

  if (diff < 0)   return { label: `⚠ Atrasada ${Math.abs(diff)}D`, cls: 'overdue' };
  if (diff === 0) return { label: '📅 Hoje',                        cls: 'today'   };
  if (diff <= 2)  return { label: `📅 Em ${diff}D`,                 cls: 'soon'    };
  return              { label: `📅 ${formatDueDate(dueDate)}`,      cls: 'normal'  };
}

// ── Subtask helpers ──

function addSubtask(taskId, text) {
  const task = tasks.find(t => t.id === taskId);
  if (!task || !text.trim()) return;
  if (!task.subtasks) task.subtasks = [];
  task.subtasks.push({ id: Date.now(), text: text.trim(), done: false });
  expandedTasks.add(taskId);
  save();
  render();
}

function toggleSubtask(taskId, subId) {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;
  const sub = (task.subtasks || []).find(s => s.id === subId);
  if (sub) sub.done = !sub.done;
  save();
  render();
}

function deleteSubtask(taskId, subId) {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;
  task.subtasks = (task.subtasks || []).filter(s => s.id !== subId);
  save();
  render();
}

// ── Task CRUD ──

function addTask() {
  const text = input.value.trim();

  if (!text) {
    input.focus();
    input.style.borderColor = 'var(--danger)';
    setTimeout(() => input.style.borderColor = '', 800);
    return;
  }

  const task = {
    id: Date.now(),
    text,
    done: false,
    category: selectedCategory,
    dueDate: dueInput.value,
    subtasks: [],
    createdAt: new Date().toISOString(),
    completedAt: null
  };

  tasks.unshift(task);
  input.value    = '';
  dueInput.value = '';
  save();
  render();
  input.focus();
}

function toggleTask(id) {
  const task = tasks.find(t => t.id === id);
  if (task) {
    task.done = !task.done;
    task.completedAt = task.done ? new Date().toISOString() : null;
  }
  save();
  render();
}

function deleteTask(id, liEl) {
  liEl.classList.add('removing');
  setTimeout(() => {
    tasks = tasks.filter(t => t.id !== id);
    expandedTasks.delete(id);
    save();
    render();
  }, 260);
}

function editTask(id, textEl) {
  const task = tasks.find(t => t.id === id);
  if (!task || task.done) return;

  const editInput = document.createElement('input');
  editInput.type      = 'text';
  editInput.className = 'edit-input';
  editInput.value     = task.text;
  editInput.maxLength = 120;

  textEl.replaceWith(editInput);
  editInput.focus();
  editInput.select();

  let committed = false;

  function commit() {
    if (committed) return;
    committed = true;
    const newText = editInput.value.trim();
    if (newText) task.text = newText;
    save();
    render();
  }

  editInput.addEventListener('blur', commit);
  editInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter')  { e.preventDefault(); commit(); }
    if (e.key === 'Escape') { committed = true; render(); }
  });
}

function clearDone() {
  const hasDone = tasks.some(t => t.done);
  if (!hasDone) return;
  if (!confirm('Remover todas as tarefas concluídas?')) return;
  tasks.filter(t => t.done).forEach(t => expandedTasks.delete(t.id));
  tasks = tasks.filter(t => !t.done);
  save();
  render();
}

function filteredTasks() {
  let list = tasks;
  if (currentFilter === 'pending') list = list.filter(t => !t.done);
  if (currentFilter === 'done')    list = list.filter(t =>  t.done);
  if (currentCategory)             list = list.filter(t => t.category === currentCategory);
  return list;
}

function updateCatFiltersVisibility() {
  const hasCats = tasks.some(t => t.category);
  catFilters.classList.toggle('visible', hasCats);
}

function renderChart() {
  const dias  = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  const hoje  = new Date();

  const semana = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(hoje);
    d.setDate(hoje.getDate() - i);
    semana.push({
      label: dias[d.getDay()],
      date:  d.toDateString(),
      count: 0,
      isToday: i === 0
    });
  }

  tasks.forEach(task => {
    if (!task.done || !task.completedAt) return;
    const doneDate = new Date(task.completedAt).toDateString();
    const dia = semana.find(d => d.date === doneDate);
    if (dia) dia.count++;
  });

  const maxCount = Math.max(...semana.map(d => d.count), 1);
  const totalSemana = semana.reduce((acc, d) => acc + d.count, 0);

  chartTotal.textContent = `${totalSemana} concluída${totalSemana !== 1 ? 's' : ''} esta semana`;

  chartEl.innerHTML = '';

  semana.forEach(dia => {
    const heightPct = (dia.count / maxCount) * 100;
    const col = document.createElement('div');
    col.className = 'chart-col' + (dia.isToday ? ' is-today' : '');

    col.innerHTML = `
      <div class="chart-bar-wrap">
        <div class="chart-bar ${dia.count > 0 ? (dia.isToday ? 'today' : 'has-data') : ''}"
             style="height: ${heightPct}%">
        </div>
      </div>
      <span class="chart-count">${dia.count > 0 ? dia.count : ''}</span>
      <span class="chart-day">${dia.label}</span>
    `;

    chartEl.appendChild(col);
  });
}

function render() {
  taskList.innerHTML = '';
  const list = filteredTasks();

  const isEmpty = list.length === 0;
  emptyState.classList.toggle('visible', isEmpty);

  if (isEmpty) {
    if (currentFilter === 'done')         emptyMsg.innerHTML = 'Nenhuma tarefa concluída ainda.<br>Bora trabalhar! 💪';
    else if (currentFilter === 'pending') emptyMsg.innerHTML = 'Tudo feito! Você arrasou! 🎉';
    else                                  emptyMsg.innerHTML = 'Nenhuma tarefa aqui.<br>Adicione uma acima! 🚀';
  }

  list.forEach(task => {
    // Ensure legacy tasks have needed fields
    if (!task.subtasks)  task.subtasks = [];
    if (!task.dueDate)   task.dueDate  = '';

    const li = document.createElement('li');
    li.className   = 'task-item' + (task.done ? ' completed' : '');
    li.dataset.id  = task.id;
    li.draggable   = true;

    const isExpanded  = expandedTasks.has(task.id);
    const subs        = task.subtasks;
    const subTotal    = subs.length;
    const subDone     = subs.filter(s => s.done).length;
    const dueStatus   = getDueStatus(task.dueDate, task.done);

    // Build badge strings
    const catBadge = task.category
      ? `<span class="cat-badge cat-${task.category}">${catLabels[task.category]}</span>`
      : '';

    const dueBadge = dueStatus
      ? `<span class="due-badge due-${dueStatus.cls}">${dueStatus.label}</span>`
      : '';

    const subtaskToggleLabel = subTotal === 0
      ? '+ subtarefa'
      : `${isExpanded ? '▾' : '▸'} ${subDone}/${subTotal}`;

    const subtaskToggle = `<button class="subtask-toggle${isExpanded ? ' open' : ''}" title="Subtarefas">${subtaskToggleLabel}</button>`;

    // Build subtask section HTML
    const subtaskItemsHtml = subs.map(sub => `
      <li class="subtask-item${sub.done ? ' done' : ''}" data-sub-id="${sub.id}">
        <div class="subtask-check">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="1.5,5 4,7.5 8.5,2"/>
          </svg>
        </div>
        <span class="subtask-text">${escapeHtml(sub.text)}</span>
        <button class="subtask-del" title="Remover subtarefa">✕</button>
      </li>
    `).join('');

    const subtaskSectionHtml = isExpanded ? `
      <div class="subtask-section">
        <ul class="subtask-list">${subtaskItemsHtml}</ul>
        <div class="subtask-add-row">
          <input class="subtask-input" type="text" placeholder="Nova subtarefa..." maxlength="80"/>
          <button class="subtask-add-btn" title="Adicionar">+</button>
        </div>
      </div>
    ` : '';

    li.innerHTML = `
      <div class="task-main">
        <div class="drag-handle" title="Arrastar para reordenar">
          <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
            <circle cx="2" cy="2"  r="1.5"/>
            <circle cx="8" cy="2"  r="1.5"/>
            <circle cx="2" cy="7"  r="1.5"/>
            <circle cx="8" cy="7"  r="1.5"/>
            <circle cx="2" cy="12" r="1.5"/>
            <circle cx="8" cy="12" r="1.5"/>
          </svg>
        </div>
        <div class="task-check">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="2,6 5,9 10,3"/>
          </svg>
        </div>
        <div class="task-body">
          <span class="task-text">${escapeHtml(task.text)}</span>
          <div class="task-badges">
            ${catBadge}${dueBadge}${subtaskToggle}
          </div>
        </div>
        <button class="delete-btn" title="Deletar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6"  y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      ${subtaskSectionHtml}
    `;

    // ── Main task events ──
    const textEl = li.querySelector('.task-text');

    li.querySelector('.task-check').addEventListener('click', (e) => {
      e.stopPropagation();
      toggleTask(task.id);
    });

    textEl.addEventListener('click', () => toggleTask(task.id));

    textEl.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      if (!task.done) editTask(task.id, textEl);
    });

    li.querySelector('.delete-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteTask(task.id, li);
    });

    // ── Subtask toggle ──
    li.querySelector('.subtask-toggle').addEventListener('click', (e) => {
      e.stopPropagation();
      if (expandedTasks.has(task.id)) expandedTasks.delete(task.id);
      else expandedTasks.add(task.id);
      render();
    });

    // ── Subtask section events (only when expanded) ──
    if (isExpanded) {
      li.querySelectorAll('.subtask-item').forEach((subLi) => {
        const subId = Number(subLi.dataset.subId);
        subLi.querySelector('.subtask-check').addEventListener('click', (e) => {
          e.stopPropagation();
          toggleSubtask(task.id, subId);
        });
        subLi.querySelector('.subtask-del').addEventListener('click', (e) => {
          e.stopPropagation();
          deleteSubtask(task.id, subId);
        });
      });

      const subInput  = li.querySelector('.subtask-input');
      const subAddBtn = li.querySelector('.subtask-add-btn');

      subAddBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        addSubtask(task.id, subInput.value);
      });

      subInput.addEventListener('click',  (e) => e.stopPropagation());
      subInput.addEventListener('keydown', (e) => {
        e.stopPropagation();
        if (e.key === 'Enter') addSubtask(task.id, subInput.value);
      });
    }

    // ── Drag & drop ──
    li.addEventListener('dragstart', (e) => {
      dragSrcId = task.id;
      e.dataTransfer.effectAllowed = 'move';
      // Small delay so the drag ghost looks right
      setTimeout(() => li.classList.add('dragging'), 0);
    });

    li.addEventListener('dragend', () => {
      li.classList.remove('dragging');
      document.querySelectorAll('.task-item').forEach(el => el.classList.remove('drag-over'));
    });

    li.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      // Clear all other highlights, set only this one
      document.querySelectorAll('.task-item').forEach(el => el.classList.remove('drag-over'));
      if (dragSrcId !== task.id) li.classList.add('drag-over');
    });

    li.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      li.classList.remove('drag-over');
      if (dragSrcId === task.id) return;

      const srcIdx = tasks.findIndex(t => t.id === dragSrcId);
      const dstIdx = tasks.findIndex(t => t.id === task.id);
      if (srcIdx === -1 || dstIdx === -1) return;

      const [removed] = tasks.splice(srcIdx, 1);
      tasks.splice(dstIdx, 0, removed);
      save();
      render();
    });

    taskList.appendChild(li);
  });

  const total   = tasks.length;
  const done    = tasks.filter(t => t.done).length;
  const pending = total - done;
  const pct     = total === 0 ? 0 : Math.round((done / total) * 100);

  pendingCnt.textContent   = pending;
  progressFill.style.width = pct + '%';
  progressText.textContent = pct + '%';

  updateCatFiltersVisibility();
  renderChart();
}

function escapeHtml(str) {
  return str
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;');
}

// ── Category selection (for new task) ──
catPills.forEach(pill => {
  pill.addEventListener('click', () => {
    const cat = pill.dataset.cat;
    if (selectedCategory === cat) {
      selectedCategory = '';
      catPills.forEach(p => p.classList.remove('active'));
    } else {
      selectedCategory = cat;
      catPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
    }
  });
});

// ── Category filter ──
catFilterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    catFilterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentCategory = btn.dataset.cat;
    render();
  });
});

// ── Clear due date ──
clearDueBtn.addEventListener('click', () => {
  dueInput.value = '';
});

// ── Status filters & add ──
addBtn.addEventListener('click', addTask);

input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addTask();
});

filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    if (btn.id === 'clear-done-btn') return;
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    render();
  });
});

clearDoneBtn.addEventListener('click', clearDone);

// ── Init ──
updateClock();
updateMotivation();
setInterval(updateClock, 1000);
render();