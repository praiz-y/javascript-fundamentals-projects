/**
 * ============================================================
 * STICKY NOTES TODO APP — script.js
 * ============================================================
 * Architecture: Module-style vanilla JS
 * Storage: localStorage
 * ============================================================
 */

// ============================================================
// 1. DOM SELECTIONS
// ============================================================
const taskInput      = document.getElementById('taskInput');
const categorySelect = document.getElementById('categorySelect');
const addBtn         = document.getElementById('addBtn');
const taskBoard      = document.getElementById('taskBoard');
const emptyState     = document.getElementById('emptyState');
const taskCount      = document.getElementById('taskCount');
const charCount      = document.getElementById('charCount');
const clearCompleted = document.getElementById('clearCompleted');
const filterBtns     = document.querySelectorAll('.filter-btn');

// Modal elements
const modalOverlay   = document.getElementById('modalOverlay');
const editInput      = document.getElementById('editInput');
const saveEdit       = document.getElementById('saveEdit');
const cancelEdit     = document.getElementById('cancelEdit');

// ============================================================
// 2. APP STATE
// ============================================================

/**
 * tasks: array of task objects
 *   { id, text, category, completed, createdAt }
 *
 * currentFilter: which filter is currently active
 * editingId: the id of the task being edited (or null)
 */
let tasks         = [];
let currentFilter = 'all';
let editingId     = null;

// Category label lookup (emoji + name)
const CATEGORY_LABELS = {
  personal: '🌿 Personal',
  work:     '💼 Work',
  study:    '📚 Study',
  urgent:   '🔥 Urgent',
  idea:     '💡 Idea',
};

// ============================================================
// 3. LOCAL STORAGE HELPERS
// ============================================================

/**
 * saveTasks — serialise the tasks array and store it.
 * JSON.stringify converts the JS array into a string
 * so it can live in localStorage (which only holds strings).
 */
function saveTasks() {
  localStorage.setItem('stickyNotes_tasks', JSON.stringify(tasks));
}

/**
 * loadTasks — read tasks back from localStorage.
 * JSON.parse converts the string back into a JS array.
 * If nothing is stored yet, default to an empty array.
 */
function loadTasks() {
  const raw = localStorage.getItem('stickyNotes_tasks');
  tasks = raw ? JSON.parse(raw) : [];
}

// ============================================================
// 4. TASK CREATION
// ============================================================

/**
 * generateId — creates a unique string ID using the current
 * timestamp + a small random number to avoid collisions.
 */
function generateId() {
  return `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

/**
 * addTask — reads values from the input field and dropdown,
 * creates a new task object, pushes it to the tasks array,
 * saves to localStorage, then re-renders the board.
 */
function addTask() {
  const text     = taskInput.value.trim();
  const category = categorySelect.value;

  // Guard: don't add empty tasks
  if (!text) {
    taskInput.focus();
    taskInput.classList.add('shake');
    taskInput.addEventListener('animationend', () =>
      taskInput.classList.remove('shake'), { once: true });
    return;
  }

  // Build the task object
  const newTask = {
    id:        generateId(),
    text:      text,
    category:  category,
    completed: false,
    createdAt: new Date().toISOString(),
  };

  tasks.unshift(newTask); // add to the front of the list
  saveTasks();

  // Reset UI
  taskInput.value  = '';
  charCount.textContent = '0';
  taskInput.focus();

  // Re-render with the current filter
  renderBoard();
}

// ============================================================
// 5. CARD RENDERING
// ============================================================

/**
 * getFilteredTasks — returns a subset of tasks depending on
 * the currently active filter button.
 */
function getFilteredTasks() {
  switch (currentFilter) {
    case 'active':    return tasks.filter(t => !t.completed);
    case 'completed': return tasks.filter(t =>  t.completed);
    // category filters
    case 'personal':
    case 'work':
    case 'study':
    case 'urgent':
    case 'idea':
      return tasks.filter(t => t.category === currentFilter);
    default:          return tasks; // 'all'
  }
}

/**
 * renderBoard — clears the board and re-renders every visible
 * card. Also updates the task counter and empty-state message.
 */
function renderBoard() {
  // Remove all existing cards from the DOM
  taskBoard.innerHTML = '';

  const visible = getFilteredTasks();

  // Show or hide the empty state illustration
  if (visible.length === 0) {
    emptyState.hidden = false;
    taskBoard.appendChild(emptyState);
  } else {
    emptyState.hidden = true;
  }

  // Update the counter badge (always shows total tasks)
  taskCount.textContent = tasks.length;

  // Render each visible task as a card
  visible.forEach(task => {
    const card = buildCard(task);
    taskBoard.appendChild(card);
  });
}

/**
 * buildCard — creates and returns a DOM element for a single task.
 * This function:
 *   1. Creates the outer card div and sets category/data attributes
 *   2. Creates the badge, text, and footer elements
 *   3. Attaches event listeners for checkbox, edit, delete
 */
function buildCard(task) {
  /* --- Outer card --- */
  const card = document.createElement('article');
  card.className   = `note-card${task.completed ? ' completed' : ''}`;
  card.dataset.id  = task.id;
  card.dataset.category = task.category;

  /* --- Category badge --- */
  const badge = document.createElement('div');
  badge.className   = 'card-badge';
  badge.textContent = CATEGORY_LABELS[task.category] || task.category;

  /* --- Task text --- */
  const text = document.createElement('p');
  text.className   = 'card-text';
  text.textContent = task.text;

  /* --- Footer (checkbox + action buttons) --- */
  const footer = document.createElement('div');
  footer.className = 'card-footer';

  // Checkbox
  const checkbox = document.createElement('input');
  checkbox.type      = 'checkbox';
  checkbox.className = 'card-checkbox';
  checkbox.checked   = task.completed;
  checkbox.title     = task.completed ? 'Mark as active' : 'Mark as done';

  checkbox.addEventListener('change', () => toggleComplete(task.id));

  // Action buttons container
  const actions = document.createElement('div');
  actions.className = 'card-actions';

  // Edit button
  const editBtn = document.createElement('button');
  editBtn.className   = 'card-btn edit';
  editBtn.textContent = '✏️';
  editBtn.title       = 'Edit task';
  editBtn.addEventListener('click', () => openEditModal(task.id));

  // Delete button
  const deleteBtn = document.createElement('button');
  deleteBtn.className   = 'card-btn delete';
  deleteBtn.textContent = '🗑️';
  deleteBtn.title       = 'Delete task';
  deleteBtn.addEventListener('click', () => deleteTask(task.id, card));

  actions.append(editBtn, deleteBtn);
  footer.append(checkbox, actions);

  /* --- Assemble card --- */
  card.append(badge, text, footer);

  return card;
}

// ============================================================
// 6. TOGGLE COMPLETE
// ============================================================

/**
 * toggleComplete — flips the completed flag on a task,
 * saves, and re-renders. The CSS handles the visual strikethrough.
 */
function toggleComplete(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  task.completed = !task.completed;
  saveTasks();
  renderBoard();
}

// ============================================================
// 7. DELETE TASK
// ============================================================

/**
 * deleteTask — adds the 'deleting' CSS class to trigger the
 * exit animation, then removes the task after the animation
 * duration (400 ms) and re-renders.
 */
function deleteTask(id, cardElement) {
  // Play exit animation first
  cardElement.classList.add('deleting');

  setTimeout(() => {
    tasks = tasks.filter(t => t.id !== id);
    saveTasks();
    renderBoard();
  }, 400); // matches animation duration in CSS
}

// ============================================================
// 8. EDIT MODAL
// ============================================================

/**
 * openEditModal — stores the task id being edited, pre-fills
 * the textarea with the current text, and shows the modal.
 */
function openEditModal(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  editingId           = id;
  editInput.value     = task.text;
  modalOverlay.hidden = false;
  editInput.focus();
  // Move cursor to end of text
  editInput.selectionStart = editInput.selectionEnd = editInput.value.length;
}

/**
 * closeModal — hides the modal and clears the editing state.
 */
function closeModal() {
  modalOverlay.hidden = true;
  editingId           = null;
  editInput.value     = '';
}

/**
 * saveTaskEdit — validates the new text, updates the task
 * object in the array, saves, re-renders, and closes the modal.
 */
function saveTaskEdit() {
  const newText = editInput.value.trim();
  if (!newText || !editingId) return;

  const task = tasks.find(t => t.id === editingId);
  if (!task) return;

  task.text = newText;
  saveTasks();
  closeModal();
  renderBoard();
}

// ============================================================
// 9. FILTER LOGIC
// ============================================================

/**
 * Each filter button carries a data-filter attribute.
 * Clicking one sets currentFilter, toggles the active class,
 * and re-renders the board.
 */
filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    currentFilter = btn.dataset.filter;
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderBoard();
  });
});

// ============================================================
// 10. CLEAR COMPLETED
// ============================================================

clearCompleted.addEventListener('click', () => {
  const count = tasks.filter(t => t.completed).length;
  if (count === 0) return;

  if (confirm(`Remove ${count} completed task${count > 1 ? 's' : ''}?`)) {
    tasks = tasks.filter(t => !t.completed);
    saveTasks();
    renderBoard();
  }
});

// ============================================================
// 11. UTILITY: CHARACTER COUNTER
// ============================================================
taskInput.addEventListener('input', () => {
  charCount.textContent = taskInput.value.length;
});

// ============================================================
// 12. EVENT LISTENERS
// ============================================================

// Add button click
addBtn.addEventListener('click', addTask);

// Allow Enter key to add task
taskInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') addTask();
});

// Modal: save on button click
saveEdit.addEventListener('click', saveTaskEdit);

// Modal: save on Ctrl+Enter / Cmd+Enter
editInput.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') saveTaskEdit();
  if (e.key === 'Escape') closeModal();
});

// Modal: close on cancel button
cancelEdit.addEventListener('click', closeModal);

// Modal: close on backdrop click
modalOverlay.addEventListener('click', e => {
  if (e.target === modalOverlay) closeModal();
});

// ============================================================
// 13. INITIALISATION
// ============================================================

/**
 * init — called once when the page loads.
 * Reads tasks from localStorage and renders the board.
 */
function init() {
  loadTasks();
  renderBoard();
}

init();

// ============================================================
// 14. CSS SHAKE ANIMATION (injected once)
// ============================================================
// Injects the shake keyframe so we don't need an extra stylesheet.
(function injectShakeKeyframe() {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      20%       { transform: translateX(-6px); }
      40%       { transform: translateX(6px); }
      60%       { transform: translateX(-4px); }
      80%       { transform: translateX(4px); }
    }
    .shake { animation: shake 0.35s ease both; }
  `;
  document.head.appendChild(style);
})();