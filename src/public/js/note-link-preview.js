// Preview of a linked note on hover (discussion 1711, comment by Marcel0586).
//
// Hovering a link to another Poznote note, in a note, opens after a short
// delay a floating window that shows the linked note, read only, resizable
// and scrollable: the reader looks at the detail without leaving the note
// they are in. Covers a rich text note, the preview of a Markdown note and
// its Live preview / Rich text views (a drawn link carries data-live-href
// there, it is not an <a>), and the tasks of a task list note.
//
// - Desktop only: a pointer that can hover (a touch screen has no hover, a
//   tap on the link opens the note, as before).
// - Movable by its title bar, closed by its X (Marcel0586, discussion 1792).
// - Read only: nothing in the window writes anywhere, and it lives on <body>,
//   outside .noteentry, so none of the editor's handlers reach it.
// - A link to one section (#1758) opens the window on that section.
// - A link inside the window opens a note in a new tab (an internal link) or
//   the page in a new browser tab, never a second preview.
// - Switched off by the Settings card "Note preview on link hover"
//   (note_link_preview, on by default), which index.php turns into the
//   body class note-link-preview-off.
(function () {
    'use strict';

    var OPEN_DELAY = 500;
    var CLOSE_DELAY = 300;
    var CACHE_TTL = 20000;
    var DEFAULT_SIZE = { width: 520, height: 420 };
    var MIN_SIZE = { width: 280, height: 160 };
    var GAP = 6;
    var EDGE = 8;
    var SIZE_STORAGE_KEY = 'note_link_preview_size';

    var popup = null;
    var titleEl = null;
    var bodyEl = null;

    // The link the pointer is on, and the one the window shows
    var hoverLink = null;
    var shownLink = null;
    var shownHref = '';
    var openTimer = null;
    var closeTimer = null;
    var pointerInPopup = false;
    // Set by a press inside the window (resize, scroll bar, text selection):
    // leaving it then no longer closes it, a click outside or Escape does
    var pinned = false;
    var renderToken = 0;
    // The reader dragged the window: it stays where they put it
    var movedByUser = false;
    // A drag that started on the title must not end as a click on it
    var swallowClick = false;
    var cache = new Map();
    var lastSavedSize = null;

    function tr(key, fallback) {
        return typeof window.t === 'function' ? window.t(key, null, fallback) : fallback;
    }

    function canHover() {
        return !!(window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches);
    }

    // ========================================================================
    // LINKS
    // ========================================================================

    function linkHref(link) {
        if (!link) return '';
        if (link.tagName === 'A') return link.getAttribute('href') || '';
        return link.getAttribute('data-live-href') || '';
    }

    // The note a link points at, or null for any other link
    function linkedNoteId(link) {
        if (!link || link.classList.contains('note-link-broken')) return null;
        var dataId = link.getAttribute('data-note-id');
        if (dataId && /^\d+$/.test(dataId)) return dataId;
        var href = linkHref(link);
        var match = /(?:^|\/)index\.php\?[^#\s]*\bnote=(\d+)\b|^\?[^#\s]*\bnote=(\d+)\b/.exec(href);
        return match ? (match[1] || match[2]) : null;
    }

    // An address the editor's own link handler understands
    function navigationHref(link, noteId) {
        var href = linkHref(link);
        if (/[?&]note=\d+/.test(href)) return href;
        return 'index.php?note=' + noteId;
    }

    function linkUnder(target) {
        var element = target && target.nodeType === 1 ? target : (target && target.parentElement);
        if (!element || !element.closest) return null;
        if (!element.closest('.noteentry')) return null;
        var link = element.closest('a[href], a[data-note-id], [data-live-href]');
        return link && linkedNoteId(link) ? link : null;
    }

    // ========================================================================
    // THE WINDOW
    // ========================================================================

    function readStoredSize() {
        try {
            var storage = window.__poznoteUserStorage || window.localStorage;
            var raw = storage.getItem(SIZE_STORAGE_KEY);
            if (!raw) return null;
            var size = JSON.parse(raw);
            if (size && size.width > 0 && size.height > 0) return { width: size.width, height: size.height };
        } catch (e) { /* private window or blocked storage: default size */ }
        return null;
    }

    function storeSize(size) {
        try {
            var storage = window.__poznoteUserStorage || window.localStorage;
            storage.setItem(SIZE_STORAGE_KEY, JSON.stringify(size));
        } catch (e) { /* the size is a convenience */ }
    }

    function clampSize(size) {
        var maxWidth = Math.max(MIN_SIZE.width, window.innerWidth - 2 * EDGE);
        var maxHeight = Math.max(MIN_SIZE.height, window.innerHeight - 2 * EDGE);
        return {
            width: Math.round(Math.min(maxWidth, Math.max(MIN_SIZE.width, size.width))),
            height: Math.round(Math.min(maxHeight, Math.max(MIN_SIZE.height, size.height)))
        };
    }

    function ensurePopup() {
        if (popup) return popup;

        popup = document.createElement('div');
        popup.className = 'note-link-preview';
        popup.setAttribute('role', 'dialog');
        popup.setAttribute('aria-hidden', 'true');

        var header = document.createElement('div');
        header.className = 'note-link-preview-header';
        titleEl = document.createElement('a');
        titleEl.className = 'note-link-preview-title';
        titleEl.href = '#';
        titleEl.title = tr('note_link_preview.open', 'Open in a new tab');
        // The title bar moves the window: no native link drag from it
        titleEl.draggable = false;
        header.appendChild(titleEl);

        var closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'note-link-preview-close';
        closeBtn.title = tr('common.close', 'Close');
        closeBtn.setAttribute('aria-label', closeBtn.title);
        closeBtn.innerHTML = '<i class="lucide lucide-x" aria-hidden="true"></i>';
        closeBtn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            close();
        });
        header.appendChild(closeBtn);
        setupDrag(header, closeBtn);

        bodyEl = document.createElement('div');
        bodyEl.className = 'note-link-preview-body';

        popup.appendChild(header);
        popup.appendChild(bodyEl);
        document.body.appendChild(popup);

        popup.addEventListener('pointerenter', function () {
            pointerInPopup = true;
            cancelClose();
        });
        popup.addEventListener('pointerleave', function () {
            pointerInPopup = false;
            if (!pinned) scheduleClose();
        });
        popup.addEventListener('pointerdown', function () {
            pinned = true;
            cancelClose();
        });
        // Capture: a resolved [[Title]] link carries its own click listener
        // (js/note-reference.js), which must not run here
        popup.addEventListener('click', onPopupClick, true);

        // A size the reader gives the window by its corner is kept for the
        // next one, in this browser
        if (typeof ResizeObserver === 'function') {
            var saveTimer = null;
            new ResizeObserver(function () {
                if (!popup.classList.contains('is-open')) return;
                clearTimeout(saveTimer);
                saveTimer = setTimeout(function () {
                    var size = { width: Math.round(popup.offsetWidth), height: Math.round(popup.offsetHeight) };
                    if (!size.width || !size.height) return;
                    if (lastSavedSize && lastSavedSize.width === size.width && lastSavedSize.height === size.height) return;
                    lastSavedSize = size;
                    storeSize(size);
                }, 300);
            }).observe(popup);
        }

        return popup;
    }

    // Dragging the window by its title bar (the title link included: a press
    // that does not move still opens the note, one that moves drags)
    function setupDrag(header, closeBtn) {
        var start = null;

        // Followed on the document while the button is down: the first move
        // of a quick drag already leaves the title bar
        function onMove(e) {
            if (!start || e.pointerId !== start.id) return;
            var dx = e.clientX - start.x;
            var dy = e.clientY - start.y;
            if (!start.dragging) {
                if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
                start.dragging = true;
                movedByUser = true;
                popup.classList.add('is-dragging');
            }
            e.preventDefault();
            var maxLeft = window.innerWidth - EDGE - popup.offsetWidth;
            var maxTop = window.innerHeight - EDGE - popup.offsetHeight;
            popup.style.left = Math.round(Math.max(EDGE, Math.min(maxLeft, start.left + dx))) + 'px';
            popup.style.top = Math.round(Math.max(EDGE, Math.min(maxTop, start.top + dy))) + 'px';
        }

        function onEnd(e) {
            if (!start || e.pointerId !== start.id) return;
            if (start.dragging) {
                // The click the browser builds from this press must not open
                // the note when the press started on the title
                swallowClick = true;
                setTimeout(function () { swallowClick = false; }, 0);
            }
            popup.classList.remove('is-dragging');
            start = null;
            document.removeEventListener('pointermove', onMove, true);
            document.removeEventListener('pointerup', onEnd, true);
            document.removeEventListener('pointercancel', onEnd, true);
        }

        header.addEventListener('pointerdown', function (e) {
            if (e.button !== 0 || closeBtn.contains(e.target)) return;
            var rect = popup.getBoundingClientRect();
            start = { x: e.clientX, y: e.clientY, left: rect.left, top: rect.top, id: e.pointerId, dragging: false };
            document.addEventListener('pointermove', onMove, true);
            document.addEventListener('pointerup', onEnd, true);
            document.addEventListener('pointercancel', onEnd, true);
        });
    }

    // Switched off in Settings (index.php sets the class on <body>)
    function isSwitchedOff() {
        return document.body.classList.contains('note-link-preview-off');
    }

    function place(link, fitHeight) {
        var size = clampSize(readStoredSize() || DEFAULT_SIZE);
        // A short note: the window is only as tall as what it shows. Not
        // stored, the size the reader gave stays the one asked for next time.
        if (fitHeight) size.height = Math.max(MIN_SIZE.height, Math.min(size.height, fitHeight));
        lastSavedSize = size;
        popup.style.width = size.width + 'px';
        popup.style.height = size.height + 'px';

        var rects = link.getClientRects();
        var rect = rects.length ? rects[0] : link.getBoundingClientRect();
        var viewportWidth = window.innerWidth;
        var viewportHeight = window.innerHeight;

        var top = rect.bottom + GAP;
        if (top + size.height > viewportHeight - EDGE) {
            var above = rect.top - GAP - size.height;
            top = above >= EDGE ? above : Math.max(EDGE, viewportHeight - EDGE - size.height);
        }
        var left = Math.min(Math.max(EDGE, rect.left), viewportWidth - EDGE - size.width);

        popup.style.top = Math.round(top) + 'px';
        popup.style.left = Math.round(Math.max(EDGE, left)) + 'px';
    }

    // The height the window needs to show all of its content
    function contentHeight() {
        var previous = popup.style.height;
        popup.style.height = 'auto';
        var natural = popup.offsetHeight;
        popup.style.height = previous;
        return Math.ceil(natural);
    }

    function close() {
        cancelOpen();
        cancelClose();
        renderToken++;
        pinned = false;
        pointerInPopup = false;
        shownLink = null;
        shownHref = '';
        movedByUser = false;
        if (!popup) return;
        popup.classList.remove('is-open');
        popup.setAttribute('aria-hidden', 'true');
        bodyEl.replaceChildren();
    }

    function cancelOpen() {
        clearTimeout(openTimer);
        openTimer = null;
    }

    function cancelClose() {
        clearTimeout(closeTimer);
        closeTimer = null;
    }

    function scheduleClose() {
        cancelClose();
        closeTimer = setTimeout(function () {
            closeTimer = null;
            if (pinned || pointerInPopup || (hoverLink && hoverLink === shownLink)) return;
            close();
        }, CLOSE_DELAY);
    }

    // ========================================================================
    // FETCHING
    // ========================================================================

    function fetchNote(noteId) {
        var cached = cache.get(noteId);
        if (cached && Date.now() - cached.at < CACHE_TTL) return cached.promise;

        var promise = fetch('/api/v1/notes/' + encodeURIComponent(noteId), {
            credentials: 'same-origin',
            headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }
        }).then(function (response) {
            return response.json().catch(function () { return {}; }).then(function (data) {
                if (response.ok && data && data.success && data.note) return { note: data.note };
                return { error: response.status === 404 ? 'not_found' : 'error' };
            });
        }).catch(function () {
            return { error: 'error' };
        });

        cache.set(noteId, { at: Date.now(), promise: promise });
        promise.then(function (result) {
            // A failure is not kept: the next hover asks again
            if (result.error) cache.delete(noteId);
        });
        return promise;
    }

    // ========================================================================
    // RENDERING
    // ========================================================================

    function message(text, kind) {
        var div = document.createElement('div');
        div.className = 'note-link-preview-message' + (kind ? ' is-' + kind : '');
        div.textContent = text;
        return div;
    }

    // The stored HTML of a rich text note, without anything that would run
    // or edit in this page. The server sanitizes every write already.
    function cleanHtml(html) {
        var doc = new DOMParser().parseFromString('<div>' + String(html || '') + '</div>', 'text/html');
        var root = doc.body.firstElementChild || doc.createElement('div');
        root.querySelectorAll('script, style, link, meta, base, object, embed, form, noscript, template').forEach(function (node) {
            node.remove();
        });
        root.querySelectorAll('*').forEach(function (node) {
            Array.prototype.slice.call(node.attributes).forEach(function (attribute) {
                var name = attribute.name.toLowerCase();
                if (name.indexOf('on') === 0 || name === 'contenteditable' || name === 'id' || name === 'draggable') {
                    node.removeAttribute(attribute.name);
                } else if ((name === 'href' || name === 'src' || name === 'xlink:href' || name === 'action')
                    && /^\s*(?:javascript|vbscript):/i.test(attribute.value)) {
                    node.removeAttribute(attribute.name);
                }
            });
        });
        root.querySelectorAll('input').forEach(function (input) {
            input.disabled = true;
        });
        var fragment = document.createDocumentFragment();
        // adoptNode moves the node out of the parsed document (importNode
        // would copy it and leave it there, and this loop would never end)
        while (root.firstChild) fragment.appendChild(document.adoptNode(root.firstChild));
        return fragment;
    }

    function renderTaskText(text) {
        var span = document.createElement('span');
        span.className = 'note-link-preview-task-text';
        var source = String(text || '');
        var pattern = /((?:https?:\/\/)[^\s"'<>]+)|(www\.[^\s"'<>]+)/ig;
        var last = 0;
        var match;
        while ((match = pattern.exec(source)) !== null) {
            if (match.index > last) span.appendChild(document.createTextNode(source.slice(last, match.index)));
            var link = document.createElement('a');
            link.href = /^https?:\/\//i.test(match[0]) ? match[0] : 'http://' + match[0];
            link.textContent = match[0];
            span.appendChild(link);
            last = match.index + match[0].length;
        }
        if (last < source.length) span.appendChild(document.createTextNode(source.slice(last)));
        return span;
    }

    function renderTaskRow(item, isSubtask) {
        var row = document.createElement('li');
        row.className = 'note-link-preview-task' + (item.completed ? ' is-done' : '') + (isSubtask ? ' is-subtask' : '');
        if (!isSubtask && !item.completed && window.poznoteTaskPriority) {
            var priority = window.poznoteTaskPriority.get(item);
            if (priority) row.classList.add('priority-' + priority);
        }
        var box = document.createElement('input');
        box.type = 'checkbox';
        box.disabled = true;
        box.checked = !!item.completed;
        box.tabIndex = -1;
        row.appendChild(box);
        row.appendChild(renderTaskText(item.text));

        if (!isSubtask && item.dueAt) {
            var date = new Date(item.dueAt);
            if (!isNaN(date.getTime())) {
                var due = document.createElement('span');
                due.className = 'note-link-preview-task-due';
                due.textContent = date.toLocaleDateString();
                row.appendChild(due);
            }
        }
        return row;
    }

    function renderTasklist(content) {
        var tasks = [];
        try {
            var parsed = JSON.parse(content || '[]');
            if (Array.isArray(parsed)) tasks = parsed;
            else if (parsed && Array.isArray(parsed.tasks)) tasks = parsed.tasks;
        } catch (e) {
            tasks = [];
        }
        tasks = tasks.filter(function (task) { return task && typeof task === 'object'; });
        if (!tasks.length) return null;

        var list = document.createElement('ul');
        list.className = 'note-link-preview-tasks';
        tasks.forEach(function (task) {
            list.appendChild(renderTaskRow(task, false));
            (Array.isArray(task.subtasks) ? task.subtasks : []).forEach(function (subtask) {
                if (subtask && typeof subtask === 'object') list.appendChild(renderTaskRow(subtask, true));
            });
        });
        return list;
    }

    function finishMarkdown(content, workspace) {
        if (typeof window.renderMathInElement === 'function') {
            try { window.renderMathInElement(content); } catch (e) { /* the formula stays as text */ }
        }
        if (typeof window.applySyntaxHighlighting === 'function') {
            try { window.applySyntaxHighlighting(content); } catch (e) { /* plain code */ }
        }
        if (typeof window.initMermaid === 'function' && content.querySelector('.mermaid')) {
            try { window.initMermaid(); } catch (e) { /* the diagram stays as source */ }
        }
        return resolveReferences(content, workspace);
    }

    // [[Title]] becomes a link to the note of that name, as in the note. One
    // that names no note stays plain text: the "create it" flow of a broken
    // link writes into the note it sits in, and there is none here.
    function resolveReferences(content, workspace) {
        if (typeof window.processNoteReferences !== 'function') return Promise.resolve();
        return Promise.resolve(window.processNoteReferences(content, workspace)).catch(function () {}).then(function () {
            content.querySelectorAll('.note-link-broken').forEach(function (broken) {
                var span = document.createElement('span');
                span.className = 'note-link-preview-missing';
                span.textContent = broken.textContent;
                broken.replaceWith(span);
            });
        });
    }

    function render(result, noteId, href) {
        bodyEl.replaceChildren();
        bodyEl.scrollTop = 0;

        if (result.error) {
            titleEl.textContent = '';
            titleEl.hidden = true;
            bodyEl.appendChild(message(result.error === 'not_found'
                ? tr('note_link_preview.not_found', 'This note does not exist, or it was deleted')
                : tr('note_link_preview.error', 'The preview could not be loaded'), 'error'));
            return Promise.resolve();
        }

        var note = result.note;
        var type = note.type || 'note';
        titleEl.hidden = false;
        titleEl.textContent = note.heading || tr('index.note.new_note', 'New note');
        titleEl.setAttribute('href', href);

        var content = document.createElement('div');
        content.className = 'note-link-preview-content is-' + type;
        var source = String(note.content || '');
        var done = Promise.resolve();

        if (type === 'tasklist') {
            var list = renderTasklist(source);
            if (!list) {
                bodyEl.appendChild(message(tr('note_link_preview.empty', 'This note is empty')));
                return done;
            }
            content.appendChild(list);
            bodyEl.appendChild(content);
            return done;
        }

        if (type === 'excalidraw') {
            bodyEl.appendChild(message(tr('note_link_preview.drawing', 'A drawing cannot be previewed here')));
            return done;
        }

        if (!source.trim()) {
            bodyEl.appendChild(message(tr('note_link_preview.empty', 'This note is empty')));
            return done;
        }

        if (type === 'markdown' && typeof window.parseMarkdown === 'function') {
            content.innerHTML = window.parseMarkdown(source);
            bodyEl.appendChild(content);
            done = finishMarkdown(content, note.workspace);
        } else {
            content.appendChild(cleanHtml(source));
            bodyEl.appendChild(content);
            if (typeof window.applySyntaxHighlighting === 'function') {
                try { window.applySyntaxHighlighting(content); } catch (e) { /* plain code */ }
            }
            done = resolveReferences(content, note.workspace);
        }

        return done;
    }

    // ========================================================================
    // SECTIONS (#1758)
    // ========================================================================

    function hashSlug(href) {
        var index = String(href).indexOf('#');
        if (index < 0) return '';
        var raw = String(href).slice(index + 1);
        if (!raw) return '';
        try { raw = decodeURIComponent(raw); } catch (e) { /* read as typed */ }
        var prefix = window.poznoteSectionHashPrefix || 'section-';
        if (raw.indexOf(prefix) === 0) return raw.slice(prefix.length);
        var idMatch = /^(?:md-)?heading-\d+-(.+)$/.exec(raw);
        return idMatch ? idMatch[1] : '';
    }

    function scrollToSection(href) {
        var slug = hashSlug(href);
        var panel = window.outlinePanel;
        if (!slug || !panel || typeof panel.assignSectionSlugs !== 'function') return;

        var headings = Array.prototype.map.call(
            bodyEl.querySelectorAll(panel.headingSelector || 'h1, h2, h3, h4, h5, h6'),
            function (element) { return { element: element, text: (element.textContent || '').trim() }; }
        );
        panel.assignSectionSlugs(headings);

        var bare = slug.replace(/-\d+$/, '');
        var target = headings.find(function (h) { return h.sectionSlug === slug; })
            || headings.find(function (h) { return h.sectionSlug === bare; });
        if (!target) return;

        var offset = target.element.getBoundingClientRect().top - bodyEl.getBoundingClientRect().top;
        bodyEl.scrollTop += offset - 8;
        target.element.classList.add('note-link-preview-section');
    }

    // ========================================================================
    // OPENING
    // ========================================================================

    function open(link) {
        var noteId = linkedNoteId(link);
        if (!noteId || !link.isConnected) return;
        if (isSwitchedOff()) return;
        ensurePopup();

        var href = navigationHref(link, noteId);
        var token = ++renderToken;
        shownLink = link;
        shownHref = href;
        movedByUser = false;

        place(link);
        titleEl.hidden = false;
        titleEl.textContent = '';
        bodyEl.replaceChildren(message(tr('note_link_preview.loading', 'Loading…'), 'loading'));
        popup.classList.add('is-open');
        popup.setAttribute('aria-hidden', 'false');

        fetchNote(noteId).then(function (result) {
            if (token !== renderToken) return;
            return render(result, noteId, href).then(function () {
                if (token !== renderToken || !link.isConnected) return;
                if (movedByUser) {
                    // Moved while it loaded: only the height follows the content
                    var size = clampSize(readStoredSize() || DEFAULT_SIZE);
                    var height = Math.max(MIN_SIZE.height, Math.min(size.height, contentHeight()));
                    lastSavedSize = { width: Math.round(popup.offsetWidth), height: height };
                    popup.style.height = height + 'px';
                } else {
                    place(link, contentHeight());
                }
                scrollToSection(href);
            });
        });
    }

    // ========================================================================
    // LINKS INSIDE THE WINDOW
    // ========================================================================

    function onPopupClick(e) {
        if (swallowClick) {
            swallowClick = false;
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        var link = e.target.closest && e.target.closest('a');
        if (!link || !popup.contains(link)) return;
        if (e.button !== 0) return;
        // Ctrl, Shift, Cmd: the browser's own choice for a real address
        if ((e.ctrlKey || e.metaKey || e.shiftKey) && link !== titleEl && !link.hasAttribute('data-note-id')) return;

        e.preventDefault();
        e.stopPropagation();

        var href = link === titleEl ? shownHref : (link.getAttribute('href') || '');
        var noteId = link === titleEl ? null : linkedNoteId(link);
        if (link === titleEl || noteId) {
            var target = link === titleEl ? href : navigationHref(link, noteId);
            close();
            if (typeof window.handleInternalNoteLink === 'function') {
                window.handleInternalNoteLink(target);
            } else if (typeof handleInternalNoteLink === 'function') {
                handleInternalNoteLink(target);
            }
            return;
        }

        if (!href || href === '#' || /^\s*(?:javascript|vbscript|data):/i.test(href)) return;
        window.open(link.href, '_blank', 'noopener');
    }

    // ========================================================================
    // EVENTS
    // ========================================================================

    function onPointerOver(e) {
        if (e.pointerType && e.pointerType !== 'mouse') return;
        if (popup && popup.contains(e.target)) return;
        var link = linkUnder(e.target);
        if (link === hoverLink) return;
        hoverLink = link;
        cancelOpen();

        if (!link) {
            if (shownLink && !pinned) scheduleClose();
            return;
        }
        if (!canHover() || e.buttons || isSwitchedOff()) return;
        if (link === shownLink) {
            cancelClose();
            return;
        }
        // A window the reader took hold of (moved, resized, clicked in)
        // stays on its note until its X or a click elsewhere
        if (pinned && shownLink) return;

        var noteId = linkedNoteId(link);
        // Asked for at once, shown after the delay
        fetchNote(noteId);
        openTimer = setTimeout(function () {
            openTimer = null;
            if (hoverLink !== link) return;
            pinned = false;
            open(link);
        }, OPEN_DELAY);
    }

    function onPointerOut(e) {
        if (!hoverLink) return;
        var to = e.relatedTarget;
        if (to && to.nodeType === 1 && hoverLink.contains(to)) return;
        hoverLink = null;
        cancelOpen();
        if (shownLink && !pinned) scheduleClose();
    }

    function onPointerDown(e) {
        if (popup && popup.contains(e.target)) return;
        cancelOpen();
        if (shownLink) close();
    }

    function onKeyDown(e) {
        if (!shownLink && !openTimer) return;
        if (popup && popup.contains(e.target) && e.key !== 'Escape') return;
        // Escape, or typing in the note: the window goes away
        close();
    }

    function onScroll(e) {
        if (!shownLink || pinned) return;
        if (popup && e.target && e.target.nodeType === 1 && popup.contains(e.target)) return;
        close();
    }

    function init() {
        document.addEventListener('pointerover', onPointerOver);
        document.addEventListener('pointerout', onPointerOut);
        document.addEventListener('pointerdown', onPointerDown, true);
        document.addEventListener('keydown', onKeyDown, true);
        document.addEventListener('scroll', onScroll, true);
        window.addEventListener('blur', function () {
            cancelOpen();
            if (shownLink && !pinned) close();
        });
        window.addEventListener('resize', function () {
            if (shownLink) close();
        });
    }

    window.poznoteNoteLinkPreview = { close: close };

    init();
})();
