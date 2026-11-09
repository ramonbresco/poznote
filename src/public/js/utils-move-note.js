// Moving a single note in Poznote.
// 
// The move-note modal: picking a target workspace and folder, creating a folder or a
// workspace from inside the modal, and performing the move.
//
// The target folder is picked in a filtered list (see the folder picker at the bottom
// of this file). #moveNoteTargetSelect stays in the page out of sight and holds the
// chosen folder: the move, the recent-folder shortcuts and populateTargetFolderDropdown()
// all keep reading it.

function showMoveFolderDialog(noteId, forcedFolderId, forcedFolderName) {
    // Check if a valid note is selected
    if (!noteId || noteId == -1 || noteId == '' || noteId == null || noteId === undefined) {
        showNotificationPopup(
            (window.t ? window.t('folders.move_note.select_note_first', null, 'Please select a note first before moving it to a folder.') : 'Please select a note first before moving it to a folder.')
        );
        return;
    }

    noteid = noteId; // Set the current note ID

    // Store noteId in the modal dataset for later use
    var modal = document.getElementById('moveNoteFolderModal');
    if (modal) modal.dataset.noteId = noteId;

    // Get current folder of the note
    // Try provided arguments first, then data attributes from the triggering element (if available), then fallback to hidden inputs
    var currentFolderId = forcedFolderId;
    var currentFolder = forcedFolderName;

    if (currentFolderId === undefined || currentFolderId === null) {
        // Fallback to data attributes if event target is available
        var target = event && event.target ? event.target.closest('[data-action]') : null;
        if (target) {
            currentFolderId = target.dataset.folderId;
            currentFolder = target.dataset.folder;
        }
    }

    if (currentFolderId === undefined || currentFolderId === null) {
        // Final fallback to hidden inputs in the main column (original behavior)
        var folderIdEl = document.getElementById('folderId' + noteId);
        var folderEl = document.getElementById('folder' + noteId);
        currentFolderId = folderIdEl ? folderIdEl.value : '';
        currentFolder = folderEl ? folderEl.value : '';
    }

    // Remember the note's current folder so the dropdown can be rebuilt later
    // (e.g. after creating a folder from within the modal) with the same exclusion
    if (modal) {
        modal.dataset.currentFolderId = (currentFolderId === undefined || currentFolderId === null) ? '' : String(currentFolderId);
        modal.dataset.currentFolderName = currentFolder || '';
        // Filled in once the folder list arrives, so it must not survive the last note
        modal.dataset.currentFolderPath = '';
    }

    // Name the note and the folder it is in: that folder is left out of the list below
    setMoveNoteModalSubject(noteId, currentFolder);
    resetMoveNoteFolderFilter();

    // Load workspaces first
    loadWorkspacesForMoveModal(function () {
        // Load folders after workspaces are loaded
        loadFoldersForMoveModal(currentFolderId, currentFolder);
    });
}

function loadWorkspacesForMoveModal(callback) {
    fetch('/api/v1/workspaces', {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        credentials: 'same-origin'
    })
        .then(function (response) { return response.json(); })
        .then(function (data) {
            if (data.success) {
                var workspaceSelect = document.getElementById('workspaceSelect');
                workspaceSelect.innerHTML = '';

                // Add current workspace as selected
                var currentWorkspace = getSelectedWorkspace();

                // Add all workspaces
                data.workspaces.forEach(function (workspace) {
                    var option = document.createElement('option');
                    option.value = workspace.name;
                    option.textContent = workspace.name;
                    if (workspace.name === currentWorkspace) {
                        option.selected = true;
                    }
                    workspaceSelect.appendChild(option);
                });

                // One workspace: the dropdown has nothing to choose from
                var group = document.getElementById('moveNoteWorkspaceGroup');
                if (group) {
                    group.classList.toggle('initially-hidden', data.workspaces.length <= 1);
                }

                if (callback) callback();
            }
        })
        .catch(function (error) {
            console.error('Error loading workspaces:', error);
            if (callback) callback();
        });
}

function loadFoldersForMoveModal(currentFolderId, currentFolderName) {
    // Reset the interface: no destination picked, no error, no inline create row
    clearMoveNoteFolderChoice();
    hideMoveFolderError();
    resetMoveModalCreateRows();

    // Show the dialog right away and let the list fill in: the folders arrive in one
    // request, the one populateTargetFolderDropdown() makes
    var modal = document.getElementById('moveNoteFolderModal');
    if (modal) modal.style.display = 'flex';

    // The filter field is left unfocused on purpose (asked for by the dev): the dialog
    // opens on the list, and the keyboard stays out of the way on a phone
    populateTargetFolderDropdown(currentFolderId, currentFolderName, 'moveNoteTargetSelect');
}

// The destination workspace changed inside the move modal: the folder list follows it.
// (The app's own workspace switch is onWorkspaceChange() of js/workspaces-core.js, whose
// body this one shadows; nothing calls that one, see js-duplicate-declarations.)
function onWorkspaceChange() {
    // Another workspace is another set of folders: whatever was picked is gone
    clearMoveNoteFolderChoice();
    hideMoveFolderError();

    // The note's own folder is only worth leaving out while the destination is the
    // workspace the note already lives in
    var modal = document.getElementById('moveNoteFolderModal');
    var workspaceSelect = document.getElementById('workspaceSelect');
    var appWorkspace = '';
    try {
        appWorkspace = (typeof getSelectedWorkspace === 'function') ? (getSelectedWorkspace() || '') : '';
    } catch (e) {
        console.debug('utils-move-note: onWorkspaceChange() failed:', e);
    }
    var sameWorkspace = !workspaceSelect || workspaceSelect.value === appWorkspace;
    var excludeId = (sameWorkspace && modal) ? (modal.dataset.currentFolderId || '') : '';
    var excludeName = (sameWorkspace && modal) ? (modal.dataset.currentFolderName || '') : '';

    resetMoveNoteFolderFilter();
    populateTargetFolderDropdown(excludeId, excludeName, 'moveNoteTargetSelect');
}

function updateMoveButton(searchTerm, exactMatch) {
    if (exactMatch === undefined) exactMatch = false;
    var button = document.getElementById('moveActionButton');

    if (!searchTerm) {
        button.textContent = window.t ? window.t('common.move', null, 'Move') : 'Move';
        button.disabled = true;
    } else if (exactMatch) {
        button.textContent = window.t ? window.t('common.move', null, 'Move') : 'Move';
        button.disabled = false;
    } else {
        button.textContent = window.t ? window.t('folders.move_note.create_and_move', null, 'Create & Move') : 'Create & Move';
        button.disabled = false;
    }
}

function moveNoteToFolder() {
    var noteId = document.getElementById('moveNoteFolderModal').dataset.noteId;
    // Prefer explicit select dropdown if present (from move files modal). Fallback to old input if still present.
    var select = document.getElementById('moveNoteTargetSelect');
    var targetFolderId = '';
    if (select) {
        // Accept empty value (for "No folder" option), but only once it has been picked:
        // the dialog opens with no destination at all
        if (moveNoteFolderChoice() === null) {
            showMoveFolderError(
                window.t ? window.t('folders.move_note.select_target_folder', null, 'Please select a target folder') : 'Please select a target folder'
            );
            return;
        }
        targetFolderId = select.value;
    } else {
        // No select available — require explicit selection
        showMoveFolderError(
            window.t ? window.t('folders.move_note.select_target_folder', null, 'Please select a target folder') : 'Please select a target folder'
        );
        return;
    }

    // Get the selected workspace
    var workspaceSelect = document.getElementById('workspaceSelect');
    var targetWorkspace = workspaceSelect ? workspaceSelect.value : (selectedWorkspace || getSelectedWorkspace());

    var requestData = {
        folder_id: targetFolderId,
        workspace: targetWorkspace
    };

    var noteBefore = window.PoznoteTreeHistory ? window.PoznoteTreeHistory.noteState(noteId) : null;

    fetch('/api/v1/notes/' + noteId + '/folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(requestData)
    })
        .then(function (response) { return response.json(); })
        .then(function (data) {
            if (data && data.success) {
                // Undo support (js/tree-undo-clipboard.js)
                if (window.PoznoteTreeHistory && noteBefore) {
                    window.PoznoteTreeHistory.record({
                        type: 'note-move',
                        noteId: String(noteId),
                        from: { folderId: noteBefore.folderId, workspace: noteBefore.workspace },
                        to: { folderId: targetFolderId ? String(targetFolderId) : null, workspace: targetWorkspace }
                    });
                }

                // Mark note for auto-push since we moved a note (if auto-push enabled)
                if (window.POZNOTE_CONFIG?.gitSyncAutoPush && typeof window.setNeedsAutoPush === 'function') {
                    window.setNeedsAutoPush(true);
                }
                
                // Update shared count if notes were shared/unshared
                if (data.share_delta && typeof updateSharedCount === 'function') {
                    updateSharedCount(data.share_delta);
                }
                try { closeModal('moveNoteFolderModal'); } catch (e) {
                    console.debug('utils-move-note: moveNoteToFolder() failed:', e);
                }
                // Show where the note went, and keep it selected there (#1441)
                markFolderPathOpen(targetFolderId);
                keepTreeSelection([{ type: 'note', id: noteId }], true);
                location.reload();
            } else {
                var err = (data && (data.error || data.message)) ? (data.error || data.message) : 'Unknown error';
                showNotificationPopup(
                    (window.t ? window.t('folders.errors.generic_prefix', { error: err }, 'Error: {{error}}') : ('Error: ' + err)),
                    'error'
                );
            }
        })
        .catch(function (error) {
            showNotificationPopup(
                (window.t ? window.t('folders.move_note.errors.move_prefix', { error: String(error) }, 'Error moving note: {{error}}') : ('Error moving note: ' + error)),
                'error'
            );
        });
}

function showMoveFolderError(message) {
    var errorElement = document.getElementById('moveFolderErrorMessage');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
}

function hideMoveFolderError() {
    var errorElement = document.getElementById('moveFolderErrorMessage');
    if (errorElement) {
        errorElement.style.display = 'none';
    }
}

// --- Inline creation of a workspace from the move note modal ---
// (a folder is created from the filter bar of the folder picker, at the bottom of this file)

function toggleMoveModalCreateRow(rowId, forceShow) {
    var row = document.getElementById(rowId);
    if (!row) return;
    var show = forceShow !== undefined ? forceShow : row.classList.contains('initially-hidden');
    row.classList.toggle('initially-hidden', !show);
    var input = row.querySelector('input');
    if (input) {
        input.value = '';
        if (show) {
            setTimeout(function () { input.focus(); }, 50);
        }
    }
    if (show) hideMoveFolderError();
}

function resetMoveModalCreateRows() {
    toggleMoveModalCreateRow('moveCreateWorkspaceRow', false);
}

function toggleMoveCreateWorkspace() {
    toggleMoveModalCreateRow('moveCreateWorkspaceRow');
}

function selectMoveModalWorkspace(name) {
    var workspaceSelect = document.getElementById('workspaceSelect');
    if (!workspaceSelect) return;
    if (!findSelectOptionByValue(workspaceSelect, name)) {
        var option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        workspaceSelect.appendChild(option);
    }
    workspaceSelect.value = name;
    // Reload the folder list for the newly selected workspace
    onWorkspaceChange();
}

function createWorkspaceFromMoveModal() {
    var input = document.getElementById('moveCreateWorkspaceName');
    var name = input ? input.value.trim() : '';
    if (!name) {
        showMoveFolderError(
            window.t ? window.t('modals.move_note_folder.enter_workspace_name', null, 'Please enter a workspace name') : 'Please enter a workspace name'
        );
        return;
    }

    fetch('/api/v1/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ name: name })
    })
        .then(function (response) {
            return response.json().then(function (data) {
                return { status: response.status, data: data };
            });
        })
        .then(function (result) {
            var data = result.data || {};
            if (data.success || result.status === 409) {
                // Created — or it already exists, in which case just switch to it
                hideMoveFolderError();
                toggleMoveModalCreateRow('moveCreateWorkspaceRow', false);
                selectMoveModalWorkspace(data.name || name);
            } else {
                showMoveFolderError(data.message || data.error || 'Error creating workspace');
            }
        })
        .catch(function (error) {
            showMoveFolderError(
                window.t ? window.t('folders.errors.generic_prefix', { error: String(error) }, 'Error: {{error}}') : ('Error: ' + String(error))
            );
        });
}

// Creates the folder the filter bar names (a path creates its parents too), then
// rebuilds the list with it selected. onDone(ok) lets the caller re-enable its row.
function createMoveModalFolder(rawPath, onDone) {
    var path = String(rawPath || '').trim().replace(/^\/+|\/+$/g, '');
    if (!path) {
        showMoveFolderError(
            window.t ? window.t('modals.move_note_folder.enter_folder_name', null, 'Please enter a folder name') : 'Please enter a folder name'
        );
        if (onDone) onDone(false);
        return;
    }

    var workspace = getMoveModalWorkspace();
    var modal = document.getElementById('moveNoteFolderModal');
    var currentFolderId = modal ? (modal.dataset.currentFolderId || '') : '';
    var currentFolderName = modal ? (modal.dataset.currentFolderName || '') : '';

    fetch('/api/v1/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ workspace: workspace, folder_path: path, create_parents: true })
    })
        .then(function (response) {
            return response.json().then(function (data) {
                return { status: response.status, data: data };
            });
        })
        .then(function (result) {
            var data = result.data || {};
            var folderId = data.folder_id || (data.folder && data.folder.id);
            if (data.success || (result.status === 409 && folderId)) {
                // Created — or it already exists, in which case just select it
                hideMoveFolderError();
                // The filter named the folder; clear it so the new row is in plain sight
                resetMoveNoteFolderFilter();
                // Rebuild the dropdown so the new folder (and any created parents)
                // appear with their full path, then preselect it
                populateTargetFolderDropdown(currentFolderId, currentFolderName, 'moveNoteTargetSelect', folderId);
                if (onDone) onDone(true);
            } else {
                showMoveFolderError(data.error || data.message || 'Error creating folder');
                if (onDone) onDone(false);
            }
        })
        .catch(function (error) {
            showMoveFolderError(
                window.t ? window.t('folders.errors.generic_prefix', { error: String(error) }, 'Error: {{error}}') : ('Error: ' + String(error))
            );
            if (onDone) onDone(false);
        });
}

// executeFolderAction removed

// --- Target folder picker: the filter bar and the folder list ---
//
// #moveNoteTargetSelect holds the chosen folder and the option labels (full paths), and
// is kept out of sight; this list is what the user sees. Everything that already read
// the select keeps working, so the rendering below is the only place that knows about
// rows, filtering and highlighting.

// The row the arrow keys point at: '' is "No folder", a number is a folder,
// MOVE_NOTE_CREATE_KEY is the "create this folder" row, null is none.
var MOVE_NOTE_CREATE_KEY = '\u0000create';
var moveNoteFolderActiveKey = null;

// Nothing is picked for the user (asked for by the dev): the dialog opens with no
// destination and the Move button waits. A <select> always has an option selected, so
// "No folder" (its first option, and a destination of its own) cannot carry that state
// and this flag does: false until the user picks a row, a chip, or creates a folder.
var moveNoteFolderChosen = false;

function markMoveNoteFolderChosen() {
    moveNoteFolderChosen = true;
}

function clearMoveNoteFolderChoice() {
    moveNoteFolderChosen = false;
    var select = document.getElementById('moveNoteTargetSelect');
    if (select) select.value = '';
    moveNoteFolderActiveKey = null;
    updateMoveButton('');
}

// The destination the dialog would move to, or null while the user has picked none
function moveNoteFolderChoice() {
    if (!moveNoteFolderChosen) return null;
    var select = document.getElementById('moveNoteTargetSelect');
    return select ? String(select.value || '') : null;
}

function moveNoteFolderFoldText(text) {
    return String(text || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

// The note being moved, and the folder it is in, so the dialog says what it acts on
function setMoveNoteModalSubject(noteId, currentFolderName) {
    var titleEl = document.getElementById('moveNoteFolderNoteTitle');
    if (titleEl) {
        titleEl.textContent = moveNoteModalNoteTitle(noteId);
    }

    var currentEl = document.getElementById('moveNoteFolderCurrent');
    if (!currentEl) return;
    var folder = String(currentFolderName || '').trim();
    if (folder && folder !== 'Default') {
        currentEl.textContent = window.t
            ? window.t('modals.move_note_folder.current_location', { folder: folder }, 'Currently in {{folder}}')
            : ('Currently in ' + folder);
    } else {
        currentEl.textContent = window.t
            ? window.t('modals.move_note_folder.current_location_none', null, 'Currently outside any folder')
            : 'Currently outside any folder';
    }
}

// The title input of the open note first (it carries a rename that is still unsaved),
// then the row of the notes tree
function moveNoteModalNoteTitle(noteId) {
    var input = document.getElementById('inp' + noteId);
    if (input && typeof input.value === 'string' && input.value.trim()) {
        return input.value.trim();
    }

    var row = document.querySelector('a.links_arbo_left[data-note-db-id="' + String(noteId).replace(/["\\]/g, '\\$&') + '"] .note-title');
    if (row && (row.textContent || '').trim()) {
        return row.textContent.trim();
    }

    return window.t ? window.t('index.note.new_note', null, 'New note') : 'New note';
}

// The dialog opens with the folder NAME the tree row carried; once the folder list is
// in, its full path is known and reads better on a nested folder
function setMoveNoteModalCurrentPath(path) {
    var modal = document.getElementById('moveNoteFolderModal');
    if (!modal || !path) return;
    modal.dataset.currentFolderPath = String(path);
    setMoveNoteModalSubject(modal.dataset.noteId, path);
}

function resetMoveNoteFolderFilter() {
    var input = document.getElementById('moveNoteFolderFilter');
    if (input) input.value = '';
    moveNoteFolderActiveKey = null;
    updateMoveNoteFolderFilterClear();
    renderMoveNoteFolderList();
}

function updateMoveNoteFolderFilterClear() {
    var input = document.getElementById('moveNoteFolderFilter');
    var clear = document.getElementById('moveNoteFolderFilterClear');
    if (clear) clear.hidden = !(input && input.value);
}

// The rows to draw: the select's options narrowed by the filter, plus the create row
// when the text names no existing folder
function moveNoteFolderRows() {
    var select = document.getElementById('moveNoteTargetSelect');
    var input = document.getElementById('moveNoteFolderFilter');
    var raw = input ? input.value.trim().replace(/^\/+|\/+$/g, '') : '';
    var needle = moveNoteFolderFoldText(raw);
    var rows = [];
    var exact = false;

    if (select) {
        for (var i = 0; i < select.options.length; i += 1) {
            var option = select.options[i];
            // The empty option is "No folder" in the select; in this list it also says
            // where the note lands, since the row is a destination like the others
            var label = option.value === ''
                ? (window.t ? window.t('modals.move_note_folder.no_folder_root', null, 'No folder (move to root)') : 'No folder (move to root)')
                : (option.textContent || '');
            var folded = moveNoteFolderFoldText(label);
            if (needle && folded.indexOf(needle) === -1) continue;
            if (folded === needle) exact = true;
            rows.push({
                key: String(option.value),
                value: String(option.value),
                label: label,
                kind: option.value === '' ? 'none' : 'folder'
            });
        }
    }

    // A folder the user has already picked stays in the list whatever the filter says:
    // the Move button acts on it, so it may not become invisible
    var chosen = moveNoteFolderChoice() || '';
    if (chosen && !rows.some(function (row) { return row.value === chosen; })) {
        var option = findSelectOptionByValue(select, chosen);
        if (option) {
            rows.unshift({ key: chosen, value: chosen, label: option.textContent || '', kind: 'folder', pinned: true });
        }
    }

    // The folder the note is already in is not a target, so it is not in the list: do
    // not offer to create it either, its name is taken
    if (raw && !exact && moveNoteFolderTextIsCurrentFolder(needle)) {
        exact = true;
    }

    if (raw && !exact) {
        rows.push({ key: MOVE_NOTE_CREATE_KEY, value: null, label: raw, kind: 'create' });
    }

    return rows;
}

// Does the filter text name the folder the note is in? Its name and its full path
// both count, the list shows folders by path and the tree row gave only a name.
function moveNoteFolderTextIsCurrentFolder(folded) {
    var modal = document.getElementById('moveNoteFolderModal');
    if (!modal || !folded) return false;
    var names = [modal.dataset.currentFolderName || '', modal.dataset.currentFolderPath || ''];
    return names.some(function (name) {
        return name && moveNoteFolderFoldText(name) === folded;
    });
}

function renderMoveNoteFolderList() {
    var list = document.getElementById('moveNoteFolderList');
    var select = document.getElementById('moveNoteTargetSelect');
    if (!list || !select) return;

    var rows = moveNoteFolderRows();
    var selected = moveNoteFolderChoice();
    var filterInput = document.getElementById('moveNoteFolderFilter');
    var filterText = filterInput ? filterInput.value.trim() : '';

    // Keep the highlight where it was when the row survived the filter, otherwise put it
    // on the first row the filter actually matched, so Enter always has an obvious
    // target. The pinned row is the choice already made, never that target. With no
    // filter text, nothing is highlighted: an outlined row would read as a destination
    // already picked, and the dialog opens with none.
    var hasActive = rows.some(function (row) { return row.key === moveNoteFolderActiveKey; });
    if (!hasActive) {
        var first = filterText ? (rows.filter(function (row) { return !row.pinned; })[0] || rows[0]) : null;
        moveNoteFolderActiveKey = first ? first.key : null;
    }

    list.innerHTML = '';

    if (!rows.length) {
        var empty = document.createElement('div');
        empty.className = 'move-task-empty';
        var input = document.getElementById('moveNoteFolderFilter');
        var folded = moveNoteFolderFoldText(input ? input.value.trim() : '');
        if (moveNoteFolderTextIsCurrentFolder(folded)) {
            // The one folder the filter found is the one the note is already in
            var current = document.getElementById('moveNoteFolderCurrent');
            empty.textContent = current ? current.textContent : '';
        } else {
            empty.textContent = window.t
                ? window.t('modals.move_note_folder.no_match', null, 'No matching folder.')
                : 'No matching folder.';
        }
        list.appendChild(empty);
        return;
    }

    rows.forEach(function (row) {
        list.appendChild(buildMoveNoteFolderRow(row, selected));
    });
}

function buildMoveNoteFolderRow(row, selectedValue) {
    var item = document.createElement('button');
    item.type = 'button';
    item.className = 'move-task-item move-note-folder-item';
    item.dataset.rowKey = row.key;
    item.setAttribute('role', 'option');

    if (row.key === moveNoteFolderActiveKey) item.classList.add('is-active');

    var icon = document.createElement('i');

    if (row.kind === 'create') {
        item.classList.add('move-task-create');
        icon.className = 'lucide lucide-plus';
        item.appendChild(icon);

        var createLabel = document.createElement('span');
        createLabel.className = 'move-note-folder-path';
        createLabel.textContent = (window.t
            ? window.t('modals.move_note_folder.create_folder', null, 'Create folder')
            : 'Create folder') + ' "' + row.label + '"';
        item.appendChild(createLabel);
        item.setAttribute('aria-selected', 'false');

        item.addEventListener('click', function () {
            if (item.disabled) return;
            item.disabled = true;
            createMoveModalFolder(row.label, function (ok) {
                if (!ok) item.disabled = false;
            });
        });

        return item;
    }

    icon.className = row.kind === 'none' ? 'lucide lucide-folder-minus' : 'lucide lucide-folder';
    item.appendChild(icon);

    var path = document.createElement('span');
    path.className = 'move-note-folder-path';
    var parts = row.label.split('/');
    var leaf = parts.pop();
    if (parts.length) {
        // The parents of the folder, dimmed: the leaf is what the user is picking
        var parents = document.createElement('span');
        parents.className = 'move-note-folder-parents';
        parents.textContent = parts.join(' / ') + ' / ';
        path.appendChild(parents);
    }
    path.appendChild(document.createTextNode(leaf));
    item.appendChild(path);
    item.title = row.label;

    var isSelected = row.value === selectedValue;
    item.classList.toggle('selected', isSelected);
    item.setAttribute('aria-selected', isSelected ? 'true' : 'false');

    var check = document.createElement('i');
    check.className = 'lucide lucide-check move-note-folder-check';
    check.setAttribute('aria-hidden', 'true');
    item.appendChild(check);

    item.addEventListener('click', function () {
        moveNoteFolderActiveKey = row.key;
        selectMoveNoteFolder(row.value);
    });
    // A double click says the target twice: move the note without the Move button
    item.addEventListener('dblclick', function () {
        selectMoveNoteFolder(row.value);
        moveNoteToFolder();
    });

    return item;
}

function selectMoveNoteFolder(value) {
    var select = document.getElementById('moveNoteTargetSelect');
    if (!select) return;
    markMoveNoteFolderChosen();
    select.value = String(value === null || value === undefined ? '' : value);
    updateMoveButton(select.value || 'no-folder', true);
    // Repaints the recent-folder chips and this list
    syncMoveNoteRecentSelection(select.value);
}

// Arrow keys walk the list, Enter takes the row the highlight is on: on a folder it
// moves the note, on the create row it creates the folder (and selects it).
function onMoveNoteFolderFilterKeydown(e) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        var rows = moveNoteFolderRows();
        if (!rows.length) return;
        e.preventDefault();
        var index = rows.findIndex(function (row) { return row.key === moveNoteFolderActiveKey; });
        var step = e.key === 'ArrowDown' ? 1 : -1;
        if (index === -1) {
            index = step === 1 ? 0 : rows.length - 1;
        } else {
            index = (index + step + rows.length) % rows.length;
        }
        moveNoteFolderActiveKey = rows[index].key;
        renderMoveNoteFolderList();
        var active = document.querySelector('#moveNoteFolderList .move-note-folder-item.is-active');
        if (active && active.scrollIntoView) active.scrollIntoView({ block: 'nearest' });
        return;
    }

    if (e.key === 'Enter') {
        var active = document.querySelector('#moveNoteFolderList .move-note-folder-item.is-active');
        if (!active) return;
        e.preventDefault();
        active.click();
        if (!active.classList.contains('move-task-create')) {
            moveNoteToFolder();
        }
        return;
    }

    if (e.key === 'Escape') {
        var input = document.getElementById('moveNoteFolderFilter');
        if (input && input.value) {
            // Clear the filter first; a second Escape closes the dialog
            e.preventDefault();
            e.stopPropagation();
            resetMoveNoteFolderFilter();
        }
    }
}

(function setupMoveNoteFolderPicker() {
    function wire() {
        var input = document.getElementById('moveNoteFolderFilter');
        if (!input || input.dataset.pickerWired === 'true') return;
        input.dataset.pickerWired = 'true';

        input.addEventListener('input', function () {
            // A new filter text moves the highlight to the first row it leaves standing
            moveNoteFolderActiveKey = null;
            updateMoveNoteFolderFilterClear();
            renderMoveNoteFolderList();
        });
        input.addEventListener('keydown', onMoveNoteFolderFilterKeydown);

        var clear = document.getElementById('moveNoteFolderFilterClear');
        if (clear) {
            clear.addEventListener('click', function () {
                resetMoveNoteFolderFilter();
                input.focus();
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', wire);
    } else {
        wire();
    }
})();

window.renderMoveNoteFolderList = renderMoveNoteFolderList;
