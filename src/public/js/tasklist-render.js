// Task lists: rendering.

// Render the task list interface
function renderTaskList(noteId, tasks) {
    const noteEntry = document.getElementById('entry' + noteId);
    if (!noteEntry) return;

    const taskListHtml = `
        <div class="task-list-container" id="tasklist-${noteId}">
            <div class="tasklist-progress" id="tasklist-progress-${noteId}" style="display: none;">
                <div class="tasklist-progress-label"></div>
                <div class="tasklist-progress-bar">
                    <div class="tasklist-progress-fill"></div>
                </div>
            </div>
            <div class="tasks-list" id="tasks-list-${noteId}">
                ${renderTasksAroundAddRow(tasks, noteId, renderTaskAddRow(noteId))}
            </div>
        </div>
    `;

    noteEntry.innerHTML = taskListHtml;
    noteEntry.contentEditable = false;

    wireTaskAddRow(noteId);

    // Store tasks data
    noteEntry.dataset.tasklistJson = JSON.stringify(tasks);

    // Enable drag & drop reordering after initial render
    enableDragAndDrop(noteId);

    updateTaskListProgress(noteId, tasks);
}

// Render individual tasks
function renderTasks(tasks, noteId) {
    if (!Array.isArray(tasks)) return '';

    const t = window.t || ((key, params, fallback) => fallback);

    return tasks.map(task => {
        // Priority flag (#1730, js/task-priority.js)
        const priority = getTaskPriority(task);
        const priorityApi = window.poznoteTaskPriority;
        const priorityBtnClass = 'task-priority-btn' + (priority ? ' has-priority priority-' + priority : '');
        const priorityTitle = priorityApi ? priorityApi.buttonTitle(task) : t('tasklist.priority', null, 'Priority');
        // Only open tasks are coloured, like everywhere else
        const priorityRowClass = (!task.completed && priority)
            ? (priorityApi ? priorityApi.classNames(task) : ' important')
            : '';
        const moveTitle = t('tasklist.move_to_list', null, 'Move to another list');
        const dueTitle = t('tasklist.due_date', null, 'Due date');
        const menuTitle = t('tasklist.task_options', null, 'Task options');
        const dragTitle = t('tasklist.drag_to_reorder', null, 'Drag to reorder');
        const subtaskTitle = t('tasklist.add_subtask', null, 'Add a subtask');
        const deleteTitle = t('tasklist.delete_task', null, 'Delete task');

        const dueAt = normalizeTaskDueAt(task.dueAt);
        const dueBellHtml = task.dueReminder ? '<i class="lucide lucide-bell"></i>' : '';
        const dueChipHtml = dueAt
            ? `<button type="button" class="task-due-chip${(!task.completed && isTaskDueOverdue(dueAt)) ? ' overdue' : ''}" title="${dueTitle}" onclick="openTaskDueDatePicker(${task.id}, ${task.noteId || 'null'}, event)">
                <i class="lucide lucide-calendar-alt"></i><span>${formatTaskDueDate(dueAt)}</span>${dueBellHtml}
            </button>`
            : '';
        const dueBtnHtml = (!dueAt && !task.completed)
            ? `<button class="task-due-btn" title="${dueTitle}" onclick="openTaskDueDatePicker(${task.id}, ${task.noteId || 'null'}, event)">
                <i class="lucide lucide-calendar-alt"></i>
            </button>`
            : '';

        // Conditional buttons based on completion status
        let buttonsHtml = '';
        if (task.completed) {
            // Completed tasks: show delete and drag buttons
            buttonsHtml = `
            <button class="task-delete-btn" title="${deleteTitle}" onclick="deleteTask(${task.id}, ${task.noteId || 'null'})">
                <i class="lucide lucide-trash-2"></i>
            </button>
            <button class="task-move-btn" title="${moveTitle}" onclick="openMoveTaskModal(${task.id}, ${task.noteId || 'null'})">
                <i class="lucide-arrow-right"></i>
            </button>
            <div class="task-drag-handle" title="${dragTitle}">
                <i class="lucide-grip-vertical"></i>
            </div>`;
        } else {
            // Incomplete tasks: individual buttons on desktop, collapsed into a
            // three-dot menu on mobile (visibility handled in tasks.css)
            buttonsHtml = `
            <button class="task-subtask-btn" title="${subtaskTitle}" onclick="openSubtaskInput(${task.id}, ${task.noteId || 'null'}, event)">
                <i class="lucide lucide-corner-down-right"></i>
            </button>
            ${dueBtnHtml}
            <button class="${priorityBtnClass}" title="${priorityTitle}" aria-haspopup="menu" onclick="openTaskPriorityMenu(${task.id}, ${task.noteId || 'null'}, event)">
                <i class="lucide lucide-flag"></i>
            </button>
            <button class="task-move-btn" title="${moveTitle}" onclick="openMoveTaskModal(${task.id}, ${task.noteId || 'null'})">
                <i class="lucide-arrow-right"></i>
            </button>
            <button class="task-delete-btn" title="${deleteTitle}" onclick="deleteTask(${task.id}, ${task.noteId || 'null'})">
                <i class="lucide lucide-trash-2"></i>
            </button>
            <button class="task-menu-btn" title="${menuTitle}" onclick="openTaskActionsMenu(${task.id}, ${task.noteId || 'null'}, event)">
                <i class="lucide lucide-more-vertical"></i>
            </button>
            <div class="task-drag-handle" title="${dragTitle}">
                <i class="lucide-grip-vertical"></i>
            </div>`;
        }

        // Subtasks sit inside the row of their task (js/tasklist-subtasks.js)
        const subtasksHtml = renderSubtasks(task, task.noteId || noteId);

        return `
        <div class="task-item ${task.completed ? 'completed' : ''}${priorityRowClass} ${dueAt ? 'has-due' : ''} ${subtasksHtml ? 'has-subtasks' : ''}" data-task-id="${task.id}"${priority ? ` data-priority="${priority}"` : ''} draggable="false">
            <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} onchange="toggleTask(${task.id}, ${task.noteId || 'null'})">
            <span class="task-text" onclick="editTask(${task.id}, ${task.noteId || 'null'})">${linkifyHtml(task.text)}</span>
            ${dueChipHtml}
            <div class="task-row-actions">${buttonsHtml}</div>
            ${subtasksHtml}
        </div>
        `;
    }).join('');
}

// --- The empty row to type the next task in (Google Keep style) ---
//
// Not a bar above the list: an empty task-shaped row sitting in the list, exactly
// where the next task goes: after the open tasks, or first in the list when new
// tasks go to the top. It keeps the id and the
// class of the old field (`task-input-${noteId}`, `.task-input`,
// `.task-input-container`), so the slash menu, Element visibility, the read-only
// shared workspace and focusNoteContent() find it as before. It is a one-line
// textarea that grows with its text: Shift+Enter and a multi-line paste keep their
// line breaks, which a task can hold (`.task-text` is pre-wrap).

function taskAddRowPlaceholder() {
    return window.t ? window.t('tasklist.add_row_placeholder', null, 'Add a task') : 'Add a task';
}

function renderTaskAddRow(noteId) {
    const placeholder = escapeAttribute(taskAddRowPlaceholder());
    return `<div class="task-input-container task-add-row" id="task-add-row-${noteId}">
                <i class="lucide lucide-plus task-add-row-icon" aria-hidden="true"></i>
                <form class="task-input-form" id="task-input-form-${noteId}" action="javascript:void(0);">
                    <textarea class="task-input" id="task-input-${noteId}" rows="1"
                        placeholder="${placeholder}" aria-label="${placeholder}" maxlength="4000"
                        autocomplete="off" enterkeyhint="go"></textarea>
                </form>
            </div>`;
}

function currentTasklistInsertOrder() {
    return cachedTasklistInsertOrder === 'top' ? 'top' : 'bottom';
}

// Index in `tasks` where the row sits. Bottom = after the last open task, where
// addTask() puts the next one. Top = always first, above the tasks with a priority
// too (asked by the dev), even though addTask() still files a new task after them.
function taskAddRowIndex(tasks) {
    if (currentTasklistInsertOrder() === 'top') return 0;
    let lastOpen = -1;
    for (let i = 0; i < tasks.length; i++) {
        if (!tasks[i].completed) lastOpen = i;
    }
    return lastOpen + 1;
}

// --- The fold of the checked tasks (Google Keep style) ---
//
// A "3 completed tasks" header with a chevron sits right before the run of
// completed tasks that ends the list; closed, it hides them. One state for every
// task list (asked by the dev), kept in the browser and never in the note, like
// the other reading gestures (toggle blocks, folded code blocks): folding is not
// editing. Only the completed tasks after the header are folded (`~` selector),
// so one dragged up among the open tasks stays in sight.

const TASK_COMPLETED_COLLAPSED_KEY = 'tasklist_completed_collapsed';

function taskCompletedStorage() {
    return window.__poznoteUserStorage || window.localStorage;
}

// Closed by default (asked by the dev): only an explicit '0' keeps it open
function isTaskCompletedCollapsed() {
    try {
        return taskCompletedStorage().getItem(TASK_COMPLETED_COLLAPSED_KEY) !== '0';
    } catch (e) {
        return true;
    }
}

function setTaskCompletedCollapsed(collapsed) {
    try {
        taskCompletedStorage().setItem(TASK_COMPLETED_COLLAPSED_KEY, collapsed ? '1' : '0');
    } catch (e) { /* storage unavailable: the state lasts for this page */ }
}

// Index of the first task of the completed run that ends the list, and its length
function taskCompletedRun(tasks) {
    let lastOpen = -1;
    for (let i = 0; i < tasks.length; i++) {
        if (!tasks[i].completed) lastOpen = i;
    }
    return { index: lastOpen + 1, count: tasks.length - (lastOpen + 1) };
}

function taskCompletedLabel(count) {
    const t = window.t || ((key, params, fallback) => fallback);
    return count === 1
        ? t('tasklist.completed_section_one', null, '1 completed task')
        : t('tasklist.completed_section_other', { count: count }, '{{count}} completed tasks').replace('{{count}}', count);
}

function renderTaskCompletedHeader(count) {
    const collapsed = isTaskCompletedCollapsed();
    const label = escapeAttribute(taskCompletedLabel(count));
    return `<button type="button" class="task-completed-toggle${collapsed ? ' is-collapsed' : ''}" aria-expanded="${collapsed ? 'false' : 'true'}">
                <i class="lucide lucide-chevron-down task-completed-chevron" aria-hidden="true"></i>
                <span class="task-completed-label">${label}</span>
            </button>`;
}

function paintTaskCompletedToggle(button, collapsed) {
    button.classList.toggle('is-collapsed', collapsed);
    button.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
}

// Opening or closing one list opens or closes them all
document.addEventListener('click', function (e) {
    const button = e.target && e.target.closest ? e.target.closest('.task-completed-toggle') : null;
    if (!button) return;
    e.preventDefault();
    const collapsed = !button.classList.contains('is-collapsed');
    setTaskCompletedCollapsed(collapsed);
    document.querySelectorAll('.task-completed-toggle').forEach(b => paintTaskCompletedToggle(b, collapsed));
});

// Task rows tasks[from, to), with the completed header before the completed run
function renderTaskSegment(tasks, from, to, noteId) {
    const run = taskCompletedRun(tasks);
    if (run.count === 0 || run.index < from || run.index >= to) {
        return renderTasks(tasks.slice(from, to), noteId);
    }
    return renderTasks(tasks.slice(from, run.index), noteId)
        + renderTaskCompletedHeader(run.count)
        + renderTasks(tasks.slice(run.index, to), noteId);
}

function renderTasksAroundAddRow(tasks, noteId, rowHtml) {
    if (!Array.isArray(tasks)) tasks = [];
    const index = taskAddRowIndex(tasks);
    return renderTaskSegment(tasks, 0, index, noteId) + rowHtml + renderTaskSegment(tasks, index, tasks.length, noteId);
}

function getTaskAddRow(listEl) {
    return listEl ? listEl.querySelector(':scope > .task-add-row') : null;
}

// Redraw the task rows of a list around its add row. The row itself never leaves
// the DOM, so a field being typed in keeps its focus, caret and mobile keyboard.
function renderTasksInto(listEl, tasks, noteId) {
    if (!listEl) return;
    const row = getTaskAddRow(listEl);
    if (!row) {
        listEl.innerHTML = renderTasks(tasks, noteId);
        return;
    }
    Array.from(listEl.children).forEach(child => {
        if (child !== row) child.remove();
    });
    if (!Array.isArray(tasks)) tasks = [];
    const index = taskAddRowIndex(tasks);
    row.insertAdjacentHTML('beforebegin', renderTaskSegment(tasks, 0, index, noteId));
    row.insertAdjacentHTML('afterend', renderTaskSegment(tasks, index, tasks.length, noteId));
}

// Put the completed header back before the completed run, with its count, without
// redrawing the tasks (after a drag & drop or a deletion)
function placeTaskCompletedHeader(listEl, tasks) {
    const existing = listEl.querySelector(':scope > .task-completed-toggle');
    if (existing) existing.remove();
    const run = taskCompletedRun(tasks);
    if (run.count === 0) return;
    const first = listEl.querySelector(':scope > .task-item[data-task-id="' + tasks[run.index].id + '"]');
    if (first) first.insertAdjacentHTML('beforebegin', renderTaskCompletedHeader(run.count));
}

// Move the row back to where the next task goes, and the completed header before
// the completed run, without redrawing the tasks (after a drag & drop or a
// deletion, or once the insert order preference is known)
function placeTaskAddRow(noteId) {
    const listEl = document.getElementById('tasks-list-' + noteId);
    const row = getTaskAddRow(listEl);
    const noteEntry = document.getElementById('entry' + noteId);
    if (!row || !noteEntry) return;

    const tasks = parseTaskData(noteEntry);
    placeTaskCompletedHeader(listEl, tasks);

    const index = taskAddRowIndex(tasks);
    let next = index < tasks.length
        ? listEl.querySelector(':scope > .task-item[data-task-id="' + tasks[index].id + '"]')
        : null;
    // The row comes before the completed header, not between it and its tasks
    if (next && next.previousElementSibling && next.previousElementSibling.classList.contains('task-completed-toggle')) {
        next = next.previousElementSibling;
    }
    if (row.nextElementSibling === next) return;

    const input = row.querySelector('.task-input');
    const hadFocus = !!input && document.activeElement === input;
    const start = hadFocus ? input.selectionStart : 0;
    const end = hadFocus ? input.selectionEnd : 0;
    listEl.insertBefore(row, next);
    if (hadFocus) {
        input.focus({ preventScroll: true });
        try { input.setSelectionRange(start, end); } catch (e) { /* not a text input */ }
    }
}

function placeAllTaskAddRows() {
    document.querySelectorAll('.tasks-list > .task-add-row').forEach(row => {
        const noteId = row.id.replace('task-add-row-', '');
        if (noteId) placeTaskAddRow(noteId);
    });
}

window.placeAllTaskAddRows = placeAllTaskAddRows;

function wireTaskAddRow(noteId) {
    const row = document.getElementById(`task-add-row-${noteId}`);
    const input = document.getElementById(`task-input-${noteId}`);
    const form = document.getElementById(`task-input-form-${noteId}`);
    if (!row || !input) return;

    if (form) {
        // Kept for anything that still submits the form; a textarea never
        // triggers an implicit submission itself
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            addTask(noteId);
        });
    }

    // Enter adds the task, Shift+Enter breaks the line
    input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.isComposing) {
            // Already handled: the slash menu of the field took the key
            if (e.defaultPrevented) return;
            if (e.shiftKey) return;
            // preventDefault also suppresses the line break (and the
            // beforeinput below), so addTask is not called twice
            e.preventDefault();
            e.stopPropagation(); // Standardize event handling
            addTask(noteId);
        } else if (e.key === 'Escape') {
            // Already handled: it closed the slash menu of the field
            if (e.defaultPrevented) return;
            // Escape drops what was typed instead of keeping it as a task
            e.preventDefault();
            e.stopPropagation();
            input.value = '';
            autoSizeTaskAddInput(input);
            input.blur();
        }
    });

    // Mobile virtual keyboards often send Enter through IME composition (key
    // 'Unidentified'), which the keydown above never sees: the line break they
    // insert is caught here instead. A Shift+Enter line break was let through by
    // keydown, so only a break that keydown did not see adds the task.
    let shiftEnterPending = false;
    input.addEventListener('keydown', function(e) {
        shiftEnterPending = e.key === 'Enter' && e.shiftKey;
    }, true);
    input.addEventListener('beforeinput', function(e) {
        if (e.inputType !== 'insertLineBreak' && e.inputType !== 'insertParagraph') return;
        if (shiftEnterPending) {
            shiftEnterPending = false;
            return;
        }
        e.preventDefault();
        addTask(noteId);
    });

    input.addEventListener('input', function() {
        autoSizeTaskAddInput(input);
    });

    // Leaving the row keeps what was typed, as a task: the row is the next task,
    // not a draft (Google Keep does the same). Deferred so a click on another
    // control of the list (its handler may redraw the list) is not cut short, and
    // skipped while a picker of the slash menu (link to note, emoji, date) has the
    // focus, the text then still being typed.
    input.addEventListener('blur', function() {
        setTimeout(function() {
            if (isTaskEditBlurSavePaused(input)) return;
            if (!input.isConnected || document.activeElement === input) return;
            if (input.value.trim()) addTask(noteId, { keepFocus: false });
        }, 150);
    });

    // A click anywhere on the row (the + icon, the padding) types in it
    row.addEventListener('mousedown', function(e) {
        if (e.target === input) return;
        e.preventDefault();
        input.focus();
    });

    // Pasted content is plain text, line breaks and blank lines kept as they are
    input.addEventListener('paste', function(e) {
        e.preventDefault();
        const text = (e.clipboardData || window.clipboardData).getData('text/plain').replace(/\r\n?/g, '\n');
        // Insert plain text at cursor position
        const start = this.selectionStart;
        const end = this.selectionEnd;
        const currentValue = this.value;
        this.value = (currentValue.substring(0, start) + text + currentValue.substring(end)).slice(0, this.maxLength > 0 ? this.maxLength : undefined);
        // Move cursor to end of pasted text
        this.selectionStart = this.selectionEnd = Math.min(start + text.length, this.value.length);
        autoSizeTaskAddInput(this);
    });
}

// The add row grows with its lines instead of scrolling inside one line
function autoSizeTaskAddInput(input) {
    if (!input || input.tagName !== 'TEXTAREA') return;
    input.style.height = 'auto';
    input.style.height = input.scrollHeight + 'px';
}

// Cached tasklist insert order preference (global setting, rarely changes).
// Avoids a network round-trip on every task addition, which caused tasks to be
// added late or lost on mobile (slow network + race condition when adding
// several tasks quickly while a fetch was still in flight).
let cachedTasklistInsertOrder = null;

function refreshCachedTasklistInsertOrder() {
    fetch('/api/v1/settings/tasklist_insert_order', {
        method: 'GET',
        credentials: 'same-origin'
    })
        .then(r => r.json())
        .then(data => {
            if (data && data.success && (data.value === 'top' || data.value === 'bottom')) {
                cachedTasklistInsertOrder = data.value;
                placeAllTaskAddRows();
            } else if (cachedTasklistInsertOrder === null) {
                cachedTasklistInsertOrder = 'bottom';
            }
        })
        .catch(() => {
            if (cachedTasklistInsertOrder === null) cachedTasklistInsertOrder = 'bottom';
        });
}
