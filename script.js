let tasks = JSON.parse(localStorage.getItem('todopro-tasks') || '[]');
let currentFilter   = 'all';
let currentCategory = '';
let selectedCategory = '';

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
    createdAt: new Date().toISOString(),
    completedAt: null
  };

  tasks.unshift(task);
  input.value = '';
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
  const dias   = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  const hoje   = new Date();

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
    const li = document.createElement('li');
    li.className = 'task-item' + (task.done ? ' completed' : '');
    li.dataset.id = task.id;

    const catBadge = task.category
      ? `<span class="cat-badge cat-${task.category}">${catLabels[task.category]}</span>`
      : '';

    li.innerHTML = `
      <div class="task-check">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="2,6 5,9 10,3"/>
        </svg>
      </div>
      <div class="task-body">
        <span class="task-text">${escapeHtml(task.text)}</span>
        ${catBadge}
      </div>
      <button class="delete-btn" title="Deletar">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6"  y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    `;

    const textEl = li.querySelector('.task-text');

    li.querySelector('.task-check').addEventListener('click', (e) => {
      e.stopPropagation();
      toggleTask(task.id);
    });

    textEl.addEventListener('click', () => {
      toggleTask(task.id);
    });

    textEl.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      if (!task.done) editTask(task.id, textEl);
    });

    li.querySelector('.delete-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteTask(task.id, li);
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
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Category selection (for new task) ──
catPills.forEach(pill => {
  pill.addEventListener('click', () => {
    const cat = pill.dataset.cat;
    if (selectedCategory === cat) {
      // deselect
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

// ── Status filters ──
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

updateClock();
updateMotivation();
setInterval(updateClock, 1000);
render();