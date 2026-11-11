/**
 * Backlinks panel
 *
 * Displays, below the current note, every other note that links to it,
 * using the same row layout as the attachments row.
 *
 * Detection is performed server-side (BacklinksController).  Three formats
 * are supported:
 *   1. HTML internal-link attribute  — data-note-id="{id}"
 *   2. URL-based link                — ?note={id}
 *   3. Wiki-link syntax              — [[Note Title]]
 *
 * Notes of other workspaces that link here are listed too, labelled with
 * their workspace (except on a read-only public workspace).
 *
 * The row unfolds (discussion #1761): a chevron on it opens, underneath, the
 * text around every link, one line per link written. The row answers "who
 * cites me", unfolding it answers "why". The passages are never grouped
 * under the name of the note that wrote them, which the row already shows
 * one line above; they cost a request of their own (context=1), made only
 * once the reader unfolds the row, so opening a note costs exactly what it
 * did before.
 *
 * Open or folded is remembered in this browser, not in the note: reading
 * context is not editing, and it must never change a note's modified date
 * (the same rule as the toggle blocks and the folded code blocks).
 */
(function () {
    'use strict';

    /* --------------------------------------------------------------------- */
    /* Helpers                                                                 */
    /* --------------------------------------------------------------------- */

    /** Safely escape text for HTML insertion. */
    function esc(text) {
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(String(text)));
        return div.innerHTML;
    }

    /** Return the data-note-id of the first visible .noteentry element. */
    function getActiveNoteId() {
        var entry = document.querySelector('.noteentry[data-note-id]');
        return entry ? entry.getAttribute('data-note-id') : null;
    }

    /** Remove any existing backlinks row and mentions block from the DOM. */
    function removePanel() {
        ['backlinks-row', 'backlinks-mentions'].forEach(function (id) {
            var existing = document.getElementById(id);
            if (existing) {
                existing.remove();
            }
        });
    }

    function getWorkspaceName() {
        if (typeof window.getSelectedWorkspace === 'function') {
            return window.getSelectedWorkspace();
        }

        if (typeof selectedWorkspace !== 'undefined' && selectedWorkspace) {
            return selectedWorkspace;
        }

        return window.selectedWorkspace || '';
    }

    /**
     * @param context '' for the plain list, 'check' to also learn whether any
     *        link has text worth quoting, '1' for the passages themselves.
     */
    function buildBacklinksUrl(noteId, context) {
        var url = '/api/v1/notes/' + encodeURIComponent(noteId) + '/backlinks';
        var params = new URLSearchParams();
        var workspace = getWorkspaceName();

        if (workspace) {
            params.set('workspace', workspace);
        }

        // Ignored by the server in a workspace shared with this login
        params.set('all_workspaces', '1');

        if (context) {
            params.set('context', context);
        }

        var query = params.toString();
        return query ? url + '?' + query : url;
    }

    /* --------------------------------------------------------------------- */
    /* Helpers                                                                 */
    /* --------------------------------------------------------------------- */

    function tr(key, fallback, vars) {
        if (typeof window.t === 'function') {
            return window.t(key, vars || null, fallback);
        }
        var text = fallback;
        if (vars) {
            Object.keys(vars).forEach(function (name) {
                text = text.replace('{{' + name + '}}', String(vars[name]));
            });
        }
        return text;
    }

    /* --------------------------------------------------------------------- */
    /* Rendering                                                               */
    /* --------------------------------------------------------------------- */

    /**
     * An <a> opening the note that wrote the link, used by the row and by the
     * mentions block: both lead to the same place and must navigate the same
     * way. A note of another workspace opens with a page load in its own
     * workspace, the AJAX loader only working within the current one.
     */
    function createSourceLink(link, className) {
        var currentWorkspace = getWorkspaceName();
        var ws = (typeof selectedWorkspace !== 'undefined') ? selectedWorkspace : '';
        var otherWorkspace = link.workspace && currentWorkspace && link.workspace !== currentWorkspace
            ? link.workspace : '';
        var href = otherWorkspace
            ? 'index.php?workspace=' + encodeURIComponent(otherWorkspace) + '&note=' + encodeURIComponent(link.id)
            : (typeof window.buildNoteNavigationUrl === 'function')
                ? window.buildNoteNavigationUrl(link.id, ws)
                : 'index.php?note=' + encodeURIComponent(link.id) +
                    (ws ? '&workspace=' + encodeURIComponent(ws) : '');

        var a = document.createElement('a');
        a.href = href;
        a.className = className;
        a.setAttribute('data-note-id', link.id);
        a.textContent = link.heading;
        if (otherWorkspace) {
            var wsLabel = document.createElement('span');
            wsLabel.className = 'backlink-workspace';
            wsLabel.textContent = otherWorkspace;
            a.appendChild(wsLabel);
            a.title = otherWorkspace + ' / ' + link.heading;
        }

        /* Use AJAX navigation when available */
        a.addEventListener('click', function (e) {
            e.preventDefault();
            if (!otherWorkspace && typeof window.loadNoteDirectly === 'function') {
                window.loadNoteDirectly(href, String(link.id), e, a);
            } else {
                window.location.href = href;
            }
        });

        return a;
    }

    /**
     * Build and inject the backlinks row immediately after .note-attachments-row,
     * mirroring the exact markup/class pattern of that row.
     * Falls back to inserting before the note title (<h4>) if the attachments
     * row is absent (notes with no attachments at all).
     * Does nothing if there are no backlinks.
     */
    function renderPanel(backlinks) {
        removePanel();

        var noteEntry = document.querySelector('.noteentry');
        if (!noteEntry) return;

        // Tasklist notes always get the row: its first link leads to the
        // global tasks page where this list's tasks are aggregated
        var isTasklist = noteEntry.getAttribute('data-note-type') === 'tasklist';

        if (backlinks.length === 0 && !isTasklist) {
            return;
        }

        // Mirror the exact same positioning logic as attachment previews
        var atBottom = !!(window.POZNOTE_CONFIG && window.POZNOTE_CONFIG.backlinksAtBottom);
        var anchor = atBottom
            ? noteEntry.nextElementSibling
            : ((noteEntry.parentNode && noteEntry.parentNode.querySelector('.note-title-heading')) || noteEntry);
        // A link the server found nothing quotable around (a bare URL in a
        // drawing, a link that is an image) must not put a chevron on the row:
        // unfolding it would open on an apology.
        var quotable = backlinks.some(function (link) { return link.has_mentions; });

        var row = buildRow(backlinks, isTasklist, quotable);
        noteEntry.parentNode.insertBefore(row, anchor);

        if (quotable) {
            var body = document.createElement('div');
            body.id = 'backlinks-mentions';
            body.className = 'backlinks-mentions';
            noteEntry.parentNode.insertBefore(body, anchor);

            var toggle = row.querySelector('.backlinks-mentions-toggle');
            toggle.addEventListener('click', function () {
                setMentionsOpen(toggle, body, !isMentionsOpen(toggle));
            });
            // Always folded when a note opens, never remembered: the passages
            // are something the reader asks for, note by note, and a row that
            // unfolds itself on every note would just be the old long list.
            setMentionsOpen(toggle, body, false);
        }
    }

    /**
     * The compact row: every linking note as a chip, on one scrolling line,
     * with the chevron that unfolds the passages under it.
     *
     * Mirrors the markup and the classes of .note-attachments-row exactly,
     * the chevron apart.
     */
    function buildRow(backlinks, isTasklist, quotable) {
        var iconBtn = document.createElement('span');
        iconBtn.className = 'icon-backlinks-btn';
        iconBtn.innerHTML = '<i class="lucide lucide-link icon_backlinks" aria-hidden="true"></i>';

        var list = document.createElement('span');
        list.className = 'backlinks-links-list';

        if (isTasklist) {
            var workspace = getWorkspaceName();
            var tasksLink = document.createElement('a');
            tasksLink.href = 'tasks.php' + (workspace ? '?workspace=' + encodeURIComponent(workspace) : '');
            tasksLink.className = 'backlink-link backlink-tasks-page';
            tasksLink.textContent = (window.t ? window.t('tasks_page.title', null, 'Tasks') : 'Tasks');
            list.appendChild(tasksLink);
        }

        backlinks.forEach(function (link) {
            list.appendChild(createSourceLink(link, 'backlink-link'));
        });

        var row = document.createElement('div');
        row.id = 'backlinks-row';
        row.className = 'backlinks-row';
        row.appendChild(iconBtn);
        if (quotable) {
            row.appendChild(buildMentionsToggle());
        }
        row.appendChild(list);
        return row;
    }

    function buildMentionsToggle() {
        var toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'backlinks-mentions-toggle';
        var icon = document.createElement('i');
        icon.className = 'lucide lucide-chevron-right';
        icon.setAttribute('aria-hidden', 'true');
        toggle.appendChild(icon);
        return toggle;
    }

    /* --------------------------------------------------------------------- */
    /* Mentions block                                                          */
    /* --------------------------------------------------------------------- */

    function isMentionsOpen(toggle) {
        return toggle.getAttribute('aria-expanded') === 'true';
    }

    function setMentionsOpen(toggle, body, open) {
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        toggle.querySelector('i').className = 'lucide ' + (open ? 'lucide-chevron-down' : 'lucide-chevron-right');
        var label = open
            ? tr('backlinks.mentions.hide', 'Hide the text around each link')
            : tr('backlinks.mentions.show', 'Show the text around each link');
        toggle.title = label;
        toggle.setAttribute('aria-label', label);
        body.hidden = !open;

        if (open && body.getAttribute('data-filled') !== '1') {
            loadMentions(body);
        }
    }

    /** Fetch the passages, once per note shown. */
    function loadMentions(body) {
        var noteId = getActiveNoteId();
        if (!noteId) {
            return;
        }
        body.setAttribute('data-filled', '1');
        body.textContent = tr('common.loading', 'Loading...');

        fetch(buildBacklinksUrl(noteId, '1'), {
            method: 'GET',
            credentials: 'same-origin',
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        })
        .then(function (response) {
            return response.ok ? response.json() : null;
        })
        .then(function (data) {
            if (!data || !data.success) {
                throw new Error('backlinks context unavailable');
            }
            fillMentions(body, data.backlinks || []);
        })
        .catch(function () {
            // Let the reader try again rather than leave the row unfolded on
            // nothing
            body.removeAttribute('data-filled');
            body.textContent = tr('backlinks.mentions.failed', 'Could not load the context.');
        });
    }

    /**
     * The passages, in the order of the chips above: all of the first note's,
     * then the next one's. The name of the note that wrote them is never
     * repeated here, it is on the row one line up; the tooltip of a line
     * gives it back, with the whole passage.
     */
    function fillMentions(body, backlinks) {
        body.textContent = '';

        backlinks.forEach(function (link) {
            (Array.isArray(link.mentions) ? link.mentions : []).forEach(function (mention) {
                body.appendChild(createMentionLine(mention, link));
            });
        });

        // Every linking note had something the server could not quote: a bare
        // URL in a drawing, a link that is an image. Unfolding the row has to
        // say something rather than open on nothing.
        if (!body.firstChild) {
            var none = document.createElement('p');
            none.className = 'backlinks-mention-empty';
            none.textContent = tr('backlinks.mentions.no_context', 'No text to show around these links.');
            body.appendChild(none);
        }
    }

    /**
     * One quoted passage: the name of the note that wrote it, then the
     * passage, on a single line that the browser cuts with an ellipsis at
     * whatever width the note has. No "show more": a list of one-liners is
     * read in one sweep, which a list of unfoldable paragraphs is not. The
     * whole line is a link to that note, so a passage is never a dead end,
     * and its tooltip quotes it whole.
     */
    function createMentionLine(mention, link) {
        var line = createSourceLink(link, 'backlinks-mention');
        line.textContent = '';

        var name = document.createElement('span');
        name.className = 'backlinks-mention-note';
        name.textContent = link.heading || '';
        line.appendChild(name);

        var separator = document.createElement('span');
        separator.className = 'backlinks-mention-separator';
        separator.textContent = ' - ';
        line.appendChild(separator);

        var text = document.createElement('span');
        text.className = 'backlinks-mention-text';
        paintSnippet(text, mention.preview || '', mention.label || '');
        line.appendChild(text);

        var tip = link.heading || '';
        if (link.workspace && link.workspace !== getWorkspaceName()) {
            tip = link.workspace + ' / ' + tip;
        }
        if (mention.text && mention.text !== mention.preview) {
            tip += '\n' + mention.text;
        }
        line.title = tip;

        return line;
    }

    /**
     * The snippet as text nodes, with the text of the link itself marked.
     *
     * Never innerHTML: a snippet is the plain text of another note, and the
     * markup it was cut from has no business being parsed again out here.
     * The label is located by text rather than by offset, which keeps PHP's
     * characters and JavaScript's code units out of the question.
     */
    function paintSnippet(el, snippet, label) {
        el.textContent = '';
        var at = label ? snippet.indexOf(label) : -1;
        if (at === -1) {
            el.textContent = snippet;
            return;
        }
        el.appendChild(document.createTextNode(snippet.slice(0, at)));
        var mark = document.createElement('mark');
        mark.className = 'backlinks-mention-match';
        mark.textContent = label;
        el.appendChild(mark);
        el.appendChild(document.createTextNode(snippet.slice(at + label.length)));
    }

    /* --------------------------------------------------------------------- */
    /* Data fetching                                                           */
    /* --------------------------------------------------------------------- */

    function loadBacklinks(noteId) {
        removePanel();

        // 'check' rather than nothing: the row has to know, before drawing
        // the chevron, whether unfolding it would show anything at all
        fetch(buildBacklinksUrl(noteId, 'check'), {
            method: 'GET',
            credentials: 'same-origin',
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        })
        .then(function (response) {
            return response.ok ? response.json() : null;
        })
        .then(function (data) {
            if (data && data.success) {
                renderPanel(data.backlinks || []);
            }
        })
        .catch(function () {
            /* Backlinks are non-critical — fail silently */
        });
    }

    /* --------------------------------------------------------------------- */
    /* Public API                                                              */
    /* --------------------------------------------------------------------- */

    /**
     * (Re-)initialise the backlinks row for the currently displayed note.
     * Called on initial page load and after each AJAX note load.
     */
    function initBacklinksPanel() {
        var noteId = getActiveNoteId();
        if (noteId) {
            loadBacklinks(noteId);
        }
    }

    window.initBacklinksPanel = initBacklinksPanel;

    /* Initial page load: note content is server-rendered */
    document.addEventListener('DOMContentLoaded', function () {
        initBacklinksPanel();
    });

}());
