/**
 * Resizing an embed in a note: the grip an iframe cannot carry itself.
 *
 * An image is resized through its own menu (js/note-image-actions.js), which
 * opens on a click on the image. That road is closed for an embed: neither a
 * click nor a right click on an iframe ever reaches this page, both go to the
 * document inside it, which is also why an embed has no menu at all. So the
 * grip lives on its own line just under the frame, where the pointer can
 * actually reach it, and the drag runs behind an overlay, without which the
 * frame would swallow every pointermove as soon as the pointer crossed it.
 *
 * The size is written as an inline style, which outranks the stylesheet rule
 * that gives an applet the width of the note: a frame nobody resized follows
 * the page, a frame someone resized keeps what they gave it. Both sanitisers
 * keep style on an iframe, so it survives saving, reloading and a public share.
 *
 * The grip itself is never part of the note: stripSearchHighlights()
 * (js/notes.js) drops it from the copy that is saved, compared and drafted.
 */

(function () {
    'use strict';

    var MIN_SIZE = 80;
    var GRIP_ATTRIBUTE = 'data-embed-resize-grip';

    /**
     * Embeds a reader may resize: the ones this editor owns. The audio player
     * has its own size, a blocked embed has no frame to speak of, and the
     * Markdown views draw their frames from the source text, where a size
     * dragged here would have nowhere to be written.
     *
     * Whether the note takes an edit is left to the stylesheet, which hides
     * the grip while the note is not editable: the editable flag is set after
     * the note is in the page, so asking for it here would be asking too early.
     *
     * A Markdown note is included: its frames are drawn from the source, so
     * the size is written back into the tag there (writeMarkdownSize).
     * @param {Document|HTMLElement} root
     * @returns {HTMLIFrameElement[]}
     */
    function resizableEmbeds(root) {
        var scope = (root && typeof root.querySelectorAll === 'function') ? root : document;
        var frames = scope.querySelectorAll('.noteentry iframe');
        var out = [];

        for (var i = 0; i < frames.length; i++) {
            var frame = frames[i];
            if (frame.hasAttribute('data-is-audio') || frame.hasAttribute('data-embed-blocked')) continue;
            if (frame.closest('.tasklist-embed')) continue;
            out.push(frame);
        }
        return out;
    }

    function noteOf(frame) {
        return frame.closest ? frame.closest('.noteentry') : null;
    }

    /**
     * The widest an embed may be: the note itself, so a drag cannot push it
     * out of the page.
     * @param {HTMLIFrameElement} frame
     * @returns {number}
     */
    function maxWidthFor(frame) {
        var note = noteOf(frame);
        var width = note ? note.clientWidth : 0;
        return width > MIN_SIZE ? width : 4000;
    }

    function gripOf(frame) {
        var next = frame.nextElementSibling;
        return (next && next.hasAttribute && next.hasAttribute(GRIP_ATTRIBUTE)) ? next : null;
    }

    /**
     * Keep the grip as wide as the frame it belongs to, so its handle sits
     * under the bottom right corner whatever the frame is doing.
     * @param {HTMLIFrameElement} frame
     * @param {HTMLElement} grip
     */
    function syncGripWidth(frame, grip) {
        var width = frame.offsetWidth;
        grip.style.width = width > 0 ? width + 'px' : '100%';
    }

    function gripLabel() {
        if (typeof window.t === 'function') {
            return window.t('embeds.resize.hint', {}, 'Drag to resize, double-click to reset');
        }
        return 'Drag to resize, double-click to reset';
    }

    /**
     * Give every embed of a note its grip. Safe to call again.
     * @param {Document|HTMLElement} [root]
     */
    function refreshEmbedGrips(root) {
        var frames = resizableEmbeds(root);

        for (var i = 0; i < frames.length; i++) {
            var frame = frames[i];
            if (gripOf(frame)) continue;

            var grip = document.createElement('div');
            grip.className = 'embed-resize-grip';
            grip.setAttribute(GRIP_ATTRIBUTE, '1');
            grip.setAttribute('contenteditable', 'false');
            grip.setAttribute('title', gripLabel());
            grip.setAttribute('aria-hidden', 'true');

            var handle = document.createElement('span');
            handle.className = 'embed-resize-grip-handle';
            grip.appendChild(handle);

            if (!frame.parentNode) continue;
            frame.parentNode.insertBefore(grip, frame.nextSibling);
            syncGripWidth(frame, grip);

            watchFrame(frame, grip);
        }
    }

    /**
     * @param {HTMLIFrameElement} frame
     * @param {HTMLElement} grip
     */
    function watchFrame(frame, grip) {
        if (typeof ResizeObserver === 'function') {
            var observer = new ResizeObserver(function () {
                if (!grip.isConnected) {
                    observer.disconnect();
                    return;
                }
                syncGripWidth(frame, grip);
            });
            observer.observe(frame);
        }

        grip.addEventListener('pointerdown', function (event) {
            startResize(event, frame, grip);
        });

        // A size given by hand goes back to the one the page would give it.
        grip.addEventListener('dblclick', function (event) {
            event.preventDefault();
            frame.style.width = '';
            frame.style.height = '';
            syncGripWidth(frame, grip);
            if (writeMarkdownSize(frame, null, null)) return;
            noteChanged(frame);
        });
    }

    /**
     * The same two steps an image resize takes (js/note-image-actions.js):
     * the note is marked edited, then written. triggerNoteSave() is not a
     * window function, which is why this went through unsaved at first.
     */
    /**
     * The CodeMirror editor of a Markdown note, and the API that writes to it.
     * @param {HTMLIFrameElement} frame
     * @returns {{api: Object, editor: HTMLElement}|null}
     */
    function markdownEditorFor(frame) {
        var note = noteOf(frame);
        if (!note || note.getAttribute('data-note-type') !== 'markdown') return null;

        var api = window.PoznoteMarkdownCodeMirror;
        if (!api || typeof api.getValue !== 'function' || typeof api.replaceRange !== 'function') return null;

        var editor = note.querySelector('.markdown-editor');
        if (!editor) return null;
        if (typeof api.isCodeMirrorEditor === 'function' && !api.isCodeMirrorEditor(editor)) return null;

        return { api: api, editor: editor };
    }

    /**
     * Put a size into an embed tag written by hand, or take it out again.
     *
     * The size goes in the style, not in the width and height of the tag: an
     * applet is given the width of the note by the stylesheet, which a width
     * attribute does not outrank. The attributes are left exactly as the embed
     * code wrote them, so dropping the style is a real reset.
     *
     * @param {string} line - The source line holding the tag
     * @param {number|null} width - null takes the size out
     * @param {number|null} height
     * @returns {string}
     */
    function tagWithSize(line, width, height) {
        var size = (width === null) ? '' : ('width:' + width + 'px;height:' + height + 'px');

        if (/style\s*=\s*"[^"]*"/i.test(line)) {
            return line.replace(/\s*style\s*=\s*"([^"]*)"/i, function (match, value) {
                var kept = value.split(';').filter(function (declaration) {
                    return declaration.trim() !== '' && !/^\s*(width|height)\s*:/i.test(declaration);
                }).join(';');
                var merged = size ? (size + (kept ? ';' + kept : '')) : kept;
                return merged ? ' style="' + merged + '"' : '';
            });
        }

        return size ? line.replace(/<iframe\b/i, '<iframe style="' + size + '"') : line;
    }

    /**
     * Write the size of a Markdown embed where it belongs, in the note source.
     * The views are drawn from it, so anything set on the element itself is
     * gone at the next redraw.
     *
     * @param {HTMLIFrameElement} frame
     * @param {number|null} width - null puts the tag back as it was written
     * @param {number|null} height
     * @returns {boolean} True when the source was the right place to write
     */
    function writeMarkdownSize(frame, width, height) {
        var cm = markdownEditorFor(frame);
        if (!cm) return false;

        var src = frame.getAttribute('src') || '';
        if (src === '') return true;

        var text = cm.api.getValue(cm.editor);
        var lines = text.split('\n');
        var found = -1;
        var hits = 0;

        for (var i = 0; i < lines.length; i++) {
            if (lines[i].indexOf('<iframe') !== -1 && lines[i].indexOf(src) !== -1) {
                found = i;
                hits++;
            }
        }

        // Two embeds of the same address: the preview knows which line it drew.
        if (hits !== 1) {
            var host = frame.closest('[data-line]');
            var line = host ? parseInt(host.getAttribute('data-line'), 10) : NaN;
            if (isNaN(line) || !lines[line] || lines[line].indexOf('<iframe') === -1) return true;
            found = line;
        }

        var updated = tagWithSize(lines[found], width, height);
        if (updated === lines[found]) return true;

        var from = 0;
        for (var j = 0; j < found; j++) {
            from += lines[j].length + 1;
        }
        // Keeping the selection where it was matters in Live preview, where the
        // line holding the caret shows its source instead of the embed: moving
        // the caret onto this one turned the applet back into its tag.
        var caret = (typeof cm.api.getSelectionOffsets === 'function')
            ? cm.api.getSelectionOffsets(cm.editor)
            : null;
        var keepAt = caret ? Math.max(caret.start, caret.end) : null;

        if (keepAt !== null && typeof cm.api.replaceRangeKeepSelection === 'function'
            && cm.api.replaceRangeKeepSelection(cm.editor, from, from + lines[found].length, updated, keepAt)) {
            // done
        } else {
            cm.api.replaceRange(cm.editor, from, from + lines[found].length, updated);
        }

        if (typeof window.renderMarkdownPreview === 'function') {
            var note = noteOf(frame);
            var noteId = note && note.id ? note.id.replace('entry', '') : null;
            if (noteId) {
                try {
                    window.renderMarkdownPreview(noteId);
                } catch (error) {
                    console.warn('Could not redraw the preview after a resize:', error);
                }
            }
        }
        return true;
    }

    function noteChanged(frame) {
        // window.noteid is "the note being edited" and stays -1 until the note
        // is focused, so a drag right after a page load saved nothing at all.
        // js/attachments.js names the note the same way before writing.
        var note = noteOf(frame);
        var id = note && note.id ? parseInt(note.id.replace('entry', ''), 10) : NaN;
        if (!isNaN(id) && id > 0) {
            window.noteid = id;
        }

        if (typeof window.markNoteAsModified === 'function') {
            window.markNoteAsModified();
        }
        if (typeof window.saveNoteImmediately === 'function') {
            window.saveNoteImmediately();
        } else if (typeof window.saveNoteToServer === 'function') {
            window.saveNoteToServer();
        }
    }

    /**
     * Drag behind an overlay: a pointer over an iframe reports to the document
     * inside it, so without one the drag would stop at the frame's edge.
     * @param {PointerEvent} event
     * @param {HTMLIFrameElement} frame
     * @param {HTMLElement} grip
     */
    function startResize(event, frame, grip) {
        if (event.button !== undefined && event.button !== 0) return;

        // A note held read only (the lock, a read-only share) keeps its size.
        // A Markdown note is never editable itself, its editor is CodeMirror.
        var note = noteOf(frame);
        if (!note) return;
        if (note.closest('.notecard[data-note-locked="1"]')) return;
        if (!note.isContentEditable && note.getAttribute('data-note-type') !== 'markdown') return;

        // No preventDefault here: it would suppress the click and the double
        // click the browser builds from this press, and the double click is
        // what puts the size back. Selection is held off for the drag instead.
        event.stopPropagation();
        document.body.style.userSelect = 'none';

        var startX = event.clientX;
        var startY = event.clientY;
        var startWidth = frame.offsetWidth;
        var startHeight = frame.offsetHeight;
        var limit = maxWidthFor(frame);

        var overlay = null;
        var moved = false;

        function onMove(moveEvent) {
            if (!moved && Math.abs(moveEvent.clientX - startX) < 2 && Math.abs(moveEvent.clientY - startY) < 2) {
                return;
            }
            if (!moved) {
                // Only once the drag is real: an overlay laid down on the press
                // would take the release, and the browser would build no click
                // and no double click out of it, which is how the size is reset.
                moved = true;
                overlay = document.createElement('div');
                overlay.className = 'embed-resize-overlay';
                document.body.appendChild(overlay);
                document.body.classList.add('pz-resizing');
                grip.classList.add('is-resizing');
            }
            moveEvent.preventDefault();
            var width = Math.round(Math.min(limit, Math.max(MIN_SIZE, startWidth + (moveEvent.clientX - startX))));
            var height = Math.round(Math.max(MIN_SIZE, startHeight + (moveEvent.clientY - startY)));
            frame.style.width = width + 'px';
            frame.style.height = height + 'px';
            syncGripWidth(frame, grip);
        }

        function onUp() {
            document.removeEventListener('pointermove', onMove);
            document.removeEventListener('pointerup', onUp);
            document.removeEventListener('pointercancel', onUp);
            if (overlay) overlay.remove();
            document.body.classList.remove('pz-resizing');
            grip.classList.remove('is-resizing');
            document.body.style.userSelect = '';

            // A press that went nowhere, the first half of a double click for
            // instance, is not a resize and must not write the note.
            if (!moved) return;

            if (writeMarkdownSize(frame, frame.offsetWidth, frame.offsetHeight)) {
                // The source is the note: the editor's own writing marks it.
                return;
            }
            noteChanged(frame);
        }

        // On the document, not on the overlay: the overlay is there to keep the
        // pointer out of the frame and to hold the cursor, the events reach the
        // document either way.
        document.addEventListener('pointermove', onMove);
        document.addEventListener('pointerup', onUp);
        document.addEventListener('pointercancel', onUp);
    }

    /**
     * A note redraws itself in more ways than there are hooks to follow: the
     * live Markdown views rebuild their frames as CodeMirror decorations, a
     * preview is thrown away and drawn again, an image arrives from an upload.
     * What comes back carries no handle, and a pointer cannot report it, since
     * over an embed it belongs to the document inside the frame. So the note
     * itself is watched.
     *
     * Debounced, and out of the update that caused it: the grip is written
     * into the editor's own DOM, which CodeMirror is in the middle of.
     */
    function watchNoteRedraws() {
        if (typeof MutationObserver !== 'function') return;

        var pending = null;

        function schedule() {
            if (pending) return;
            pending = setTimeout(function () {
                pending = null;
                refreshResizeHandles(document);
            }, 150);
        }

        var observer = new MutationObserver(function (records) {
            for (var i = 0; i < records.length; i++) {
                var added = records[i].addedNodes;
                for (var j = 0; j < added.length; j++) {
                    var node = added[j];
                    if (!node || node.nodeType !== 1 || !node.matches) continue;
                    // Only what can wear a handle: wrapping an image moves it,
                    // which lands here once more and then finds nothing to do.
                    if (node.matches('img, iframe') || node.querySelector('img, iframe')) {
                        schedule();
                        return;
                    }
                }
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    /**
     * Both kinds of handle at once: the callers (a note arriving, a Markdown
     * redraw, a paste) have no reason to know there are two.
     * @param {Document|HTMLElement} [root]
     */
    function refreshResizeHandles(root) {
        refreshEmbedGrips(root);
        if (typeof window.poznoteRefreshImageResizeHandles === 'function') {
            window.poznoteRefreshImageResizeHandles(root);
        }
    }

    window.poznoteRefreshEmbedGrips = refreshResizeHandles;
    window.poznoteRefreshResizeHandles = refreshResizeHandles;

    // Twice: the note is in the page at DOMContentLoaded, its frames may still
    // be arriving. Both passes are idempotent, and js/note-content-init.js
    // calls back for a note loaded without a page load.
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            refreshResizeHandles(document);
        }, { once: true });
    } else {
        refreshResizeHandles(document);
    }
    window.addEventListener('load', function () {
        refreshResizeHandles(document);
    }, { once: true });
    watchNoteRedraws();
})();
