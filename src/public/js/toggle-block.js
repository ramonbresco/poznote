/**
 * Toggle blocks (<details class="toggle-block">) of a rich-text note.
 *
 * One block, one file: building it, the two placeholders it shows while it is
 * empty, and the few keys that behave differently inside it. The slash menu
 * (js/slash-command.js) only asks for the element and drops it in the note,
 * so the block's own behaviour is not spread over the editor any more.
 *
 * The shape, which the database holds as it stands:
 *
 *     <details class="toggle-block">
 *       <summary class="toggle-header">Title</summary>
 *       <div class="toggle-content">…</div>
 *     </details>
 *
 * A fresh block is closed and empty: the caret sits in the header, which
 * shows its placeholder, and opening it shows the content's placeholder. The
 * two placeholders are `data-ph` attributes drawn by
 * css/components/toggle-block.css; the sanitizer drops the attribute on the
 * way to the database (a stored placeholder would freeze the language it was
 * written in), so refresh() writes them again every time a note lands in the
 * DOM.
 */
(function () {
    'use strict';

    var BLOCK = 'details.toggle-block';

    // What a line of note content sits in. The body of a toggle is a <div>,
    // so the nearest one of these is the body itself exactly while the caret
    // is in text the body holds directly.
    var LINE_SELECTOR = 'p, div, li, h1, h2, h3, h4, h5, h6, blockquote, pre, td, th, figure';

    // The indent the title is written past (the stylesheet pads the header by
    // as much, and draws the triangle in it): a click that lands in this
    // strip opens or closes the block, a click on the title itself only
    // places the caret.
    var MARKER_WIDTH = 16;

    function t(key, fallback) {
        return typeof window.t === 'function' ? window.t(key, null, fallback) : fallback;
    }

    function headerPlaceholder() {
        return t('slash_menu.toggle_placeholder', 'Toggle');
    }

    function contentPlaceholder() {
        return t('slash_menu.toggle_content_placeholder', 'Write inside the toggle here…');
    }

    /** An empty toggle, closed, both parts waiting for their placeholder. */
    function createElement() {
        var details = document.createElement('details');
        details.className = 'toggle-block';

        var header = document.createElement('summary');
        header.className = 'toggle-header';
        header.setAttribute('data-ph', headerPlaceholder());

        var content = document.createElement('div');
        content.className = 'toggle-content';
        content.setAttribute('data-ph', contentPlaceholder());

        details.appendChild(header);
        details.appendChild(content);
        return details;
    }

    /**
     * Give every toggle of `root` its placeholders back. Also drops the
     * contenteditable="true" that older blocks carry on their content: the
     * note itself is the editing host, a second one inside it cut undo and
     * the caret in two, and on a public page it let a visitor type.
     */
    function refresh(root) {
        var scope = root && root.querySelectorAll ? root : document;
        var blocks;
        try {
            blocks = scope.querySelectorAll(BLOCK);
        } catch (e) {
            return;
        }
        var header = headerPlaceholder();
        var content = contentPlaceholder();
        Array.prototype.forEach.call(blocks, function (block) {
            var summary = block.querySelector(':scope > summary');
            if (summary) {
                summary.setAttribute('data-ph', header);
                adoptHeadingWrittenInHeader(summary);
            }
            wrapLooseBody(block, summary);
            Array.prototype.forEach.call(block.querySelectorAll(':scope > .toggle-content'), function (body) {
                body.setAttribute('data-ph', content);
                body.removeAttribute('contenteditable');
            });
        });
    }

    /**
     * The body of a toggle, in the one box the stylesheet draws the guide
     * line along. A toggle written in Markdown has none: its blocks are
     * rendered as the direct children of the <details>, which left the body
     * without its line and without its indent. The same goes for a toggle
     * written through the API. Wrapping them here gives both kinds of note
     * the shape the editor builds, and the editing keys the one body they
     * already expect.
     */
    function wrapLooseBody(block, summary) {
        if (block.querySelector(':scope > .toggle-content')) return;

        var loose = Array.prototype.filter.call(block.childNodes, function (node) {
            return node !== summary && (node.nodeType !== 3 || node.textContent.trim() !== '');
        });
        if (!loose.length) return;

        var body = document.createElement('div');
        body.className = 'toggle-content';
        block.insertBefore(body, loose[0]);
        loose.forEach(function (node) { body.appendChild(node); });
    }

    /**
     * A title whose whole text sits in a heading element, which is what an
     * API client or an older note may hold, is read as that heading's level:
     * the size is a class here (see applyHeaderBlockStyle), and a heading
     * left in the title would bring its own margins into the line.
     */
    function adoptHeadingWrittenInHeader(header) {
        var heading = header.children.length === 1 ? header.firstElementChild : null;
        if (!heading || !/^H[1-6]$/.test(heading.tagName)) return;
        while (heading.firstChild) header.insertBefore(heading.firstChild, heading);
        heading.remove();
        setHeaderHeadingLevel(header, parseInt(heading.tagName.slice(1), 10));
    }

    // ------------------------------------------------- open or closed, kept
    //
    // A toggle opens again the way it was left. The choice is kept in the
    // browser, per note, a toggle being known by its rank among the note's
    // toggles, the way the folded state of a Markdown preview's code blocks
    // is (js/copy-code-on-focus.js). Not in the note: opening a toggle is
    // reading, not writing, and it would move the note's modified date and
    // rewrite the note for everyone who shares it. The cost is that it is
    // this browser's choice, which is what it is.
    var OPEN_STATE_KEY = 'toggle_open';
    var MAX_STORED_NOTES = 300;

    /** Every toggle of a note, in the order they are written in it. */
    function noteToggles(noteEntry) {
        return Array.prototype.slice.call(noteEntry.querySelectorAll(BLOCK));
    }

    function noteIdOf(noteEntry) {
        var id = noteEntry.getAttribute('data-note-id') || String(noteEntry.id || '').replace(/^entry/, '');
        return /^\d+$/.test(id) ? id : '';
    }

    function readStoredState() {
        try {
            var storage = window.__poznoteUserStorage || window.localStorage;
            var parsed = JSON.parse(storage.getItem(OPEN_STATE_KEY) || '{}');
            return parsed && typeof parsed === 'object' ? parsed : {};
        } catch (e) {
            return {};
        }
    }

    function storeState(block, isOpen) {
        var noteEntry = block.closest ? block.closest('.noteentry') : null;
        if (!noteEntry) return;
        var noteId = noteIdOf(noteEntry);
        var rank = noteToggles(noteEntry).indexOf(block);
        if (!noteId || rank === -1) return;
        try {
            var all = readStoredState();
            var note = all[noteId] && typeof all[noteId] === 'object' ? all[noteId] : {};
            note[rank] = isOpen ? 1 : 0;
            // Rewritten last, so the oldest notes are the ones dropped below
            delete all[noteId];
            all[noteId] = note;
            var ids = Object.keys(all);
            ids.slice(0, Math.max(0, ids.length - MAX_STORED_NOTES)).forEach(function (id) { delete all[id]; });
            (window.__poznoteUserStorage || window.localStorage).setItem(OPEN_STATE_KEY, JSON.stringify(all));
        } catch (e) {
            // (private mode, full storage: the choice lasts until the next redraw)
        }
    }

    /**
     * Put the toggles of `root` back the way they were left. Called when a
     * note lands in the DOM and again whenever a Markdown preview is redrawn
     * from its source, which says nothing about what the reader opened.
     */
    function restoreState(root) {
        var scope = root && root.querySelectorAll ? root : document;
        var entries = Array.prototype.slice.call(scope.querySelectorAll('.noteentry'));
        var own = scope.closest ? scope.closest('.noteentry') : null;
        if (scope.classList && scope.classList.contains('noteentry')) entries.push(scope);
        else if (own) entries.push(own);
        if (!entries.length) return;

        var all = readStoredState();
        entries.forEach(function (noteEntry) {
            var note = all[noteIdOf(noteEntry)];
            if (!note || typeof note !== 'object') return;
            noteToggles(noteEntry).forEach(function (block, rank) {
                if (note[rank] === undefined || block.open === !!note[rank]) return;
                // Putting a block back where it was is not an opening: a
                // redrawn Markdown preview is wired up a moment after it is
                // painted, and the slide would read as the page moving by
                // itself.
                block.classList.add('pz-no-anim');
                if (note[rank]) block.setAttribute('open', '');
                else block.removeAttribute('open');
                requestAnimationFrame(function () { block.classList.remove('pz-no-anim'); });
            });
        });
    }

    /**
     * A toggle was opened or closed. The event does not bubble, hence the
     * capture phase. A toggle outside a note (a public share) is not ours to
     * remember.
     */
    function onToggle(e) {
        var block = e.target;
        if (block.matches && block.matches(BLOCK)) storeState(block, block.open);
    }

    // ----------------------------------------------------------------- keys

    /** The element holding the caret, or null. */
    function caretElement() {
        var selection = window.getSelection();
        if (!selection || !selection.rangeCount) return null;
        var node = selection.getRangeAt(0).startContainer;
        if (node && node.nodeType === 3) node = node.parentNode;
        return node && node.closest ? node : null;
    }

    /** The editable toggle header holding the caret, or null. */
    function caretHeader() {
        var node = caretElement();
        var header = node ? node.closest('.toggle-block > .toggle-header') : null;
        return header && header.isContentEditable ? header : null;
    }

    /** The editable toggle holding the caret, or null. */
    function caretBlock() {
        var node = caretElement();
        var block = node ? node.closest(BLOCK) : null;
        return block && block.isContentEditable ? block : null;
    }

    /**
     * The body of a toggle when the caret sits straight in it, that is in
     * text the body holds itself rather than in a paragraph, a list or a
     * quote inside it. Null everywhere else, where the browser's own Enter
     * does the right thing.
     */
    function caretLooseContent() {
        var content = caretContent();
        if (!content) return null;
        return caretElement().closest(LINE_SELECTOR) === content ? content : null;
    }

    /** The editable body of a toggle holding the caret, at any depth. */
    function caretContent() {
        var node = caretElement();
        var content = node ? node.closest('.toggle-block > .toggle-content') : null;
        return content && content.isContentEditable ? content : null;
    }

    function isEmptyLine(node) {
        return node && node.nodeType === 1
            && /^(P|DIV)$/.test(node.tagName)
            && node.textContent.replace(/[\s​ ]/g, '') === ''
            && !node.querySelector('img, iframe, video, audio, table, hr');
    }

    function placeCaret(node, atEnd) {
        var range = document.createRange();
        range.selectNodeContents(node);
        range.collapse(!atEnd);
        var selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
    }

    function notifyEdited(node) {
        var noteEntry = node && node.closest ? node.closest('.noteentry') : null;
        if (noteEntry) noteEntry.dispatchEvent(new Event('input', { bubbles: true }));
    }

    /**
     * Step out of a toggle: an empty line right after it, caret in it. A line
     * that is already there is reused rather than doubled.
     */
    function leaveBlockAfter(block) {
        var parent = block && block.parentNode;
        if (!parent) return;

        var next = block.nextElementSibling;
        if (!isEmptyLine(next)) {
            next = document.createElement('p');
            next.appendChild(document.createElement('br'));
            parent.insertBefore(next, block.nextSibling);
            notifyEdited(block);
        }
        placeCaret(next, false);
    }

    /**
     * Backspace in an empty header removes the block and leaves an empty line
     * in its place, with whatever the block held moved out under it rather
     * than deleted.
     */
    function removeEmptyBlock(header) {
        var block = header.closest(BLOCK);
        var parent = block && block.parentNode;
        if (!parent) return;

        var line = document.createElement('p');
        line.appendChild(document.createElement('br'));
        parent.insertBefore(line, block);

        var body = block.querySelector(':scope > .toggle-content');
        var rescued = line;
        if (body) {
            while (body.firstChild) {
                parent.insertBefore(body.firstChild, block);
                rescued = body;
            }
        }
        block.remove();
        placeCaret(line, false);
        notifyEdited(rescued === line ? line : parent);
    }

    /**
     * A paragraph holding what was extracted. An extraction at the very
     * start or the very end of a text node hands back an empty text node,
     * not an empty fragment, so counting children is not enough to tell an
     * empty line: without the <br> the paragraph has no height and takes no
     * caret.
     */
    function lineFrom(fragment) {
        var line = document.createElement('p');
        line.appendChild(fragment);
        if (line.textContent === '' && !line.querySelector('*')) {
            line.textContent = '';
            line.appendChild(document.createElement('br'));
        }
        return line;
    }

    /**
     * Enter on a line the body of a toggle holds itself. Left to the
     * browser, that line IS the body: Chrome splits the <div> in two and the
     * note ends up with a second, empty .toggle-content showing its
     * placeholder under the text. The run of inline nodes around the caret
     * becomes two paragraphs instead, so every later Enter is an ordinary
     * one inside a <p>.
     */
    function splitLooseContentLine(content) {
        var selection = window.getSelection();
        var range = selection.getRangeAt(0);

        // The direct child of the body holding the caret, then the run of
        // inline siblings it belongs to: a paragraph or a list already in
        // the body bounds the run and is left alone.
        var anchor = range.startContainer;
        if (anchor === content) anchor = content.childNodes[range.startOffset] || content.lastChild;
        while (anchor && anchor.parentNode !== content) anchor = anchor.parentNode;

        var isLine = function (node) {
            return node && node.nodeType === 1 && node.matches(LINE_SELECTOR);
        };
        var first = anchor;
        while (first && isLine(first.previousSibling) === false && first.previousSibling) first = first.previousSibling;
        var last = anchor;
        while (last && isLine(last.nextSibling) === false && last.nextSibling) last = last.nextSibling;

        var head = document.createRange();
        var tail = document.createRange();
        if (first) head.setStartBefore(first); else head.setStart(content, 0);
        head.setEnd(range.startContainer, range.startOffset);
        tail.setStart(range.startContainer, range.startOffset);
        if (last) tail.setEndAfter(last); else tail.setEnd(content, content.childNodes.length);

        var after = lineFrom(tail.extractContents());
        var before = lineFrom(head.extractContents());

        head.insertNode(after);
        head.insertNode(before);
        placeCaret(after, false);
        notifyEdited(content);
    }

    // A title can be shown at a heading's size. It is a class on the
    // <summary> and not an <hN> written inside it: a Markdown note keeps its
    // toggles as raw HTML, and its parser renders <details>, <summary>, <br>
    // and <u> and escapes everything else, so a heading written there would
    // show as the text "<h2>". A class survives both notes, both sanitizers
    // and the Markdown parser, and the triangle's offsets, written in em,
    // follow the title's size on their own.
    var HEADING_CLASS = /^toggle-h[1-6]$/;

    function headerHeadingLevel(header) {
        var found = 0;
        header.classList.forEach(function (name) {
            if (HEADING_CLASS.test(name)) found = parseInt(name.slice(-1), 10);
        });
        return found;
    }

    function setHeaderHeadingLevel(header, level) {
        Array.prototype.slice.call(header.classList).forEach(function (name) {
            if (HEADING_CLASS.test(name)) header.classList.remove(name);
        });
        if (level) header.classList.add('toggle-h' + level);
    }

    /**
     * The block style menu (toolbar, slash menu) on a toggle title. Left to
     * execCommand, formatBlock wraps the whole <details> in the heading and
     * throws the body away: Chrome reads the <details> as the block the
     * caret is in. Returns false when the caret is not in a title, and the
     * usual path takes over.
     */
    function applyHeaderBlockStyle(style) {
        var header = caretHeader();
        if (!header) return false;

        var level = String(style) === 'normal' ? 0 : parseInt(style, 10);
        if (String(style) !== 'normal' && (!level || level < 1 || level > 6)) return true;
        if (headerHeadingLevel(header) === level) return true;

        setHeaderHeadingLevel(header, level);
        notifyEdited(header);
        return true;
    }

    // A menu opened from inside the header (the slash menu, the emoji
    // autocomplete) answers Enter itself, and the caret is still in the
    // header while it is up
    function pickerIsOpen() {
        return !!document.querySelector('.slash-command-menu, .emoji-autocomplete-menu');
    }

    /**
     * Where the caret sits in `box`, measured from the top of the box so
     * that a scroll moves both together. A collapsed range in an empty line
     * has no rectangle of its own, hence the fallback on its element.
     */
    function caretLineIn(box) {
        var selection = window.getSelection();
        if (!selection || !selection.rangeCount) return null;
        var rect = selection.getRangeAt(0).getBoundingClientRect();
        if (!rect || (!rect.top && !rect.height)) {
            var node = selection.focusNode;
            if (node && node.nodeType === 3) node = node.parentNode;
            if (!node || !node.getBoundingClientRect) return null;
            rect = node.getBoundingClientRect();
        }
        return Math.round(rect.top - box.getBoundingClientRect().top);
    }

    /**
     * Down from the last line of a body, with nothing under the toggle to
     * move to: a toggle at the end of a note is a room with no door, since
     * the end of the note is inside it. The line is opened the way Enter in
     * the header opens it, but only once the browser has had its go and the
     * caret has stayed on the same line: a line below, wrapped or not, is
     * the browser's business. The first Down on the last line only runs the
     * caret to the end of it, which is the same line, so the step out lands
     * on that press rather than on a second one.
     */
    function leaveBlockOnArrowDown(content) {
        var line = caretLineIn(content);
        if (line === null) return;
        setTimeout(function () {
            var now = window.getSelection();
            if (!now || !now.rangeCount || !content.contains(now.focusNode)) return;
            if (caretLineIn(content) !== line) return;
            var block = content.closest(BLOCK);
            if (block) leaveBlockAfter(block);
        }, 0);
    }

    function onKeyDown(e) {
        if (e.key !== 'Enter' && e.key !== 'Backspace' && e.key !== 'ArrowDown') return;
        if (e.defaultPrevented || e.isComposing || e.altKey || e.ctrlKey || e.metaKey) return;
        if (pickerIsOpen()) return;

        if (e.key === 'ArrowDown') {
            var content = caretContent();
            if (content && !e.shiftKey) leaveBlockOnArrowDown(content);
            return;
        }

        var header = caretHeader();
        if (!header) {
            // Shift+Enter is a soft break: the browser puts a <br> in the
            // body, which splits nothing
            var loose = (e.key === 'Enter' && !e.shiftKey) ? caretLooseContent() : null;
            if (loose) {
                e.preventDefault();
                splitLooseContentLine(loose);
            }
            return;
        }

        if (e.key === 'Enter') {
            // A header is one line: Enter steps out of the block instead of
            // breaking the line (which Chrome answers with a second summary)
            e.preventDefault();
            leaveBlockAfter(header.closest(BLOCK));
            return;
        }

        if (header.textContent.replace(/[\s​ ]/g, '') === '') {
            e.preventDefault();
            removeEmptyBlock(header);
        }
    }

    /** The editable header under the pointer, or null. */
    function pointedHeader(e) {
        var header = e.target.closest ? e.target.closest('.toggle-block > .toggle-header') : null;
        return header && header.isContentEditable ? header : null;
    }

    /** Is the pointer in the strip the triangle is drawn in? */
    function pointerOnMarker(e, header) {
        return (e.clientX - header.getBoundingClientRect().left) <= MARKER_WIDTH;
    }

    /**
     * Any title of a toggle under the pointer: the <summary> of a note or of
     * a page that only reads one, and the line a Markdown note's live
     * rendering draws in its place.
     */
    function hoveredHeader(e) {
        return e.target.closest
            ? e.target.closest('.toggle-block > .toggle-header, .cm-live-toggle-header')
            : null;
    }

    /**
     * How far from the left of a title its triangle reaches. A title nobody
     * can write in is the control as a whole, so the triangle lights up
     * wherever the pointer is on it; where the title is text, only the
     * triangle's own strip does. The live rendering draws its triangle in the
     * line, after whatever indent the line carries
     * (build/markdown-editor/src/live-preview.js uses the same 22px).
     */
    function markerStripWidth(header) {
        if (header.classList.contains('cm-live-toggle-header')) {
            return 22 + (parseFloat(getComputedStyle(header).paddingLeft) || 0);
        }
        return header.isContentEditable ? MARKER_WIDTH : Number.POSITIVE_INFINITY;
    }

    /**
     * In the editor the triangle opens and closes the block; the rest of the
     * header is text, and a click in it only moves the caret (the browser has
     * already placed it on mousedown). A header that is not editable, a
     * public page for instance, keeps the plain <details> behaviour.
     */
    function onClick(e) {
        var header = pointedHeader(e);
        if (header && !pointerOnMarker(e, header)) e.preventDefault();
    }

    // Lighting the triangle is a class on <body>, not on the header: the
    // header is note content, and a runtime class put there is saved with
    // the note. The stylesheet pairs this class with :hover, and only one
    // header can be hovered at a time, so the pair names exactly one.
    var MARKER_HOVER_CLASS = 'pz-toggle-marker-hover';
    var markerLit = false;

    function litMarker(on) {
        on = !!on;
        if (markerLit === on || !document.body) return;
        markerLit = on;
        document.body.classList.toggle(MARKER_HOVER_CLASS, on);
    }

    /**
     * The triangle lights up under the pointer and takes the hand cursor,
     * the title keeps the caret: the strip that toggles the block is the one
     * the click handler uses, so what is shown is what will happen.
     */
    function onPointerMove(e) {
        var header = hoveredHeader(e);
        litMarker(!!header
            && (e.clientX - header.getBoundingClientRect().left) <= markerStripWidth(header));
    }

    /** A header is a single line of text: a pasted document comes in flat. */
    function onPaste(e) {
        if (!caretHeader()) return;
        var data = e.clipboardData || window.clipboardData;
        if (!data) return;
        e.preventDefault();
        document.execCommand('insertText', false, data.getData('text/plain').replace(/\s*[\r\n]+\s*/g, ' '));
    }

    /**
     * Nothing but the browser writes a second <summary> (a split header, a
     * drop): the stray ones are folded back into the first, so the block
     * never ends up with two titles and a hidden one.
     */
    function onInput() {
        var block = caretBlock();
        if (!block) return;
        var summaries = block.querySelectorAll(':scope > summary');
        if (summaries.length < 2) return;

        var first = summaries[0];
        for (var i = 1; i < summaries.length; i++) {
            var text = summaries[i].textContent.trim();
            if (text) first.textContent = (first.textContent + ' ' + text).trim();
            summaries[i].remove();
        }
        placeCaret(first, true);
    }

    function init() {
        refresh(document);
        restoreState(document);
    }

    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('click', onClick);
    document.addEventListener('mousemove', onPointerMove);
    // Without capture, so this is the pointer leaving the page, not every
    // element it leaves on the way
    document.addEventListener('mouseleave', function () { litMarker(false); });
    document.addEventListener('paste', onPaste, true);
    document.addEventListener('input', onInput, true);
    document.addEventListener('toggle', onToggle, true);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.PoznoteToggleBlock = {
        createElement: createElement,
        refresh: refresh,
        restoreState: restoreState,
        applyHeaderBlockStyle: applyHeaderBlockStyle
    };
}());
