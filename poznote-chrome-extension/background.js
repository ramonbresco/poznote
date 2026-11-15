/**
 * Background script for Poznote URL Saver extension
 * Handles API communication with Poznote backend, the right-click menu and
 * the keyboard shortcuts
 */

// The stored connection, t(), escapeHtml(), readPageText()... shared with the popup
importScripts('common.js');

/**
 * Message listener for extension communication
 * Routes messages to appropriate handler functions
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'loadFolders') {
    loadFolders(message.config)
      .then(sendResponse)
      .catch(err => sendResponse({ error: err.message }));
    return true; // Keep channel open for async response
  }

  if (message.type === 'createNote') {
    createNote(message.config, message.noteData)
      .then(sendResponse)
      .catch(err => sendResponse({ error: err.message }));
    return true;
  }

  if (message.type === 'listWorkspaces') {
    listWorkspaces(message.config)
      .then(sendResponse)
      .catch(err => sendResponse({ error: err.message }));
    return true;
  }

  if (message.type === 'searchNotes') {
    searchNotes(message.config, message.query, message.workspace)
      .then(sendResponse)
      .catch(err => sendResponse({ error: err.message }));
    return true;
  }

  if (message.type === 'appendToNote') {
    appendToNote(message.config, message.noteId, message.entry)
      .then(sendResponse)
      .catch(err => sendResponse({ error: err.message }));
    return true;
  }

  if (message.type === 'listTags') {
    listTags(message.config, message.workspace)
      .then(sendResponse)
      .catch(err => sendResponse({ error: err.message }));
    return true;
  }

  if (message.type === 'listProfiles') {
    listProfiles(message.config)
      .then(sendResponse)
      .catch(err => sendResponse({ error: err.message }));
    return true;
  }
});

/**
 * Build HTTP headers for API requests
 * Includes Basic Authentication and optional User ID
 * @param {Object} config - Configuration object with username, password, and optional userId
 * @returns {Object} Headers object for fetch requests
 */
function getHeaders(config) {
  const headers = {
    'Authorization': 'Basic ' + btoa(`${config.username}:${config.password}`),
    // Poznote records where a change came from, so the Information dialog of
    // a note can name the extension rather than just "the API".
    'X-Poznote-Client': 'extension'
  };
  
  if (config.userId) {
    headers['X-User-ID'] = config.userId;
  }
  
  return headers;
}

/**
 * fetch() for the Poznote API. The Authorization header is the whole
 * identity: the browser must not add the cookie of a Poznote tab signed in
 * next door, or the server would see two identities on one request
 * (issue #1650).
 * @param {string} url
 * @param {RequestInit} [options]
 * @returns {Promise<Response>}
 */
function apiFetch(url, options = {}) {
  return fetch(url, { credentials: 'omit', ...options });
}

/**
 * Fetch list of user profiles from Poznote
 * @param {Object} config - Configuration object with appUrl, username, and password
 * @returns {Promise<Array>} Array of user profile objects
 */
async function listProfiles(config) {
  const url = `${config.appUrl}/api/v1/users/profiles`;
  const response = await apiFetch(url, {
    headers: {
      'Authorization': 'Basic ' + btoa(`${config.username}:${config.password}`)
    }
  });

  if (!response.ok) {
    throw new Error(t('errorStatus', [String(response.status), response.statusText]));
  }
  
  return await response.json();
}

/**
 * Fetch list of workspaces from Poznote
 * @param {Object} config - Configuration object
 * @returns {Promise<Array>} Array of workspace objects
 */
async function listWorkspaces(config) {
  const url = `${config.appUrl}/api/v1/workspaces`;
  const response = await apiFetch(url, {
    headers: getHeaders(config)
  });

  if (!response.ok) {
    throw new Error(t('errorStatus', [String(response.status), response.statusText]));
  }
  
  const data = await response.json();
  return data.workspaces || data;
}

/**
 * Fetch folders from a specific workspace
 * @param {Object} config - Configuration object with workspace name
 * @returns {Promise<Array>} Array of folder objects with hierarchical structure
 */
async function loadFolders(config) {
  const workspace = config.workspace || 'Poznote';
  const url = `${config.appUrl}/api/v1/folders?workspace=${encodeURIComponent(workspace)}`;
  const response = await apiFetch(url, {
    headers: getHeaders(config)
  });

  if (!response.ok) {
    throw new Error(t('errorStatus', [String(response.status), response.statusText]));
  }
  
  const data = await response.json();
  return data.folders || data;
}

/**
 * Create a new note in Poznote
 * @param {Object} config - Configuration object
 * @param {Object} noteData - heading, entry (see buildHtmlEntry), tags, workspace and folder_id
 * @returns {Promise<Object>} Created note object
 */
async function createNote(config, noteData) {
  const url = `${config.appUrl}/api/v1/notes`;
  const response = await apiFetch(url, {
    method: 'POST',
    headers: {
      ...getHeaders(config),
      'Content-Type': 'application/json'
    },
    // The text of a page is saved as Markdown, what discussion #1760 asked for;
    // a link or a screenshot stays an HTML note, as before
    body: JSON.stringify({
      heading: noteData.heading,
      ...(noteData.entry.clip
        ? { type: 'markdown', content: buildMarkdownEntry(noteData.entry, '') }
        : { content: buildHtmlEntry(noteData.entry) }),
      tags: noteData.tags || '',
      workspace: noteData.workspace,
      ...(noteData.folder_id ? { folder_id: Number(noteData.folder_id) } : {})
    })
  });

  if (!response.ok) {
    throw await apiError(response);
  }

  return await response.json();
}

/**
 * Every tag already used in a workspace, for the suggestions of the tags field
 * @param {Object} config - Configuration object
 * @param {string} workspace - Workspace whose tags are listed
 * @returns {Promise<Array<string>>}
 */
async function listTags(config, workspace) {
  const params = new URLSearchParams();
  if (workspace) {
    params.set('workspace', workspace);
  }
  const response = await apiFetch(`${config.appUrl}/api/v1/tags?${params}`, {
    headers: getHeaders(config)
  });
  if (!response.ok) {
    throw await apiError(response);
  }
  const data = await response.json();
  return Array.isArray(data.tags) ? data.tags : [];
}

/**
 * Build an Error from a failed API response, with the server's message when it sent one
 * @param {Response} response - The failed fetch response
 * @returns {Promise<Error>}
 */
async function apiError(response) {
  const text = await response.text();
  let errorMsg = t('errorStatus', [String(response.status), response.statusText]);
  try {
    const errorJson = JSON.parse(text);
    if (errorJson.error || errorJson.message) {
      errorMsg += ` – ${errorJson.error || errorJson.message}`;
    }
  } catch (e) {
    if (text && text.length < 300) {
      errorMsg += ` – ${text}`;
    }
  }
  return new Error(errorMsg);
}

/**
 * Notes a page can be appended to: HTML and Markdown notes, most recently
 * modified first. An empty query lists the latest ones.
 * @param {Object} config - Configuration object
 * @param {string} query - Words to find in the title or content
 * @param {string} workspace - Workspace to search, empty for all of them
 * @returns {Promise<Array>} Notes with id, heading, type, workspace and folder
 */
async function searchNotes(config, query, workspace) {
  const params = new URLSearchParams({ sort: 'updated_desc', limit: '40' });
  if (query) {
    params.set('search', query);
  }
  if (workspace) {
    params.set('workspace', workspace);
  }
  const response = await apiFetch(`${config.appUrl}/api/v1/notes?${params}`, {
    headers: getHeaders(config)
  });

  if (!response.ok) {
    throw await apiError(response);
  }

  const data = await response.json();
  const notes = Array.isArray(data.notes) ? data.notes : [];
  return notes
    .filter(note => note.type === 'note' || note.type === 'markdown')
    .slice(0, 20)
    .map(note => ({
      id: note.id,
      heading: note.heading || t('untitled'),
      type: note.type,
      workspace: note.workspace,
      folder: note.folder || ''
    }));
}

/**
 * Store a data: image as an attachment of the note
 * @param {Object} config - Configuration object
 * @param {number} noteId - Note receiving the attachment
 * @param {string} dataUrl - The image as a data: URL
 * @param {string} fileName - Name given to the attachment
 * @returns {Promise<string>} Address of the attachment, as Markdown notes reference it
 */
async function uploadImageAttachment(config, noteId, dataUrl, fileName) {
  const blob = await (await fetch(dataUrl)).blob();
  const form = new FormData();
  form.append('file', blob, fileName);
  const response = await apiFetch(`${config.appUrl}/api/v1/notes/${noteId}/attachments`, {
    method: 'POST',
    headers: getHeaders(config),
    body: form
  });

  if (!response.ok) {
    throw await apiError(response);
  }

  const data = await response.json();
  if (!data.attachment_id) {
    throw new Error(data.message || t('uploadFailed'));
  }
  return `/api/v1/notes/${noteId}/attachments/${data.attachment_id}`;
}

/**
 * Add a saved page at the end of an existing note.
 * The note is read, the entry is written in its format (HTML or Markdown) and
 * the new content is sent with if_version, so an edit made in the meantime is
 * never overwritten: on a 409 the entry is added to the content the server
 * returned and the write is tried again.
 * @param {Object} config - Configuration object
 * @param {number} noteId - Target note
 * @param {Object} entry - { url, screenshot: dataUrl|null, clip: {markdown, html}|null, savedAt }
 * @returns {Promise<Object>} The note's id and heading
 */
async function appendToNote(config, noteId, entry) {
  const response = await apiFetch(`${config.appUrl}/api/v1/notes/${noteId}`, {
    headers: getHeaders(config)
  });

  if (!response.ok) {
    throw await apiError(response);
  }

  const { note } = await response.json();
  if (note.type !== 'note' && note.type !== 'markdown') {
    throw new Error(t('unsupportedNoteType'));
  }

  let block;
  if (note.type === 'markdown') {
    // Markdown has no room for a data: image, so a screenshot or a saved
    // image becomes an attachment first; an image left on its site keeps its address
    const picture = entryPicture(entry);
    let pictureSrc = '';
    if (picture) {
      pictureSrc = picture.src.startsWith('data:')
        ? await uploadImageAttachment(config, noteId, picture.src, picture.fileName)
        : picture.src;
    }
    block = buildMarkdownEntry(entry, pictureSrc);
  } else {
    // The server turns data: images of an HTML note into attachments by itself
    block = buildHtmlEntry(entry);
  }

  let content = note.content || '';
  let version = note.version;
  for (let attempt = 0; attempt < 3; attempt++) {
    const merged = note.type === 'markdown'
      ? (content.replace(/\s+$/, '') ? content.replace(/\s+$/, '') + '\n\n' : '') + block + '\n'
      : content + block;

    const patch = await apiFetch(`${config.appUrl}/api/v1/notes/${noteId}`, {
      method: 'PATCH',
      headers: {
        ...getHeaders(config),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ content: merged, if_version: version })
    });

    if (patch.ok) {
      return { id: note.id, heading: note.heading };
    }

    if (patch.status !== 409) {
      throw await apiError(patch);
    }

    // Edited in the meantime: add the entry to the latest content instead
    const conflict = await patch.json();
    const current = conflict.current;
    if (!current || typeof current.content !== 'string' || !current.version) {
      throw new Error(t('noteChanged'));
    }
    content = current.content;
    version = current.version;
  }

  throw new Error(t('noteKeepsChanging'));
}

/**
 * One saved page in an HTML note: its address as a link and, for a
 * screenshot, an empty line then the picture. For the text of the page, the
 * address carries the date it was saved, then an empty line and the text.
 */
function buildHtmlEntry(entry) {
  const url = escapeHtml(entry.url);
  if (entry.clip) {
    const when = entry.savedAt ? ` · ${escapeHtml(entry.savedAt)}` : '';
    // The server sanitizes the page's markup like any other HTML it receives
    return `<p><a href="${url}" target="_blank">${url}</a>${when}</p><p><br></p>${entry.clip.html}`;
  }
  let html = `<p><a href="${url}" target="_blank">${url}</a></p>`;
  const picture = entryPicture(entry);
  if (picture) {
    html += `<p><br></p><p><img src="${escapeHtml(picture.src)}" alt="${escapeHtml(picture.alt)}" style="max-width: 100%; height: auto;" /></p>`;
  }
  return html;
}

/**
 * The picture an entry carries: a screenshot of the page, an image saved from
 * the right-click menu (a data: URL), or, when its bytes could not be read,
 * the image's own address. null for a plain link or a text clip.
 */
function entryPicture(entry) {
  if (entry.screenshot) {
    return { src: entry.screenshot, alt: t('pageScreenshot'), fileName: 'screenshot.png' };
  }
  if (entry.image) {
    const match = entry.image.match(/^data:image\/(png|jpeg|gif|webp)/);
    const extension = match ? match[1].replace('jpeg', 'jpg') : 'png';
    return { src: entry.image, alt: t('image'), fileName: `image.${extension}` };
  }
  if (entry.imageUrl) {
    return { src: entry.imageUrl, alt: t('image') };
  }
  return null;
}

/**
 * An address Poznote's Markdown parser reads as one link target: it ends a
 * link at the first ")" and has no <url> form
 */
function markdownTarget(url) {
  return url.replace(/[\s()<>]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0'));
}

/**
 * The same entry in Markdown
 */
function buildMarkdownEntry(entry, pictureSrc) {
  const label = entry.url.replace(/([\\[\]])/g, '\\$1');
  let md = `[${label}](${markdownTarget(entry.url)})`;
  if (entry.clip) {
    return md + (entry.savedAt ? ` · ${entry.savedAt}` : '') + '\n\n' + entry.clip.markdown;
  }
  const picture = entryPicture(entry);
  if (picture && pictureSrc) {
    md += `\n\n<br>\n\n![${picture.alt}](${markdownTarget(pictureSrc)})`;
  }
  return md;
}

// --- Right-click menu and keyboard shortcuts ---------------------------------
//
// Both save without opening the popup, to the destination the popup was last
// left on: the note picked under "Existing note" when that tab was the one
// in use, a new note in the workspace and folder of the settings otherwise.
// The outcome shows on the extension's icon: a badge, and the message in its
// tooltip.

const MENU_ITEMS = [
  { id: 'save-selection', contexts: ['selection'], title: 'menuSaveSelection' },
  { id: 'save-link', contexts: ['link'], title: 'menuSaveLink' },
  { id: 'save-image', contexts: ['image'], title: 'menuSaveImage' },
  { id: 'save-page', contexts: ['page'], title: 'menuSavePage' },
  { id: 'save-page-text', contexts: ['page'], title: 'menuSavePageText' }
];

const MENU_KINDS = {
  'save-selection': 'text',
  'save-page-text': 'text',
  'save-link': 'link',
  'save-image': 'image',
  'save-page': 'page'
};

/**
 * Menu entries live as long as the extension; they are rebuilt on install,
 * on update and when Chrome starts, so a new browser language reaches them.
 */
function createMenus() {
  chrome.contextMenus.removeAll(() => {
    MENU_ITEMS.forEach(item => chrome.contextMenus.create({
      id: item.id,
      title: t(item.title),
      contexts: item.contexts,
      documentUrlPatterns: ['http://*/*', 'https://*/*', 'file:///*']
    }));
  });
}

chrome.runtime.onInstalled.addListener(createMenus);
chrome.runtime.onStartup.addListener(createMenus);

chrome.contextMenus.onClicked.addListener((info, tab) => {
  const kind = MENU_KINDS[info.menuItemId];
  if (kind && tab && tab.id >= 0) {
    quickSave(tab, kind, info);
  }
});

chrome.commands.onCommand.addListener(async (command, tab) => {
  const kind = { 'save-link': 'page', 'save-text': 'text' }[command];
  if (!kind) {
    return;
  }
  if (!tab) {
    [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  }
  if (tab && tab.id >= 0) {
    quickSave(tab, kind, {});
  }
});

const BADGES = {
  busy: { text: '…', color: '#6b7280' },
  success: { text: '✓', color: '#15803d' },
  error: { text: '!', color: '#b42318' }
};
const badgeTimers = new Map();

/**
 * Show where a save stands on the extension's icon, for this tab only.
 * A success clears itself after a few seconds, an error stays a little longer
 * so its tooltip can be read.
 */
function flagTab(tabId, state, message) {
  const badge = BADGES[state];
  clearTimeout(badgeTimers.get(tabId));
  chrome.action.setBadgeBackgroundColor({ tabId, color: badge.color }).catch(() => {});
  if (chrome.action.setBadgeTextColor) {
    chrome.action.setBadgeTextColor({ tabId, color: '#ffffff' }).catch(() => {});
  }
  chrome.action.setBadgeText({ tabId, text: badge.text }).catch(() => {});
  chrome.action.setTitle({ tabId, title: message ? `Poznote: ${message}` : t('extName') }).catch(() => {});
  if (state !== 'busy') {
    badgeTimers.set(tabId, setTimeout(() => {
      badgeTimers.delete(tabId);
      chrome.action.setBadgeText({ tabId, text: '' }).catch(() => {});
      chrome.action.setTitle({ tabId, title: t('extName') }).catch(() => {});
    }, state === 'error' ? 10000 : 4000));
  }
}

/**
 * The bytes of an image of the page, read from inside the page so the site's
 * cookies and same-origin rules apply, as a data: URL. An image the page
 * cannot read (another site that does not allow it, too large, not a format
 * every browser shows) keeps its address instead, and the note shows it from
 * its site.
 */
async function readImage(tabId, frameId, srcUrl) {
  if (/^data:image\/(png|jpeg|gif|webp);/.test(srcUrl)) {
    return { image: srcUrl };
  }
  if (!/^https?:/.test(srcUrl || '')) {
    throw new Error(t('imageCannotBeSaved'));
  }
  try {
    const [frame] = await chrome.scripting.executeScript({
      target: { tabId, frameIds: [frameId || 0] },
      args: [srcUrl],
      func: async (src) => {
        const response = await fetch(src);
        if (!response.ok) {
          return null;
        }
        const blob = await response.blob();
        if (!/^image\/(png|jpeg|gif|webp)$/.test(blob.type) || blob.size > 10 * 1024 * 1024) {
          return null;
        }
        return await new Promise(resolve => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(blob);
        });
      }
    });
    if (frame && typeof frame.result === 'string') {
      return { image: frame.result };
    }
  } catch (e) {
    // Blocked by the site: keep the address
  }
  return { imageUrl: srcUrl };
}

/**
 * Save from the right-click menu or a keyboard shortcut.
 * @param {chrome.tabs.Tab} tab - The tab the menu or the shortcut was used in
 * @param {string} kind - 'page' (its link), 'link', 'image' or 'text' (the selection, else the page text)
 * @param {Object} info - The menu's click data (linkUrl, srcUrl, frameId...), empty for a shortcut
 */
async function quickSave(tab, kind, info) {
  const config = await loadConfig();
  if (!isConnected(config) || !(await hasHostPermission(config.appUrl))) {
    flagTab(tab.id, 'error', t('connectFirst'));
    chrome.runtime.openOptionsPage();
    return;
  }

  const pageUrl = info.pageUrl || tab.url || '';
  if (!/^https?:|^file:/.test(pageUrl)) {
    flagTab(tab.id, 'error', t('pageCannotBeSaved'));
    return;
  }

  flagTab(tab.id, 'busy', t('saving'));
  try {
    const entry = { url: pageUrl, screenshot: null, clip: null };
    let heading = tab.title || t('untitledPage');

    if (kind === 'link') {
      entry.url = info.linkUrl;
      heading = info.linkUrl;
    } else if (kind === 'image') {
      Object.assign(entry, await readImage(tab.id, info.frameId, info.srcUrl));
    } else if (kind === 'text') {
      let clip = null;
      try {
        clip = await readPageText(tab.id, info.frameId);
      } catch (error) {
        console.error(error);
        throw new Error(t('pageTextFailed'));
      }
      if (!clip || !clip.markdown) {
        throw new Error(t('noTextFound'));
      }
      entry.clip = clip;
      entry.savedAt = savedAtNow();
    }

    const { poznoteAppend } = await chrome.storage.local.get(['poznoteAppend']);
    const target = poznoteAppend && poznoteAppend.mode === 'append' ? poznoteAppend.note : null;
    if (target && target.id) {
      const note = await appendToNote(config, target.id, entry);
      flagTab(tab.id, 'success', t('addedTo', [note.heading]));
      return;
    }

    await createNote(config, {
      heading: `🌐 ${heading}`,
      entry,
      workspace: config.workspace || 'Poznote',
      folder_id: config.folder_id || ''
    });
    flagTab(tab.id, 'success', t('noteCreated'));
  } catch (error) {
    flagTab(tab.id, 'error', error.message);
  }
}
