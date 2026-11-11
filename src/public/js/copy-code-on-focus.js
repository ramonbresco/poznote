/* copy-code-on-focus.js
   Adds copy buttons to code blocks and provides clipboard functionality.
*/
(function () {
    'use strict';

    var COPY_ICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
    var CHECK_ICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
    var DELETE_ICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>';

    // Gutter toggle: a "list with numbers" glyph, shown struck through when the
    // block currently hides its line numbers. The glyphs of the buttons in a
    // block's corner are all drawn across the same 18 to 20 units of their
    // 24-unit box as the copy and bin icons, so the row reads as one size
    // (Lucide's list-ordered and chevrons only fill 12 to 17 of them).
    var LINE_NUMBERS_ICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="10" y1="4" x2="21" y2="4"></line><line x1="10" y1="12" x2="21" y2="12"></line><line x1="10" y1="20" x2="21" y2="20"></line><path d="M4 4h1v6"></path><path d="M4 10h2"></path><path d="M6.5 20H3.5c0-1.4 3-2.4 3-4s-1.6-2-3-1.2"></path></svg>';
    var LINE_NUMBERS_OFF_ICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="10" y1="4" x2="21" y2="4"></line><line x1="10" y1="12" x2="21" y2="12"></line><line x1="10" y1="20" x2="21" y2="20"></line><path d="M4 4h1v6"></path><path d="M4 10h2"></path><path d="M6.5 20H3.5c0-1.4 3-2.4 3-4s-1.6-2-3-1.2"></path><line x1="2" y1="22" x2="22" y2="2"></line></svg>';

    // Wrap toggle: lines of text with a return arrow, struck through when the
    // block currently lets its long lines run off to the side.
    var WRAP_ICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="4" x2="21" y2="4"></line><path d="M3 11.5h14.5a4.25 4.25 0 0 1 0 8.5H13"></path><polyline points="15.5 17.5 13 20 15.5 22.5"></polyline><line x1="3" y1="20" x2="9" y2="20"></line></svg>';
    var WRAP_OFF_ICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="4" x2="21" y2="4"></line><path d="M3 11.5h14.5a4.25 4.25 0 0 1 0 8.5H13"></path><polyline points="15.5 17.5 13 20 15.5 22.5"></polyline><line x1="3" y1="20" x2="9" y2="20"></line><line x1="2" y1="22" x2="22" y2="2"></line></svg>';

    function tl(key, fallback) {
        return window.t ? window.t(key, {}, fallback) : fallback;
    }

    function getPreForBlock(block) {
        if (!block) return null;
        if (block.tagName === 'PRE') return block;
        return block.closest ? block.closest('pre') : null;
    }

    /**
     * Current gutter state for a block: the per-block data-line-numbers
     * override when present, otherwise the global code_block_line_numbers
     * setting carried by the body class.
     */
    // ---- Folding a code block ------------------------------------------
    //
    // A long listing makes a note long for no reason, so each block can be
    // folded to its badge. data-collapsed lives on the PRE: in an HTML note
    // it is part of the stored content, so the block opens folded next time
    // (lib/html-sanitize.php keeps the attribute); a Markdown note's preview
    // is redrawn from the source, which has nowhere to carry it, so the
    // choice goes to the same per-note store as the line numbers below.
    var COLLAPSE_ICON_OPEN = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m4 16 8-8 8 8"/></svg>';
    var COLLAPSE_ICON_CLOSED = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m4 8 8 8 8-8"/></svg>';
    var MARKDOWN_COLLAPSED_KEY = 'markdown_code_collapsed';

    // How many lines a folded block keeps on screen: the account's choice
    // (code_block_collapsed_lines), written on <body> by index.php together
    // with the --pz-code-collapsed-lines the stylesheet reads. A page that
    // carries nothing, such as a public share, keeps the same 5 as the token
    // (css/tokens.css). 0 means a folded block shows none of its code.
    function collapsedPreviewLines() {
        var raw = document.body ? document.body.getAttribute('data-code-collapsed-lines') : null;
        var lines = parseInt(raw, 10);
        return (isFinite(lines) && lines >= 0) ? lines : 5;
    }

    // Folding a block no longer than that would hide nothing, so the chevron
    // is not offered. With the setting at 0 (a folded block shows none of its
    // code) every block can be folded, however short.
    function canCollapseCodeBlock(block) {
        var lines = collapsedPreviewLines();
        return lines === 0 || codeBlockLineCount(block) > lines;
    }

    function isCodeBlockCollapsed(block) {
        var pre = getPreForBlock(block);
        return !!(pre && pre.getAttribute('data-collapsed') === '1');
    }

    function codeBlockLineCount(block) {
        var pre = getPreForBlock(block);
        if (!pre) return 0;
        var code = pre.querySelector('code') || pre;
        var text = (code.textContent || '').replace(/\n+$/, '');
        return text === '' ? 0 : text.split('\n').length;
    }

    // The number of folded lines, shown next to the chevron. Decoration like
    // the buttons around it: it lives in the action host, which is unwrapped
    // before the note is stored (stripSearchHighlights in js/notes.js).
    function paintCollapsedSummary(host, block, collapsed) {
        if (!host) return;
        var summary = host.querySelector('.code-block-collapsed-summary');
        if (!collapsed) {
            if (summary) summary.remove();
            layoutCodeBlockActions(host);
            return;
        }
        if (!summary) {
            summary = document.createElement('span');
            summary.className = 'code-block-collapsed-summary';
            summary.setAttribute('contenteditable', 'false');
            host.insertBefore(summary, host.firstChild);
        }
        var lines = codeBlockLineCount(block);
        layoutCodeBlockActions(host);
        summary.textContent = lines === 1
            ? tl('editor.code_block_collapse.one_line', '1 line')
            : tl('editor.code_block_collapse.lines', '{{count}} lines', { count: lines })
                .replace('{{count}}', String(lines));
    }

    function setCollapseButtonState(btn, collapsed) {
        var label = collapsed
            ? tl('editor.code_block_collapse.expand', 'Expand the code block')
            : tl('editor.code_block_collapse.collapse', 'Collapse the code block');
        btn.innerHTML = collapsed ? COLLAPSE_ICON_CLOSED : COLLAPSE_ICON_OPEN;
        btn.setAttribute('aria-label', label);
        btn.setAttribute('title', label);
        btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    }

    function toggleCodeBlockCollapsed(block) {
        var pre = getPreForBlock(block);
        if (!pre) return false;

        var next = !isCodeBlockCollapsed(pre);
        pre.setAttribute('data-collapsed', next ? '1' : '0');
        storeCollapsedChoice(pre, next);
        return next;
    }

    function areLineNumbersVisible(block) {
        var pre = getPreForBlock(block);
        if (pre && pre.hasAttribute('data-line-numbers')) {
            return pre.getAttribute('data-line-numbers') === '1';
        }
        return !!(document.body && document.body.classList.contains('code-block-line-numbers'));
    }

    function setLineNumbersButtonState(btn, visible) {
        var label = visible
            ? tl('editor.code_block_line_numbers.hide', 'Hide line numbers')
            : tl('editor.code_block_line_numbers.show', 'Show line numbers');
        btn.innerHTML = visible ? LINE_NUMBERS_ICON_SVG : LINE_NUMBERS_OFF_ICON_SVG;
        btn.setAttribute('aria-label', label);
        btn.setAttribute('title', label);
        btn.setAttribute('aria-pressed', visible ? 'true' : 'false');
    }

    // The preview of a Markdown note is redrawn from the source, which holds
    // no such choice: it is kept in the browser instead, per note, a block
    // being known by its rank among the note's code blocks. Same store as the
    // live editor's (build/markdown-editor/src/live-preview.js), so the two
    // views of a note agree.
    var MARKDOWN_LINE_NUMBERS_KEY = 'markdown_code_line_numbers';

    function readStoredMarkdownLineNumbers() {
        try {
            var storage = window.__poznoteUserStorage || window.localStorage;
            var parsed = JSON.parse(storage.getItem(MARKDOWN_LINE_NUMBERS_KEY) || '{}');
            return parsed && typeof parsed === 'object' ? parsed : {};
        } catch (e) {
            return {};
        }
    }

    // The code blocks of a store root, in the order their rank counts them
    function codeBlockStoreBlocks(root) {
        return Array.prototype.filter.call(root.querySelectorAll('pre'), function (pre) {
            return !!pre.querySelector('code');
        });
    }

    // The note a store root belongs to, which both stores are keyed by
    function codeBlockStoreNoteId(root) {
        var entry = root.closest ? root.closest('.noteentry') : null;
        var id = entry ? (entry.getAttribute('data-note-id') || String(entry.id || '').replace(/^entry/, '')) : '';
        return /^\d+$/.test(id) ? id : '';
    }

    /**
     * Where a block's rank is counted from: the preview of a Markdown note,
     * so that the rank is the one the editor's own views store for the same
     * block (build/markdown-editor/src/live-preview.js), and the note itself
     * for an HTML note. A page with no note of ours (a public share) has no
     * root, so nothing is kept there and a fold lasts the visit.
     */
    function codeBlockStoreRoot(pre) {
        if (!pre || !pre.closest) return null;
        return pre.closest('.markdown-preview') || pre.closest('.noteentry');
    }

    function storeMarkdownPreviewLineNumbers(pre, visible) {
        var preview = pre.closest ? pre.closest('.markdown-preview') : null;
        if (!preview) return;
        var noteId = codeBlockStoreNoteId(preview);
        var rank = codeBlockStoreBlocks(preview).indexOf(pre);
        if (!noteId || rank === -1) return;
        try {
            var all = readStoredMarkdownLineNumbers();
            var note = all[noteId] && typeof all[noteId] === 'object' ? all[noteId] : {};
            note[rank] = visible ? 1 : 0;
            delete all[noteId];
            all[noteId] = note;
            var ids = Object.keys(all);
            ids.slice(0, Math.max(0, ids.length - 300)).forEach(function (id) { delete all[id]; });
            (window.__poznoteUserStorage || window.localStorage).setItem(MARKDOWN_LINE_NUMBERS_KEY, JSON.stringify(all));
        } catch (e) {
            // (private mode, full storage: the choice lasts until the next redraw)
        }
    }

    // Which blocks of a note are folded, kept in the browser like the line
    // numbers right above. Folding is a reading gesture: it must survive a
    // refresh without touching the note, so it changes neither its
    // modification date nor what the next save stores (the same reason the
    // toggles of a note keep their state here, js/toggle-block.js). It is
    // kept for every kind of note, not only a Markdown preview: an HTML note
    // writes data-collapsed in its content too, but only a save sends that to
    // the server, and nothing is saved for a fold.
    function readStoredBlockChoices(key) {
        try {
            var storage = window.__poznoteUserStorage || window.localStorage;
            var parsed = JSON.parse(storage.getItem(key) || '{}');
            return parsed && typeof parsed === 'object' ? parsed : {};
        } catch (e) {
            return {};
        }
    }

    function storeBlockChoice(key, pre, on) {
        var root = codeBlockStoreRoot(pre);
        if (!root) return;
        var noteId = codeBlockStoreNoteId(root);
        var rank = codeBlockStoreBlocks(root).indexOf(pre);
        if (!noteId || rank === -1) return;
        try {
            var all = readStoredBlockChoices(key);
            var note = all[noteId] && typeof all[noteId] === 'object' ? all[noteId] : {};
            note[rank] = on ? 1 : 0;
            delete all[noteId];
            all[noteId] = note;
            var ids = Object.keys(all);
            ids.slice(0, Math.max(0, ids.length - 300)).forEach(function (id) { delete all[id]; });
            (window.__poznoteUserStorage || window.localStorage).setItem(key, JSON.stringify(all));
        } catch (e) {
            // (private mode, full storage: the choice lasts until the next redraw)
        }
    }

    // What this browser last chose for a block: true, false, or null when
    // nothing was ever chosen for it
    function storedBlockChoice(key, pre) {
        var root = codeBlockStoreRoot(pre);
        if (!root) return null;
        var noteId = codeBlockStoreNoteId(root);
        if (!noteId) return null;
        var note = readStoredBlockChoices(key)[noteId];
        if (!note || typeof note !== 'object') return null;
        var rank = codeBlockStoreBlocks(root).indexOf(pre);
        if (rank === -1 || note[rank] === undefined) return null;
        return !!note[rank];
    }

    function storeCollapsedChoice(pre, collapsed) {
        storeBlockChoice(MARKDOWN_COLLAPSED_KEY, pre, collapsed);
    }

    /**
     * Put a block back the way this browser last left it. An HTML note whose
     * stored content already says data-collapsed (the attribute is part of
     * what the sanitizer keeps, so a note written by the API can ask for a
     * folded block) opens on it, and what was done here afterwards wins.
     */
    function applyStoredCollapsed(pre) {
        var stored = storedBlockChoice(MARKDOWN_COLLAPSED_KEY, pre);
        if (stored === null) return;
        pre.setAttribute('data-collapsed', stored ? '1' : '0');
    }

    // ---- Wrapping the long lines of one block ---------------------------
    //
    // The account's "Code block word wrap" setting (<body
    // class="code-block-no-wrap"> when off) is the default of every block,
    // and the button in a block's corner switches that one block (discussion
    // 1764). Like folding, it is a reading gesture: the choice is kept in
    // this browser, per note and per rank of the block, and never in the
    // note. That is also why the mark sits on the action host and not on the
    // PRE: the host is dropped before a note is stored
    // (stripSearchHighlights in js/notes.js), so nothing of it can ride
    // along with the next save. Same store as the editor's own views of a
    // Markdown note (build/markdown-editor/src/live-preview.js).
    var CODE_WRAP_KEY = 'markdown_code_wrap';

    function codeWrapHost(block) {
        var pre = getCodeBlockElement(block);
        var host = pre ? pre.parentElement : null;
        return host && host.classList && host.classList.contains('code-block-actions-host') ? host : null;
    }

    function isCodeBlockWrapped(block) {
        var host = codeWrapHost(block);
        var choice = host ? host.getAttribute('data-code-wrap') : null;
        if (choice === '1') return true;
        if (choice === '0') return false;
        return !(document.body && document.body.classList.contains('code-block-no-wrap'));
    }

    function setWrapButtonState(btn, wrapped) {
        var label = wrapped
            ? tl('editor.code_block_wrap.disable', 'Do not wrap long lines')
            : tl('editor.code_block_wrap.enable', 'Wrap long lines');
        btn.innerHTML = wrapped ? WRAP_ICON_SVG : WRAP_OFF_ICON_SVG;
        btn.setAttribute('aria-label', label);
        btn.setAttribute('title', label);
        btn.setAttribute('aria-pressed', wrapped ? 'true' : 'false');
    }

    function applyStoredWrap(block) {
        var host = codeWrapHost(block);
        if (!host) return;
        var stored = storedBlockChoice(CODE_WRAP_KEY, getCodeBlockElement(block));
        if (stored === null) return;
        host.setAttribute('data-code-wrap', stored ? '1' : '0');
    }

    /**
     * Always written explicitly, never removed: a block the reader switched
     * keeps what they chose when the account's setting changes under it.
     */
    function toggleCodeBlockWrap(block) {
        var host = codeWrapHost(block);
        if (!host) return isCodeBlockWrapped(block);

        var next = !isCodeBlockWrapped(block);
        host.setAttribute('data-code-wrap', next ? '1' : '0');
        storeBlockChoice(CODE_WRAP_KEY, getCodeBlockElement(block), next);
        // (the block gains or loses its sideways scroll)
        updateCodeBlockOverflow([getCodeBlockElement(block)]);
        return next;
    }

    // Called before the gutters are drawn (js/syntax-highlight.js), and for
    // every block that is set up (addCopyButtonToCodeBlocks)
    window.restoreCodeBlockCollapsed = function (container) {
        var root = (container && container.querySelectorAll) ? container : document;
        if (root.tagName === 'PRE') {
            applyStoredCollapsed(root);
            return;
        }
        Array.prototype.forEach.call(root.querySelectorAll('pre'), applyStoredCollapsed);
    };

    // Called before the gutters are drawn (js/syntax-highlight.js)
    window.restoreMarkdownPreviewLineNumbers = function (container) {
        var root = (container && container.querySelectorAll) ? container : document;
        var previews = Array.prototype.slice.call(root.querySelectorAll('.markdown-preview'));
        if (root.classList && root.classList.contains('markdown-preview')) previews.push(root);
        if (!previews.length && root.closest && root.closest('.markdown-preview')) previews.push(root.closest('.markdown-preview'));
        if (!previews.length) return;
        var all = readStoredMarkdownLineNumbers();
        previews.forEach(function (preview) {
            var note = all[codeBlockStoreNoteId(preview)];
            if (!note || typeof note !== 'object') return;
            codeBlockStoreBlocks(preview).forEach(function (pre, rank) {
                if (note[rank] === undefined || pre.hasAttribute('data-line-numbers')) return;
                pre.setAttribute('data-line-numbers', note[rank] ? '1' : '0');
            });
        });
    };

    /**
     * Write the per-block override and redraw the gutter. The attribute is
     * always written explicitly (never removed) so the choice survives a
     * change to the global setting.
     */
    function toggleLineNumbers(block) {
        var pre = getPreForBlock(block);
        if (!pre) return;

        var next = !areLineNumbersVisible(pre);
        pre.setAttribute('data-line-numbers', next ? '1' : '0');
        storeMarkdownPreviewLineNumbers(pre, next);

        var noteentry = pre.closest ? pre.closest('.noteentry') : null;

        if (typeof window.applyCodeLineNumbers === 'function') {
            window.applyCodeLineNumbers(noteentry || pre.parentElement || pre);
        }

        if (!noteentry) return;

        if (typeof window.markNoteAsModified === 'function') {
            window.markNoteAsModified();
        }
        // Autosave listens for input on the note body; without this the new
        // attribute stays in the DOM and is never persisted.
        noteentry.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // The Markdown editor's live rendering draws the same toggle on its code
    // blocks (build/markdown-editor/src/live-preview.js)
    window.poznoteCodeBlockDeleteIcon = DELETE_ICON_SVG;
    window.poznoteCodeBlockLineNumberIcons = {
        on: LINE_NUMBERS_ICON_SVG,
        off: LINE_NUMBERS_OFF_ICON_SVG
    };
    window.poznoteCodeBlockCollapseIcons = {
        open: COLLAPSE_ICON_OPEN,
        closed: COLLAPSE_ICON_CLOSED
    };
    window.poznoteCodeBlockWrapIcons = {
        on: WRAP_ICON_SVG,
        off: WRAP_OFF_ICON_SVG
    };
    window.poznoteCodeBlockCopyIcons = {
        copy: COPY_ICON_SVG,
        check: CHECK_ICON_SVG
    };

    function setCopyIcon(btn) {
        btn.innerHTML = COPY_ICON_SVG;
    }

    function setCheckIcon(btn) {
        btn.innerHTML = CHECK_ICON_SVG;
    }

    async function copyText(text) {
        // Prefer navigator.clipboard when available
        if (navigator.clipboard && navigator.clipboard.writeText) {
            try {
                await navigator.clipboard.writeText(text);
                return true;
            } catch (e) {
                // fallthrough to execCommand fallback
                console.debug('copy-code-on-focus: copyText() failed:', e);
            }
        }
        // Fallback copy using a temporary textarea + execCommand('copy')
        return copyViaTextarea(text);
    }

    function copyViaTextarea(text) {
        try {
            var ta = document.createElement('textarea');
            // Place off-screen
            ta.style.position = 'fixed';
            ta.style.left = '-9999px';
            ta.style.top = '0';
            ta.setAttribute('readonly', '');
            ta.value = text;
            document.body.appendChild(ta);
            ta.select();
            ta.setSelectionRange(0, ta.value.length);
            var ok = false;
            try {
                ok = document.execCommand('copy');
            } catch (e) {
                ok = false;
            }
            try { document.body.removeChild(ta); } catch (e) {
                console.debug('copy-code-on-focus: copyViaTextarea() failed:', e);
            }
            return !!ok;
        } catch (e) {
            return false;
        }
    }

    // Lightweight accessible toast helper
    function ensureToastContainer() {
        // Shared with the other top-right toasts so they stack (issue 1508);
        // public notes do not load js/ui.js and keep their own column.
        if (typeof window.poznoteToastStack === 'function') return window.poznoteToastStack();
        var id = 'copy-toast-container';
        var container = document.getElementById(id);
        if (container) return container;
        container = document.createElement('div');
        container.id = id;
        container.setAttribute('aria-live', 'polite');
        container.setAttribute('aria-atomic', 'true');
        container.style.position = 'fixed';
        container.style.top = '16px';
        container.style.right = '16px';
        container.style.zIndex = 2147483647; // very high
        container.style.pointerEvents = 'none';
        document.body.appendChild(container);
        return container;
    }

    function showToast(message, duration) {
        try {
            duration = duration || 1800;
            var container = ensureToastContainer();
            var toast = document.createElement('div');
            toast.className = 'copy-toast-message';
            toast.style.pointerEvents = 'auto';
            toast.style.background = '#2d3748';
            toast.style.color = '#e2e8f0';
            toast.style.padding = '10px 16px';
            toast.style.marginTop = '8px';
            toast.style.borderRadius = '8px';
            toast.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
            toast.style.fontSize = '14px';
            toast.style.fontWeight = '500';
            toast.style.maxWidth = '280px';
            toast.style.wordBreak = 'break-word';
            toast.style.border = '1px solid rgba(255,255,255,0.1)';
            toast.style.userSelect = 'none';
            toast.style.webkitUserSelect = 'none';
            toast.style.mozUserSelect = 'none';
            toast.style.msUserSelect = 'none';
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 160ms ease-in-out, transform 160ms ease-in-out';
            toast.style.transform = 'translateY(-6px)';
            toast.textContent = message;
            container.appendChild(toast);
            // Force reflow to enable transition
            // eslint-disable-next-line no-unused-expressions
            toast.offsetHeight;
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0)';

            // Each toast has its own timer so multiple toasts can appear independently
            setTimeout(function () {
                toast.style.opacity = '0';
                toast.style.transform = 'translateY(-6px)';
                setTimeout(function () { try { container.removeChild(toast); } catch (e) {
                    console.debug('copy-code-on-focus: showToast() failed:', e);
                } }, 220);
            }, duration);

            // toast shown (silent)
        } catch (e) { /* ignore */ }
    }

    function normalizeCodeText(el) {
        if (!el) return '';
        // Clone the element to avoid modifying the original
        var clone = el.cloneNode(true);
        
        // Remove the copy button from the clone if present
        var btn = clone.querySelector('.code-block-copy-btn');
        if (btn) {
            btn.remove();
        }
        
        // Remove the delete button from the clone if present
        var delBtn = clone.querySelector('.code-block-delete-btn');
        if (delBtn) {
            delBtn.remove();
        }
        
        // Get text content and preserve visual line breaks from editable code blocks.
        var codeElement = clone.tagName && clone.tagName.toLowerCase() === 'code'
            ? clone
            : clone.querySelector('code');
        var text = (typeof window.getCodeBlockSourceText === 'function' && codeElement)
            ? window.getCodeBlockSourceText(codeElement)
            : (clone.textContent || clone.innerText || '');
        
        // Replace non-breaking spaces with regular spaces
        text = text.replace(/\u00A0/g, ' ');
        
        // Remove trailing whitespace from each line but keep line breaks
        text = text.split('\n').map(function(line) {
            return line.trimEnd();
        }).join('\n');
        
        // Remove leading/trailing empty lines
        text = text.trim();
        
        return text;
    }

    function getCodeBlockElement(candidate) {
        if (!candidate || !candidate.tagName) return null;

        var tagName = candidate.tagName.toLowerCase();
        if (tagName === 'pre') {
            return candidate;
        }

        if (tagName === 'code' && candidate.parentElement && candidate.parentElement.tagName.toLowerCase() === 'pre') {
            return candidate.parentElement;
        }

        return candidate;
    }

    function getCodeBlockElements(container) {
        var blocks = [];
        var root = container || document;

        root.querySelectorAll('pre:not(.indented-pre), .code-block').forEach(function(candidate) {
            var block = getCodeBlockElement(candidate);
            if (block && blocks.indexOf(block) === -1) {
                blocks.push(block);
            }
        });

        return blocks;
    }

    function isDedicatedActionHost(host, block) {
        if (!host || !host.classList || !host.classList.contains('code-block-actions-host')) {
            return false;
        }

        var hostedBlocks = getCodeBlockElements(host);
        return hostedBlocks.length === 1 && hostedBlocks[0] === block;
    }

    function styleActionHost(host) {
        host.style.position = 'relative';
        host.style.maxWidth = '100%';
        host.style.boxSizing = 'border-box';
    }

    function findActionButton(block, actionHost, className) {
        var selector = '.' + className;
        var button = block.querySelector ? block.querySelector(selector) : null;
        if (button) return button;

        if (!actionHost || !actionHost.children) return null;

        for (var i = 0; i < actionHost.children.length; i++) {
            var child = actionHost.children[i];
            if (child.classList && child.classList.contains(className)) {
                return child;
            }
        }

        return null;
    }

    function isActionButtonNode(node) {
        return !!(node && node.nodeType === 1 && node.classList &&
            (node.classList.contains('code-block-copy-btn') ||
             node.classList.contains('code-block-delete-btn') ||
             node.classList.contains('code-block-lang-btn') ||
             node.classList.contains('code-block-line-numbers-btn') ||
             node.classList.contains('code-block-wrap-btn') ||
             node.classList.contains('code-block-collapse-btn') ||
             node.classList.contains('code-block-collapsed-summary')));
    }

    function isDisposableActionHost(host) {
        if (!host || !host.classList || !host.classList.contains('code-block-actions-host')) {
            return false;
        }

        return Array.from(host.childNodes).every(function(node) {
            return (node.nodeType === 3 && node.textContent.trim() === '') || isActionButtonNode(node);
        });
    }

    function removeNode(node) {
        if (node && node.parentNode) {
            node.parentNode.removeChild(node);
        }
    }

    function removeDirectActionButtons(host) {
        if (!host || !host.children) return;

        Array.from(host.children).forEach(function(child) {
            if (isActionButtonNode(child)) {
                removeNode(child);
            }
        });
    }

    // Returns where the block sat ({ block, parent, next }) so the deletion
    // can be undone, or null when there was nothing to remove.
    function removeCodeBlockDom(block, copyButton, deleteButton) {
        var targetBlock = getCodeBlockElement(block);
        if (!targetBlock) return null;

        var actionHost = targetBlock.parentElement;
        if (!actionHost || !actionHost.classList || !actionHost.classList.contains('code-block-actions-host')) {
            actionHost = null;
        }

        removeNode(copyButton || findActionButton(targetBlock, actionHost, 'code-block-copy-btn'));
        removeNode(deleteButton || findActionButton(targetBlock, actionHost, 'code-block-delete-btn'));
        removeNode(findActionButton(targetBlock, actionHost, 'code-block-lang-btn'));
        removeNode(findActionButton(targetBlock, actionHost, 'code-block-line-numbers-btn'));
        removeNode(findActionButton(targetBlock, actionHost, 'code-block-wrap-btn'));
        removeNode(findActionButton(targetBlock, actionHost, 'code-block-collapse-btn'));
        removeNode(findActionButton(targetBlock, actionHost, 'code-block-collapsed-summary'));

        var position = { block: targetBlock, parent: targetBlock.parentNode, next: targetBlock.nextSibling };
        removeNode(targetBlock);

        if (isDisposableActionHost(actionHost)) {
            // The host goes with its block: the block comes back in the host's
            // place and the observer below wraps it again
            position.parent = actionHost.parentNode;
            position.next = actionHost.nextSibling;
            removeNode(actionHost);
        }

        return position;
    }

    function findMarkdownFenceRange(lines, targetIndex) {
        var currentIndex = -1;
        var inBlock = false;
        var startLine = -1;

        for (var i = 0; i < lines.length; i++) {
            if (!/^\s*```/.test(lines[i])) {
                continue;
            }

            if (!inBlock) {
                currentIndex++;
                startLine = i;
                inBlock = true;
            } else {
                if (currentIndex === targetIndex) {
                    return { start: startLine, end: i };
                }
                inBlock = false;
                startLine = -1;
            }
        }

        if (inBlock && currentIndex === targetIndex) {
            return { start: startLine, end: lines.length - 1 };
        }

        return null;
    }

    function deleteMarkdownCodeBlock(markdownPreview, block) {
        var targetPre = getCodeBlockElement(block);
        if (!markdownPreview || !targetPre || targetPre.tagName.toLowerCase() !== 'pre') {
            return false;
        }

        var noteEntry = markdownPreview.closest('.noteentry');
        if (!noteEntry) return false;

        var noteId = noteEntry.id.replace('entry', '');
        var editorDiv = noteEntry.querySelector('.markdown-editor');
        if (!editorDiv) return false;

        var allPres = Array.from(markdownPreview.querySelectorAll('pre:not(.indented-pre)'));
        var preIndex = allPres.indexOf(targetPre);
        if (preIndex === -1) return false;

        var content = typeof window.getMarkdownContent === 'function'
            ? window.getMarkdownContent(noteId)
            : editorDiv.textContent;
        var lines = content.split('\n');
        var range = findMarkdownFenceRange(lines, preIndex);

        if (!range) {
            showToast('Could not find the source code block to delete');
            return true;
        }

        lines.splice(range.start, range.end - range.start + 1);
        var newContent = lines.join('\n');
        applyMarkdownSource(noteEntry, editorDiv, noteId, newContent);

        lastDeletion = {
            noteEntry: noteEntry,
            isStillCurrent: function() {
                return currentMarkdownSource(noteId, editorDiv) === newContent;
            },
            restore: function() {
                applyMarkdownSource(noteEntry, editorDiv, noteId, content);
            }
        };

        return true;
    }

    function currentMarkdownSource(noteId, editorDiv) {
        return typeof window.getMarkdownContent === 'function'
            ? window.getMarkdownContent(noteId)
            : editorDiv.textContent;
    }

    // Write a new Markdown source into the note and redraw what is on screen
    function applyMarkdownSource(noteEntry, editorDiv, noteId, newContent) {
        if (typeof window.renderMarkdownEditorContent === 'function') {
            window.renderMarkdownEditorContent(editorDiv, newContent);
        } else {
            editorDiv.textContent = newContent;
        }
        noteEntry.setAttribute('data-markdown-content', newContent);

        if (typeof window.markNoteAsModified === 'function') {
            window.markNoteAsModified();
        }

        if (noteEntry.classList.contains('markdown-split-mode')) {
            editorDiv.dispatchEvent(new Event('input', { bubbles: true }));
        } else if (typeof window.switchToPreviewMode === 'function') {
            window.switchToPreviewMode(noteId);
        }
    }

    // ------------------------------------------------------------------
    // Undo of a deletion (Ctrl+Z)
    // ------------------------------------------------------------------
    // The delete button takes the block out behind the browser's undo stack
    // (DOM removal in a rich-text note, source rewrite from the preview in a
    // Markdown one), and the confirm dialog leaves the focus on <body>, so
    // there is no editor to take the Ctrl+Z either. The last deletion is
    // therefore kept here and put back on Ctrl+Z, as long as the note still
    // reads exactly as the deletion left it: anything typed since has to be
    // undone first, which keeps the steps in order.
    var lastDeletion = null;

    function rememberDomDeletion(noteEntry, position) {
        if (!noteEntry || !position || !position.parent) {
            lastDeletion = null;
            return;
        }

        // Whitespace is left out: the line-number gutter re-syncs the other
        // blocks after an input and may turn a <br> into a newline
        var readText = function() {
            return noteEntry.textContent.replace(/\s+/g, '');
        };
        var textAfter = readText();

        lastDeletion = {
            noteEntry: noteEntry,
            isStillCurrent: function() {
                return position.parent.isConnected && readText() === textAfter;
            },
            restore: function() {
                var next = position.next && position.next.parentNode === position.parent ? position.next : null;
                position.parent.insertBefore(position.block, next);

                if (typeof window.markNoteAsModified === 'function') {
                    window.markNoteAsModified();
                }
                noteEntry.dispatchEvent(new Event('input', { bubbles: true }));

                if (position.block.scrollIntoView) {
                    position.block.scrollIntoView({ block: 'nearest' });
                }
            }
        };
    }

    function handleUndoShortcut(e) {
        if (!lastDeletion || e.defaultPrevented) return;
        if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.altKey) return;
        if ((e.key || '').toLowerCase() !== 'z') return;

        var target = e.target && e.target.closest ? e.target : null;
        // A field or the Markdown source editor undoes its own text (the
        // editor's history holds the rewrite, so it brings the block back)
        if (target && target.closest('input, textarea, select, .markdown-editor')) return;
        // Another note: leave its undo alone
        var targetNote = target ? target.closest('.noteentry') : null;
        if (targetNote && targetNote !== lastDeletion.noteEntry) return;

        if (!lastDeletion.noteEntry.isConnected || !lastDeletion.isStillCurrent()) {
            if (!lastDeletion.noteEntry.isConnected) lastDeletion = null;
            return;
        }

        e.preventDefault();
        e.stopPropagation();

        var deletion = lastDeletion;
        lastDeletion = null;
        deletion.restore();
    }

    // Capture phase: ahead of the browser's own undo and of the tree history
    document.addEventListener('keydown', handleUndoShortcut, true);

    // A click in the tree hands Ctrl+Z back to it (js/pane-focus.js)
    document.addEventListener('mousedown', function(e) {
        if (lastDeletion && e.target && e.target.closest && e.target.closest('#left_col')) {
            lastDeletion = null;
        }
    }, true);

    function ensureCodeBlockActionHost(block) {
        block = getCodeBlockElement(block);
        if (!block || !block.parentNode) return block;

        var host = block.parentElement;
        if (isDedicatedActionHost(host, block)) {
            styleActionHost(host);
            return host;
        }

        if (host && host.classList && host.classList.contains('code-block-actions-host')) {
            removeDirectActionButtons(host);
        }

        host = document.createElement('div');
        host.className = 'code-block-actions-host';
        styleActionHost(host);

        block.parentNode.insertBefore(host, block);
        host.appendChild(block);

        return host;
    }

    function canDeleteCodeBlock(block) {
        return !!(block && block.closest('.noteentry'));
    }

    // The gutter itself is drawn by applyCodeLineNumbers() in
    // js/syntax-highlight.js and styled by css/code-blocks.css, and both only
    // match inside .noteentry. On a page that loads this script without one,
    // such as public_note.php, the toggle would write data-line-numbers and
    // change nothing on screen, so it is not offered there.
    function canToggleLineNumbers(block) {
        return !!(block && block.closest('.noteentry'));
    }

    // Same reach as the gutter toggle: the rules that wrap or unwrap one
    // block (css/code-blocks.css) only match inside .noteentry.
    function canToggleWrap(block) {
        return !!(block && block.closest('.noteentry'));
    }

    /**
     * The chevron of a block and the number of lines next to it. Separate from
     * the buttons around it because it comes and goes with what the block
     * holds: a block no longer than the setting is not offered it, so it is
     * refreshed while the block is being written too (observeCodeBlocks).
     *
     * rebuildListeners: addCopyButtonToCodeBlocks() replaces the buttons of a
     * block it is given again, dropping their listeners with them; the
     * typing path keeps the button it finds and only repaints it.
     */
    function syncCollapseButton(block, actionHost, rebuildListeners) {
        var existing = findActionButton(block, actionHost, 'code-block-collapse-btn');

        if (!canCollapseCodeBlock(block)) {
            // A block that lost lines while folded, or one folded before the
            // setting was raised: nothing could unfold it again once the
            // chevron goes, so it is unfolded here. The note is not marked as
            // modified for it, the attribute leaving the stored content at
            // the next save of its own.
            var shortPre = getPreForBlock(block);
            if (shortPre && shortPre.getAttribute('data-collapsed') === '1') {
                shortPre.setAttribute('data-collapsed', '0');
                storeCollapsedChoice(shortPre, false);
            }
            if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
            paintCollapsedSummary(actionHost, block, false);
            return;
        }

        var collapsed = isCodeBlockCollapsed(block);
        if (existing && !rebuildListeners) {
            setCollapseButtonState(existing, collapsed);
            paintCollapsedSummary(actionHost, block, collapsed);
            return;
        }

        var collapseBtn;
        if (existing) {
            collapseBtn = existing.cloneNode(false);
            existing.parentNode.replaceChild(collapseBtn, existing);
        } else {
            collapseBtn = document.createElement('button');
            collapseBtn.className = 'code-block-collapse-btn';
            collapseBtn.setAttribute('type', 'button');
            collapseBtn.setAttribute('contenteditable', 'false');
        }
        setCollapseButtonState(collapseBtn, collapsed);
        if (collapseBtn.parentNode !== actionHost) {
            if (collapseBtn.parentNode) collapseBtn.parentNode.removeChild(collapseBtn);
            actionHost.appendChild(collapseBtn);
        }
        paintCollapsedSummary(actionHost, block, collapsed);
        collapseBtn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            var next = toggleCodeBlockCollapsed(block);
            setCollapseButtonState(collapseBtn, next);
            paintCollapsedSummary(actionHost, block, next);
        });
    }

    // The controls of a block, from the corner inwards. Each one can be hidden
    // from Element visibility (and its right-click menu), so they are not left
    // at fixed offsets, which would leave a hole where a hidden one was: the
    // visible ones are stacked from the right, 32px apart (a 28px button and
    // 4px of air). Only inside a note: a public share places its own copy
    // button and chevron (css/public_note.css, css/components/code-block-fold.css).
    var ACTION_ORDER = [
        'code-block-delete-btn',
        'code-block-copy-btn',
        'code-block-line-numbers-btn',
        'code-block-wrap-btn',
        'code-block-collapse-btn',
        'code-block-collapsed-summary'
    ];
    var ACTION_EDGE = 8;
    var ACTION_STEP = 32;

    function layoutCodeBlockActions(host) {
        if (!host || !host.children || !host.closest || !host.closest('.noteentry')) return;
        var right = ACTION_EDGE;
        ACTION_ORDER.forEach(function (className) {
            for (var i = 0; i < host.children.length; i++) {
                var child = host.children[i];
                if (!child.classList.contains(className)) continue;
                if (getComputedStyle(child).display === 'none') continue;
                child.style.right = right + 'px';
                right += ACTION_STEP;
                return;
            }
        });
    }

    function layoutAllCodeBlockActions() {
        Array.prototype.forEach.call(document.querySelectorAll('.noteentry .code-block-actions-host'), layoutCodeBlockActions);
    }

    // A control hidden or shown again from Element visibility. The event is
    // sent before the new rules are written (applyHiddenKeys in
    // js/ui-customization.js), so the stack is measured a frame later.
    document.addEventListener('poznote-ui-customization-updated', function () {
        requestAnimationFrame(layoutAllCodeBlockActions);
    });

    var STRAY_CONTROLS_SELECTOR = '.code-block-copy-btn, .code-block-delete-btn, .code-block-lang-btn, ' +
        '.code-block-line-numbers-btn, .code-block-wrap-btn, .code-block-collapse-btn, .code-block-collapsed-summary';

    /**
     * Controls that were saved into a note. Version 6.146.0 left the fold
     * chevron and its line count out of the list the editor strips before it
     * saves (stripSearchHighlights in js/notes.js), so each save of an HTML
     * note wrote one more of each next to its code blocks. A control belongs
     * to an action host (or, for the oldest ones, sits inside its block):
     * anywhere else in a note it is one of those leftovers, and it goes. The
     * note is not marked as modified for it, its next save stores it clean.
     */
    function removeStrayCodeBlockControls(noteentry) {
        if (!noteentry || !noteentry.querySelectorAll) return;
        Array.prototype.forEach.call(noteentry.querySelectorAll(STRAY_CONTROLS_SELECTOR), function (control) {
            var parent = control.parentElement;
            if (!parent) return;
            if (parent.classList.contains('code-block-actions-host')) return;
            if (control.closest('pre, .code-block')) return;
            control.remove();
        });
    }

    // Add copy button to code blocks: the given ones, or every block of the page
    function addCopyButtonToCodeBlocks(blocks) {
        var codeBlocks = Array.isArray(blocks) ? blocks : getCodeBlockElements(document);
        var cleanedNotes = [];
        
        codeBlocks.forEach(function(block) {
            // Skip inline code elements
            if (block.tagName.toLowerCase() === 'code' && block.parentElement.tagName.toLowerCase() !== 'pre') {
                return;
            }

            var ownerNote = block.closest ? block.closest('.noteentry') : null;
            if (ownerNote && cleanedNotes.indexOf(ownerNote) === -1) {
                cleanedNotes.push(ownerNote);
                removeStrayCodeBlockControls(ownerNote);
            }

            applyStoredCollapsed(block);

            var actionHost = ensureCodeBlockActionHost(block);
            var allowDelete = canDeleteCodeBlock(block);
            var allowLineNumbers = canToggleLineNumbers(block);
            var allowWrap = canToggleWrap(block);
            if (allowWrap) applyStoredWrap(block);
            syncCollapseButton(block, actionHost, true);

            var existingBtn = findActionButton(block, actionHost, 'code-block-copy-btn');
            var existingDelBtn = findActionButton(block, actionHost, 'code-block-delete-btn');
            var existingLineBtn = findActionButton(block, actionHost, 'code-block-line-numbers-btn');
            var existingWrapBtn = findActionButton(block, actionHost, 'code-block-wrap-btn');
            var btn;
            var delBtn;
            var lineBtn;
            var wrapBtn;
            
            if (existingBtn) {
                btn = existingBtn;
                // Remove old event listeners by cloning the button
                var newBtn = btn.cloneNode(true);
                btn.parentNode.replaceChild(newBtn, btn);
                btn = newBtn;
                btn.setAttribute('aria-label', 'Copy code to clipboard');
                btn.setAttribute('title', 'Copy code');
                setCopyIcon(btn);
            } else {
                // Create copy button
                btn = document.createElement('button');
                btn.className = 'code-block-copy-btn';
                btn.setAttribute('type', 'button');
                // (not part of the text: the right-click Hide menu,
                // js/hide-element-menu.js, takes editable ground for words)
                btn.setAttribute('contenteditable', 'false');
                btn.setAttribute('aria-label', 'Copy code to clipboard');
                btn.setAttribute('title', 'Copy code');
                
                // SVG icon for copy
                setCopyIcon(btn);
            }

            if (btn.parentNode !== actionHost) {
                if (btn.parentNode) {
                    btn.parentNode.removeChild(btn);
                }
                actionHost.appendChild(btn);
            }

            // Line-numbers toggle, sitting left of the copy button
            if (!allowLineNumbers) {
                if (existingLineBtn && existingLineBtn.parentNode) {
                    existingLineBtn.parentNode.removeChild(existingLineBtn);
                }
            } else {
                if (existingLineBtn) {
                    lineBtn = existingLineBtn;
                    var newLineBtn = lineBtn.cloneNode(false);
                    lineBtn.parentNode.replaceChild(newLineBtn, lineBtn);
                    lineBtn = newLineBtn;
                } else {
                    lineBtn = document.createElement('button');
                    lineBtn.className = 'code-block-line-numbers-btn';
                    lineBtn.setAttribute('type', 'button');
                    lineBtn.setAttribute('contenteditable', 'false');
                }
                setLineNumbersButtonState(lineBtn, areLineNumbersVisible(block));

                if (lineBtn.parentNode !== actionHost) {
                    if (lineBtn.parentNode) {
                        lineBtn.parentNode.removeChild(lineBtn);
                    }
                    actionHost.appendChild(lineBtn);
                }

                lineBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleLineNumbers(block);
                    setLineNumbersButtonState(lineBtn, areLineNumbersVisible(block));
                });
            }

            // Word-wrap toggle, sitting left of the line numbers
            if (!allowWrap) {
                if (existingWrapBtn && existingWrapBtn.parentNode) {
                    existingWrapBtn.parentNode.removeChild(existingWrapBtn);
                }
            } else {
                if (existingWrapBtn) {
                    wrapBtn = existingWrapBtn.cloneNode(false);
                    existingWrapBtn.parentNode.replaceChild(wrapBtn, existingWrapBtn);
                } else {
                    wrapBtn = document.createElement('button');
                    wrapBtn.className = 'code-block-wrap-btn';
                    wrapBtn.setAttribute('type', 'button');
                    wrapBtn.setAttribute('contenteditable', 'false');
                }
                setWrapButtonState(wrapBtn, isCodeBlockWrapped(block));

                if (wrapBtn.parentNode !== actionHost) {
                    if (wrapBtn.parentNode) {
                        wrapBtn.parentNode.removeChild(wrapBtn);
                    }
                    actionHost.appendChild(wrapBtn);
                }

                wrapBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    setWrapButtonState(wrapBtn, toggleCodeBlockWrap(block));
                });
            }

            if (!allowDelete) {
                if (existingDelBtn && existingDelBtn.parentNode) {
                    existingDelBtn.parentNode.removeChild(existingDelBtn);
                }
            } else {
                var deleteBtnLabel = tl('editor.code_block_delete.title', 'Delete code block');

                if (existingDelBtn) {
                    delBtn = existingDelBtn;
                    var newDelBtn = delBtn.cloneNode(true);
                    delBtn.parentNode.replaceChild(newDelBtn, delBtn);
                    delBtn = newDelBtn;
                    delBtn.setAttribute('aria-label', deleteBtnLabel);
                    delBtn.setAttribute('title', deleteBtnLabel);
                    delBtn.innerHTML = DELETE_ICON_SVG;
                } else {
                    delBtn = document.createElement('button');
                    delBtn.className = 'code-block-delete-btn';
                    delBtn.setAttribute('type', 'button');
                    delBtn.setAttribute('contenteditable', 'false');
                    delBtn.setAttribute('aria-label', deleteBtnLabel);
                    delBtn.setAttribute('title', deleteBtnLabel);
                    delBtn.innerHTML = DELETE_ICON_SVG;
                }

                if (delBtn.parentNode !== actionHost) {
                    if (delBtn.parentNode) {
                        delBtn.parentNode.removeChild(delBtn);
                    }
                    actionHost.appendChild(delBtn);
                }
            }
            
            layoutCodeBlockActions(actionHost);

            // Add/re-attach click handler for copy
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                var text = normalizeCodeText(block);
                
                if (!text) {
                    showToast('No text found to copy');
                    return;
                }
                
                copyText(text).then(function (ok) {
                    if (ok) {
                        // Visual feedback on button
                        btn.classList.add('copied');
                        setCheckIcon(btn);
                        
                        showToast('Copied to clipboard!');
                        
                        // Reset button after 2 seconds
                        setTimeout(function() {
                            btn.classList.remove('copied');
                            setCopyIcon(btn);
                        }, 2000);
                    } else {
                        showToast('Copy failed — select the code and press Ctrl+C');
                    }
                }).catch(function () {
                    showToast('Copy failed — select the code and press Ctrl+C');
                });
            });

            // Add delete click handler
            if (!allowDelete || !delBtn) {
                return;
            }

            delBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();

                var confirmTitle = tl('editor.code_block_delete.confirm_title', 'Delete code block');
                var confirmMsg   = tl('editor.code_block_delete.confirm_message', 'Do you want to delete this code block?');

                var doDelete = function() {
                    // --- Markdown mode: update source and re-render ---
                    var markdownPreview = block.closest('.markdown-preview');
                    if (markdownPreview && deleteMarkdownCodeBlock(markdownPreview, block)) {
                        return;
                    }

                    // --- Rich-text mode: remove the DOM block directly ---
                    var noteentry = block.closest('.noteentry') || document.querySelector('.noteentry');
                    rememberDomDeletion(noteentry, removeCodeBlockDom(block, btn, delBtn));
                    if (typeof window.markNoteAsModified === 'function') {
                        window.markNoteAsModified();
                    }
                    if (noteentry) {
                        noteentry.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                };

                if (window.modalAlert && typeof window.modalAlert.confirm === 'function') {
                    window.modalAlert.confirm(confirmMsg, confirmTitle).then(function(confirmed) {
                        if (confirmed) doDelete();
                    });
                } else if (confirm(confirmMsg)) {
                    doDelete();
                }
            });
        });

        refreshLanguageButtons();
    }

    // Detect horizontal overflow on code blocks and toggle 'has-x-overflow' class
    // to avoid reserving scrollbar space when no horizontal scroll is needed.
    // blocks: the ones to check, every block of the page otherwise (the
    // resize listener passes an event).
    function updateCodeBlockOverflow(blocks) {
        var scoped = Array.isArray(blocks);
        if (!scoped) {
            blocks = getCodeBlockElements(document);
        }

        var highlightedCodeBlocks = [];
        if (scoped) {
            blocks.forEach(function(block) {
                block.querySelectorAll('code.hljs.has-x-overflow').forEach(function(codeBlock) {
                    highlightedCodeBlocks.push(codeBlock);
                });
            });
        } else {
            highlightedCodeBlocks = document.querySelectorAll('pre code.hljs.has-x-overflow');
        }

        highlightedCodeBlocks.forEach(function(codeBlock) {
            codeBlock.classList.remove('has-x-overflow');
        });

        // Every measure first, then every class: toggling a class between two
        // measures forced the browser to lay the page out again for each block
        var overflowing = blocks.map(function(block) {
            return block.scrollWidth > block.clientWidth;
        });
        blocks.forEach(function(block, index) {
            block.classList.toggle('has-x-overflow', overflowing[index]);
        });
    }

    // Expose the function globally so it can be called after AJAX note loads
    window.reinitializeCodeCopyButtons = function() {
        addCopyButtonToCodeBlocks();
        updateCodeBlockOverflow();
    };

    // The clickable language badge lives in the same action host, so it is
    // (re)built whenever the copy/delete buttons are (js/code-block-language.js)
    function refreshLanguageButtons() {
        if (typeof window.refreshCodeBlockLanguageButtons === 'function') {
            window.refreshCodeBlockLanguageButtons(document);
        }
    }

    // Watch for dynamically added code blocks. Only the added blocks are set
    // up: going over every block of the page each time cost hundreds of ms per
    // markdown preview update on a note with many code blocks.
    function observeCodeBlocks() {
        var observer = new MutationObserver(function(mutations) {
            var addedBlocks = [];

            function addBlock(candidate) {
                var block = getCodeBlockElement(candidate);
                if (block && block.isConnected && addedBlocks.indexOf(block) === -1) {
                    addedBlocks.push(block);
                }
            }

            mutations.forEach(function(mutation) {
                // A block taken out of its host by Ctrl+Z (the browser undoes
                // the insertion of the <pre>, it knows nothing of the host put
                // around it afterwards): the empty host and its buttons go too
                var host = mutation.target;
                if (mutation.removedNodes.length && host.nodeType === 1 && host.isConnected &&
                    host.classList.contains('code-block-actions-host') && host.closest('.noteentry') &&
                    !getCodeBlockElements(host).length &&
                    Array.prototype.some.call(mutation.removedNodes, function (node) { return node.nodeName === 'PRE'; })) {
                    host.remove();
                }

                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType !== 1) return; // Element nodes only
                    if (node.matches && node.matches('pre:not(.indented-pre), .code-block')) {
                        addBlock(node);
                    }
                    if (node.querySelectorAll) {
                        getCodeBlockElements(node).forEach(addBlock);
                    }
                });
            });

            if (addedBlocks.length > 0) {
                addCopyButtonToCodeBlocks(addedBlocks);
                updateCodeBlockOverflow(addedBlocks);
            }

            // A block being written crosses the length that deserves a
            // chevron, in either direction: the chevron follows as it is
            // typed instead of waiting for the note to be opened again. Only
            // it is refreshed, the buttons around it do not depend on what
            // the block holds.
            var touched = [];
            mutations.forEach(function (mutation) {
                var node = mutation.target;
                var element = node && node.nodeType === 1 ? node : (node ? node.parentElement : null);
                var block = element && element.closest ? element.closest('pre') : null;
                if (!block || !block.isConnected) return;
                if (addedBlocks.indexOf(block) !== -1 || touched.indexOf(block) !== -1) return;
                touched.push(block);
                var host = block.parentElement;
                if (isDedicatedActionHost(host, block)) syncCollapseButton(block, host, false);
            });
        });

        observer.observe(document.body, {
            childList: true,
            characterData: true,
            subtree: true
        });
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { 
            try { ensureToastContainer(); } catch (e) {
                console.debug('copy-code-on-focus: observeCodeBlocks() failed:', e);
            } 
            addCopyButtonToCodeBlocks();
            updateCodeBlockOverflow();
            observeCodeBlocks();
            window.addEventListener('resize', updateCodeBlockOverflow);
        });
    } else {
        try { ensureToastContainer(); } catch (e) {
            console.debug('copy-code-on-focus: observeCodeBlocks() failed:', e);
        }
        addCopyButtonToCodeBlocks();
        updateCodeBlockOverflow();
        observeCodeBlocks();
        window.addEventListener('resize', updateCodeBlockOverflow);
    }

})();
