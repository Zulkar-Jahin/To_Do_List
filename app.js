const STORAGE_KEY = 'todo.tasks.v2';

const form = document.getElementById('task-form');
const input = document.getElementById('task-input');
const priorityInput = document.getElementById('priority');
const deadlineInput = document.getElementById('deadline');
const listEl = document.getElementById('task-list');
const filters = document.querySelectorAll('.filter');
const searchInput = document.getElementById('search');
const countEl = document.getElementById('count');
const clearCompletedBtn = document.getElementById('clear-completed');

const QUOTES = [
  "Great job! Keep going! 🚀",
  "You're smashing it! 💪",
  "Another step forward! 🌟",
  "Small wins lead to big victories! 🏆",
  "Proud of you! Keep it up! 🙌"
];

let tasks = loadTasks();
renderTasks();

// --- Event listeners
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  addTask(text, priorityInput.value, deadlineInput.value);
  input.value = '';
  deadlineInput.value = '';
  priorityInput.value = 'Low';
});

listEl.addEventListener('click', (e) => {
  const item = e.target.closest('li.task-item');
  if (!item) return;
  const id = item.dataset.id;

  if (e.target.matches('input[type="checkbox"]')) {
    toggleComplete(id);
    return;
  }

  if (e.target.classList.contains('delete')) {
    deleteTask(id);
    return;
  }

  if (e.target.classList.contains('edit')) {
    editTaskPrompt(id);
    return;
  }
});

filters.forEach(btn => btn.addEventListener('click', () => {
  filters.forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderTasks();
}));

searchInput.addEventListener('input', () => {
  renderTasks();
});

clearCompletedBtn.addEventListener('click', () => {
  clearCompleted();
});

// Drag and drop
listEl.addEventListener('dragstart', e => {
  if (e.target.classList.contains('task-item')) {
    e.target.classList.add('dragging');
  }
});
listEl.addEventListener('dragend', e => {
  if (e.target.classList.contains('task-item')) {
    e.target.classList.remove('dragging');
    updateOrder();
  }
});
listEl.addEventListener('dragover', e => {
  e.preventDefault();
  const afterElement = getDragAfterElement(listEl, e.clientY);
  const dragging = document.querySelector('.dragging');
  if (!dragging) return;
  if (afterElement == null) {
    listEl.appendChild(dragging);
  } else {
    listEl.insertBefore(dragging, afterElement);
  }
});

// Reminder check every minute
setInterval(checkReminders, 60000);

// --- Functions
function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function addTask(text, priority, deadline) {
  const task = {
    id: Date.now().toString(),
    text,
    priority,
    deadline: deadline || null,
    completed: false
  };
  tasks.unshift(task);
  saveTasks();
  renderTasks();
}

function toggleComplete(id) {
  tasks = tasks.map(t => {
    if (t.id === id) {
      t.completed = !t.completed;
      if (t.completed) {
        alert(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
      }
    }
    return t;
  });
  saveTasks();
  renderTasks();
}

function deleteTask(id) {
  if (!confirm('Delete this task?')) return;
  tasks = tasks.filter(t => t.id !== id);
  saveTasks();
  renderTasks();
}

function editTaskPrompt(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  const newText = prompt('Edit task:', task.text);
  if (newText === null) return;
  const trimmed = newText.trim();
  if (!trimmed) return alert('Task cannot be empty.');
  task.text = trimmed;
  saveTasks();
  renderTasks();
}

function clearCompleted() {
  if (!tasks.some(t => t.completed)) return alert('No completed tasks.');
  if (!confirm('Clear all completed tasks?')) return;
  tasks = tasks.filter(t => !t.completed);
  saveTasks();
  renderTasks();
}

function renderTasks() {
  const activeFilter = document.querySelector('.filter.active')?.dataset.filter || 'all';
  const q = (searchInput.value || '').trim().toLowerCase();

  listEl.innerHTML = '';

  const filtered = tasks.filter(t => {
    if (activeFilter === 'active' && t.completed) return false;
    if (activeFilter === 'completed' && !t.completed) return false;
    if (q && !t.text.toLowerCase().includes(q)) return false;
    return true;
  });

  if (filtered.length === 0) {
    listEl.innerHTML = `<li class="task-item"><div>No tasks found.</div></li>`;
  } else {
    filtered.forEach(task => listEl.appendChild(createTaskElement(task)));
  }
  updateCount();
}

function createTaskElement(task) {
  const li = document.createElement('li');
  li.className = 'task-item';
  li.dataset.id = task.id;
  li.draggable = true;

  const priorityClass = task.priority === 'High' ? 'priority-high' :
                        task.priority === 'Medium' ? 'priority-medium' : 'priority-low';

  const deadlineText = task.deadline ? `<small>Due: ${new Date(task.deadline).toLocaleString()}</small>` : '';

  li.innerHTML = `
    <div class="task-left">
      <input type="checkbox" ${task.completed ? 'checked' : ''} />
      <span class="task-text ${task.completed ? 'done' : ''}">${escapeHtml(task.text)}</span>
      <span class="${priorityClass}">(${task.priority})</span>
      ${deadlineText}
    </div>
    <div class="actions">
      <button class="edit">✎</button>
      <button class="delete">🗑</button>
    </div>
  `;
  return li;
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;',
    '"': '&quot;', "'": '&#39;'
  }[m]));
}

function updateCount() {
  const total = tasks.length;
  const remaining = tasks.filter(t => !t.completed).length;
  countEl.textContent = `${remaining} active • ${total} total`;
}

function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll('.task-item:not(.dragging)')];
  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) {
      return { offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function updateOrder() {
  const ids = [...listEl.querySelectorAll('.task-item')].map(li => li.dataset.id);
  tasks.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
  saveTasks();
}

function checkReminders() {
  const now = new Date();
  tasks.forEach(task => {
    if (!task.completed && task.deadline) {
      const deadlineTime = new Date(task.deadline);
      const diffMin = (deadlineTime - now) / 60000;
      if (diffMin > 0 && diffMin <= 5) {
        alert(`Reminder: "${task.text}" is due in ${Math.ceil(diffMin)} min!`);
      }
    }
  });
}
