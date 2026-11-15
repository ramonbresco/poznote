document.addEventListener('DOMContentLoaded', async () => {
  localizePage();
  const $ = id => document.getElementById(id);
  const connectView = $('connectView');
  const mainView = $('mainView');
  const status = $('status');
  const modeNewBtn = $('modeNew');
  const modeAppendBtn = $('modeAppend');
  const newPanel = $('newPanel');
  const appendPanel = $('appendPanel');
  const noteSearch = $('noteSearch');
  const noteResults = $('noteResults');
  const allWorkspacesToggle = $('allWorkspaces');
  const saveNoteBtn = $('saveNote');
  const saveScreenshotBtn = $('saveScreenshot');
  const saveTextBtn = $('saveText');
  const noteTitle = $('noteTitle');
  const noteTags = $('noteTags');
  const tagSuggestions = $('tagSuggestions');
  const destWorkspace = $('destWorkspace');
  const destFolder = $('destFolder');

  let config = null;
  let tab = null;
  let saveMode = 'new';
  let targetNote = null;
  let allWorkspaces = false;
  // Workspace that new notes go to, the only one listed outside "All workspaces"
  const destinationWorkspace = () => (config && config.workspace) || 'Poznote';
  let searchTimer = null;
  let searchRequest = 0;

  // Connecting happens on the settings page, in a tab: a permission prompt
  // opened from the popup would close it halfway through.
  const openSettings = () => {
    chrome.runtime.openOptionsPage();
    window.close();
  };
  $('openSettings').addEventListener('click', openSettings);
  $('connectBtn').addEventListener('click', openSettings);

  const ICONS = { success: 'i-success', error: 'i-alert' };

  /**
   * Show a message under the buttons. type: 'loading', 'success', 'error'
   * link: optional { href, label } appended to the message
   */
  function showStatus(message, type, link) {
    status.hidden = false;
    status.className = 'message ' + (type === 'loading' ? 'info' : type);
    status.replaceChildren();

    if (type === 'loading') {
      const spinner = document.createElement('span');
      spinner.className = 'spinner';
      status.appendChild(spinner);
    } else {
      status.insertAdjacentHTML('beforeend', `<svg class="icon"><use href="#${ICONS[type] || 'i-alert'}"/></svg>`);
    }

    const text = document.createElement('span');
    text.textContent = message;
    if (link) {
      const a = document.createElement('a');
      a.href = link.href;
      a.textContent = link.label;
      a.target = '_blank';
      text.append(' ', a);
    }
    status.appendChild(text);
  }

  function setBusy(button, busy) {
    saveNoteBtn.disabled = busy;
    saveScreenshotBtn.disabled = busy;
    saveTextBtn.disabled = busy;
    button.classList.toggle('busy', busy);
  }

  // --- Connection -----------------------------------------------------------

  config = await loadConfig();
  if (!isConnected(config) || !(await hasHostPermission(config.appUrl))) {
    if (config && config.appUrl) {
      $('connectText').textContent = t('lostAccessText');
      $('connectBtn').textContent = t('reconnect');
    }
    connectView.hidden = false;
    return;
  }

  // The stored address keeps the scheme typed at connection time, so the
  // instance opens over http or https the way it was set up (#1654)
  const hostLink = $('hostLabel');
  hostLink.textContent = new URL(config.appUrl).host;
  hostLink.href = config.appUrl + '/';
  hostLink.title = t('openPoznoteTitle', [config.username, config.appUrl]);
  hostLink.hidden = false;
  hostLink.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: hostLink.href });
    window.close();
  });
  mainView.hidden = false;

  [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  refreshTextButton();
  // The title a new note gets, which can be changed before saving
  noteTitle.value = `🌐 ${(tab && tab.title) || t('untitledPage')}`;

  // --- Where a new note goes ------------------------------------------------
  //
  // The same setting as the settings page: what is picked here is where the
  // next new notes go, from the popup, the right-click menu or a shortcut.

  let knownTags = [];

  async function loadTags() {
    const response = await chrome.runtime.sendMessage({ type: 'listTags', config, workspace: destinationWorkspace() });
    knownTags = Array.isArray(response) ? response : [];
    suggestTags();
  }

  /**
   * The suggestions complete the tag being typed: each one is the text before
   * it, then a known tag not used yet in the field
   */
  function suggestTags() {
    const value = noteTags.value;
    const cut = Math.max(value.lastIndexOf(','), value.lastIndexOf(' '));
    const before = value.slice(0, cut + 1);
    const typed = value.slice(cut + 1).trim().toLowerCase();
    const used = new Set(before.split(/[,\s]+/).map(tag => tag.toLowerCase()).filter(Boolean));
    const options = knownTags
      .filter(tag => !used.has(tag.toLowerCase()) && tag.toLowerCase().startsWith(typed))
      .slice(0, 50)
      .map(tag => {
        const option = document.createElement('option');
        option.value = before + (before && !/\s$/.test(before) ? ' ' : '') + tag;
        return option;
      });
    tagSuggestions.replaceChildren(...options);
  }

  noteTags.addEventListener('input', suggestTags);

  async function loadFolders() {
    destFolder.replaceChildren(new Option(t('loading'), ''));
    destFolder.disabled = true;
    const response = await chrome.runtime.sendMessage({ type: 'loadFolders', config });
    destFolder.disabled = false;

    const options = [new Option(t('noFolder'), '')];
    if (!response.error) {
      flattenFolders(response).forEach(folder => {
        const option = new Option(folder.path, folder.id);
        option.dataset.path = folder.path;
        options.push(option);
      });
    } else if (config.folder_id) {
      // Unreachable: keep showing the saved folder
      const option = new Option(config.folder, config.folder_id);
      option.dataset.path = config.folder;
      options.push(option);
    }
    destFolder.replaceChildren(...options);
    destFolder.value = String(config.folder_id || '');
    if (destFolder.value !== String(config.folder_id || '')) {
      destFolder.value = '';
    }
  }

  async function loadDestination() {
    const response = await chrome.runtime.sendMessage({ type: 'listWorkspaces', config });
    const names = !response.error && Array.isArray(response)
      ? response.map(ws => ws.name || ws).filter(Boolean)
      : [];
    if (!names.length) {
      names.push(destinationWorkspace());
    }
    if (!names.includes(destinationWorkspace())) {
      // The saved workspace was deleted or renamed
      config.workspace = names[0];
      config.folder = '';
      config.folder_id = '';
      await storeConfig(config);
    }
    destWorkspace.replaceChildren(...names.map(name => new Option(name, name)));
    destWorkspace.value = destinationWorkspace();
    destWorkspace.hidden = names.length < 2;
    await Promise.all([loadFolders(), loadTags()]);
  }

  destWorkspace.addEventListener('change', async () => {
    config.workspace = destWorkspace.value;
    config.folder = '';
    config.folder_id = '';
    await storeConfig(config);
    dropHiddenTarget();
    rememberAppend();
    await Promise.all([loadFolders(), loadTags()]);
  });

  destFolder.addEventListener('change', async () => {
    const option = destFolder.options[destFolder.selectedIndex];
    config.folder_id = destFolder.value;
    config.folder = destFolder.value ? (option.dataset.path || option.text) : '';
    await storeConfig(config);
  });

  loadDestination();

  // --- New note or existing note --------------------------------------------

  /**
   * The choice and the picked note are kept for the next time the popup opens.
   */
  function setSaveMode(mode, remember = true) {
    saveMode = mode === 'append' ? 'append' : 'new';
    modeNewBtn.setAttribute('aria-selected', String(saveMode === 'new'));
    modeAppendBtn.setAttribute('aria-selected', String(saveMode === 'append'));
    newPanel.hidden = saveMode !== 'new';
    appendPanel.hidden = saveMode !== 'append';
    status.hidden = true;
    if (remember) {
      rememberAppend();
    }
    if (saveMode === 'append') {
      searchNotes(noteSearch.value.trim());
      noteSearch.focus();
    }
  }

  // The mode, the picked note and the workspace scope are kept for the next time the popup opens
  function rememberAppend() {
    chrome.storage.local.set({ poznoteAppend: { mode: saveMode, note: targetNote, allWorkspaces } });
  }

  function selectTargetNote(note) {
    targetNote = { id: note.id, heading: note.heading, type: note.type, workspace: note.workspace, folder: note.folder };
    rememberAppend();
    noteResults.querySelectorAll('li[data-id]').forEach(li => {
      const selected = Number(li.dataset.id) === targetNote.id;
      li.classList.toggle('selected', selected);
      li.setAttribute('aria-selected', String(selected));
    });
    status.hidden = true;
  }

  function placeholder(text) {
    const li = document.createElement('li');
    li.className = 'placeholder';
    li.textContent = text;
    noteResults.replaceChildren(li);
  }

  function noteItem(note) {
    const li = document.createElement('li');
    li.tabIndex = 0;
    li.dataset.id = note.id;
    li.setAttribute('role', 'option');
    li.title = note.heading;
    const selected = Boolean(targetNote && targetNote.id === note.id);
    li.classList.toggle('selected', selected);
    li.setAttribute('aria-selected', String(selected));

    const type = document.createElement('span');
    type.className = 'note-type';
    type.innerHTML = note.type === 'markdown'
      ? '<span class="md-badge">MD</span>'
      : '<svg class="icon"><use href="#i-file"/></svg>';

    const text = document.createElement('span');
    text.className = 'note-text';
    const heading = document.createElement('span');
    heading.className = 'note-heading';
    heading.textContent = note.heading;
    const place = document.createElement('span');
    place.className = 'note-place';
    place.textContent = [note.workspace, note.folder].filter(Boolean).join(' / ');
    text.append(heading, place);

    const check = document.createElement('span');
    check.className = 'note-check';
    check.innerHTML = '<svg class="icon"><use href="#i-check"/></svg>';

    li.append(type, text, check);
    li.addEventListener('click', () => selectTargetNote(note));
    li.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        selectTargetNote(note);
      } else if (e.key === 'ArrowDown' && li.nextElementSibling) {
        e.preventDefault();
        li.nextElementSibling.focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        (li.previousElementSibling || noteSearch).focus();
      }
    });
    return li;
  }

  /**
   * List the notes a page can be added to, the latest ones when the query is
   * empty. The picked note stays on top of that default list.
   */
  async function searchNotes(query) {
    const request = ++searchRequest;
    if (!noteResults.children.length) {
      placeholder(t('loadingNotes'));
    }
    const response = await chrome.runtime.sendMessage({
      type: 'searchNotes',
      config,
      query,
      workspace: allWorkspaces ? '' : destinationWorkspace()
    });
    if (request !== searchRequest) {
      return; // A newer search was started meanwhile
    }
    if (response.error) {
      placeholder(t('notesLoadFailed'));
      showStatus(response.error, 'error');
      return;
    }

    let notes = response;
    if (!query && targetNote && !notes.some(note => note.id === targetNote.id)) {
      notes = [targetNote, ...notes];
    }
    if (!notes.length) {
      placeholder(t(query ? 'noNoteMatches' : 'noNoteYet'));
      return;
    }
    noteResults.replaceChildren(...notes.map(noteItem));
  }

  modeNewBtn.addEventListener('click', () => setSaveMode('new'));
  modeAppendBtn.addEventListener('click', () => setSaveMode('append'));
  noteSearch.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => searchNotes(noteSearch.value.trim()), 250);
  });
  noteSearch.addEventListener('keydown', (e) => {
    const first = noteResults.querySelector('li[data-id]');
    if (e.key === 'ArrowDown' && first) {
      e.preventDefault();
      first.focus();
    }
  });

  /**
   * Outside "All workspaces", a note of another workspace cannot stay the
   * target: it would receive pages without being shown in the list.
   */
  function dropHiddenTarget() {
    if (!allWorkspaces && targetNote && targetNote.workspace && targetNote.workspace !== destinationWorkspace()) {
      targetNote = null;
    }
  }

  allWorkspacesToggle.addEventListener('change', () => {
    allWorkspaces = allWorkspacesToggle.checked;
    dropHiddenTarget();
    rememberAppend();
    searchNotes(noteSearch.value.trim());
  });

  const { poznoteAppend } = await chrome.storage.local.get(['poznoteAppend']);
  targetNote = (poznoteAppend && poznoteAppend.note) || null;
  allWorkspaces = Boolean(poznoteAppend && poznoteAppend.allWorkspaces);
  allWorkspacesToggle.checked = allWorkspaces;
  dropHiddenTarget();
  setSaveMode(poznoteAppend ? poznoteAppend.mode : 'new', false);

  // --- Saving ---------------------------------------------------------------

  saveNoteBtn.addEventListener('click', () => saveToNote('url', saveNoteBtn));
  saveScreenshotBtn.addEventListener('click', () => saveToNote('screenshot', saveScreenshotBtn));
  saveTextBtn.addEventListener('click', () => saveToNote('text', saveTextBtn));

  /**
   * "Save selection" when text is selected in the page, "Save page text"
   * otherwise. Opening the popup leaves the page's selection in place, so
   * what the label says is what the click saves. A page the extension cannot
   * read (chrome://, the Web Store) keeps the default label and says so on click.
   */
  async function refreshTextButton() {
    let selected = false;
    try {
      const [frame] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const selection = window.getSelection();
          return Boolean(selection && !selection.isCollapsed && String(selection).trim());
        }
      });
      selected = Boolean(frame && frame.result);
    } catch (e) {
      selected = false;
    }
    $('saveTextLabel').textContent = t(selected ? 'saveSelection' : 'savePageText');
    saveTextBtn.title = t(selected ? 'saveSelectionTitle' : 'savePageTextTitle');
    $('saveTextIcon').setAttribute('href', selected ? '#i-text-select' : '#i-text');
  }

  /**
   * Save current page to Poznote, as a new note or at the end of the picked one
   * @param {string} contentType - 'url', 'screenshot' or 'text'
   * @param {HTMLElement} button - The button that was clicked
   */
  async function saveToNote(contentType, button) {
    if (!tab || !/^https?:|^file:/.test(tab.url || '')) {
      showStatus(t('pageCannotBeSaved'), 'error');
      return;
    }
    if (saveMode === 'append' && !targetNote) {
      showStatus(t('pickNote'), 'error');
      noteSearch.focus();
      return;
    }

    setBusy(button, true);
    try {
      const entry = { url: tab.url, screenshot: null, clip: null };
      if (contentType === 'text') {
        showStatus(t('readingPage'), 'loading');
        try {
          entry.clip = await readPageText(tab.id);
        } catch (error) {
          showStatus(t('pageTextFailed'), 'error');
          console.error(error);
          return;
        }
        if (!entry.clip || !entry.clip.markdown) {
          showStatus(t('noTextFound'), 'error');
          return;
        }
        entry.savedAt = savedAtNow();
      }
      if (contentType === 'screenshot') {
        showStatus(t('capturing'), 'loading');
        try {
          entry.screenshot = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
        } catch (error) {
          showStatus(t('screenshotFailed', [error.message]), 'error');
          return;
        }
      }

      if (saveMode === 'append') {
        showStatus(t('addingTo', [targetNote.heading]), 'loading');
        const response = await chrome.runtime.sendMessage({
          type: 'appendToNote',
          config,
          noteId: targetNote.id,
          entry
        });
        if (response.error) {
          showStatus(response.error, 'error');
          return;
        }
        if (response.heading && response.heading !== targetNote.heading) {
          selectTargetNote({ ...targetNote, heading: response.heading });
        }
        showStatus(t('addedTo', [response.heading]), 'success', { href: noteUrl(config, response.id), label: t('open') });
        return;
      }

      showStatus(t('creatingNote'), 'loading');
      const response = await chrome.runtime.sendMessage({
        type: 'createNote',
        config,
        noteData: {
          heading: noteTitle.value.trim() || `🌐 ${tab.title || t('untitledPage')}`,
          entry,
          tags: noteTags.value.trim(),
          workspace: config.workspace || 'Poznote',
          folder_id: config.folder_id || ''
        }
      });
      if (response.error) {
        showStatus(response.error, 'error');
        return;
      }
      const created = response.note || response;
      showStatus(t('noteCreated'), 'success', created.id ? { href: noteUrl(config, created.id), label: t('open') } : null);
    } catch (error) {
      showStatus(error.message, 'error');
      console.error(error);
    } finally {
      setBusy(button, false);
    }
  }
});
