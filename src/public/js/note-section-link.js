/**
 * Section links
 *
 * A link to one section of a note rather than to the note as a whole:
 * index.php?note=12#section-getting-started. This file copies such a link and
 * follows one, in both note types and in every view (discussion 1758).
 *
 * The icon is never part of the note. It is a single button parked on <body>
 * in position: fixed and placed over the heading the pointer is on. The
 * anchors this feature had until October 2026 lived inside the heading, so
 * they had to be stripped again before every save, every draft and every
 * offline copy, and they got in the way of editing the heading itself: a
 * level change duplicated it, a Backspace left an emptied one behind. Nothing
 * here writes in the note, so none of that can come back.
 *
 * A heading is addressed by its text, not by the id its element carries: see
 * poznoteSectionSlug() in js/outline-panel.js.
 */
(function () {
    'use strict';

    const SECTION_HASH_PREFIX = 'section-';
    // How long a link waits for its note to arrive on screen, and then for
    // its section to be found in it (a Markdown preview is drawn a frame or
    // two after the note itself).
    const NOTE_WAIT_MS = 8000;
    const SECTION_WAIT_MS = 2000;
    const WATCH_INTERVAL_MS = 120;
    const SCROLL_ATTEMPTS = 4;
    const SCROLL_RECHECK_MS = 500;

    function tr(key, fallback) {
        return typeof window.t === 'function' ? window.t(key, null, fallback) : fallback;
    }

    function outline() {
        return window.outlinePanel && typeof window.outlinePanel.sections === 'function'
            ? window.outlinePanel
            : null;
    }

    function getVisibleNoteElement() {
        return document.querySelector('.notecard:not([style*="display: none"]) .noteentry');
    }

    function getVisibleNoteId(noteElement) {
        const element = noteElement || getVisibleNoteElement();
        if (!element || !element.id) return '';
        return element.id.replace('entry', '');
    }

    function getWorkspace() {
        if (typeof window.getSelectedWorkspace === 'function') {
            return window.getSelectedWorkspace() || '';
        }
        return window.selectedWorkspace || '';
    }

    // ========================================================================
    // RESOLVING A HASH TO A HEADING
    // ========================================================================

    /**
     * The slug part of a hash, whatever shape the hash has: the section-slug
     * this file writes, or one of the element ids earlier versions and the
     * public pages copy (heading-3-setup, md-heading-12-setup), whose numeric
     * part is the heading's position in the note and is dropped.
     */
    function hashToSlug(hash) {
        let raw = String(hash || '').replace(/^#/, '');
        if (!raw) return '';
        try {
            raw = decodeURIComponent(raw);
        } catch (_error) {
            // A stray % in the hash: read it as typed.
        }

        if (raw.indexOf(SECTION_HASH_PREFIX) === 0) {
            return raw.slice(SECTION_HASH_PREFIX.length);
        }

        const idMatch = /^(?:md-)?heading-\d+-(.+)$/.exec(raw);
        return idMatch ? idMatch[1] : raw;
    }

    function isSectionHash(hash) {
        const raw = String(hash || '').replace(/^#/, '');
        return raw.indexOf(SECTION_HASH_PREFIX) === 0 || /^(?:md-)?heading-\d+-/.test(raw);
    }

    /**
     * The heading of the note on screen that a slug names. Compared on the
     * slug of each heading's text, so a link keeps working when headings are
     * added or removed above the one it points at.
     */
    function findHeadingForSlug(slug, noteElement) {
        const panel = outline();
        if (!panel || !slug) return null;

        const sections = panel.sections(noteElement || getVisibleNoteElement()) || [];
        for (let i = 0; i < sections.length; i++) {
            if (sections[i].sectionSlug === slug) return sections[i];
        }

        // A link copied before the heading was renamed, or one typed by hand:
        // the first heading whose slug starts the same way still lands in the
        // right part of the note.
        const bare = slug.replace(/-\d+$/, '');
        for (let j = 0; j < sections.length; j++) {
            if (sections[j].sectionSlug === bare) return sections[j];
        }

        return null;
    }

    // ========================================================================
    // COPYING A LINK
    // ========================================================================

    function buildSectionUrl(slug, noteId) {
        const url = new URL(window.location.pathname, window.location.origin);
        url.search = '';
        url.searchParams.set('note', noteId);
        const workspace = getWorkspace();
        if (workspace) url.searchParams.set('workspace', workspace);
        url.hash = SECTION_HASH_PREFIX + slug;
        return url.href;
    }

    function copyText(text) {
        if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
            return navigator.clipboard.writeText(text);
        }

        return new Promise(function (resolve, reject) {
            try {
                const field = document.createElement('textarea');
                field.value = text;
                field.setAttribute('readonly', 'readonly');
                field.style.position = 'fixed';
                field.style.left = '-9999px';
                document.body.appendChild(field);
                field.select();
                field.setSelectionRange(0, text.length);
                const copied = document.execCommand('copy');
                document.body.removeChild(field);
                copied ? resolve() : reject(new Error('copy refused'));
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Copy a link to the section a heading opens. Either the heading element
     * (the icon on the heading, an outline row of an HTML note) or its text
     * (an outline row of a Markdown note, whose headings live in the source
     * and have no element while the editor shows no preview) names it.
     */
    function copySectionLink(headingElement, headingText) {
        const panel = outline();
        const noteElement = getVisibleNoteElement();
        const noteId = getVisibleNoteId(noteElement);
        if (!panel || !noteId) return;

        const sections = panel.sections(noteElement) || [];
        let match = null;
        if (isCodeMirrorHeadingLine(headingElement)) {
            const lineNumber = codeMirrorLineNumber(headingElement);
            if (lineNumber >= 0) {
                match = sections.find(function (section) { return section.lineNumber === lineNumber; }) || null;
            }
            // The editor hides the # markers of a heading it is not editing
            if (!match) {
                const lineText = (headingElement.textContent || '').replace(/^\s*#{1,6}\s*/, '').trim();
                match = sections.find(function (section) { return section.text === lineText; }) || null;
            }
        }
        if (!match && headingElement) {
            match = sections.find(function (section) { return section.element === headingElement; }) || null;
        }
        if (!match && headingText) {
            match = sections.find(function (section) { return section.text === headingText; }) || null;
        }
        if (!match || !match.sectionSlug) return;

        const url = buildSectionUrl(match.sectionSlug, noteId);
        copyText(url).then(function () {
            if (typeof window.poznoteShowToast === 'function') {
                window.poznoteShowToast(tr('common.link_copied', 'Link copied'));
            }
        }).catch(function (error) {
            console.debug('note-section-link: copy failed:', error);
            if (typeof window.poznoteShowToast === 'function') {
                window.poznoteShowToast(tr('attachments.errors.link_copy_failed', 'Failed to copy link'), { variant: 'warning' });
            }
        });
    }

    // ========================================================================
    // THE ICON ON THE HEADING
    // ========================================================================

    let button = null;
    let hoveredHeading = null;
    let repositionQueued = false;

    function getButton() {
        if (button) return button;

        const label = tr('common.outline.copy_section_link', 'Copy section link');
        button = document.createElement('button');
        button.type = 'button';
        button.className = 'note-section-link-btn';
        button.title = label;
        button.setAttribute('aria-label', label);
        const icon = document.createElement('i');
        icon.className = 'lucide lucide-link';
        icon.setAttribute('aria-hidden', 'true');
        button.appendChild(icon);

        // The caret stays where it is: a note is an editing host, and taking
        // the focus away to press a button would collapse the selection.
        button.addEventListener('mousedown', function (e) { e.preventDefault(); });
        button.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            if (hoveredHeading) copySectionLink(hoveredHeading, null);
        });

        document.body.appendChild(button);
        return button;
    }

    function headingUnder(target) {
        const panel = outline();
        if (!panel || !(target instanceof Element)) return null;
        if (window._isKanbanViewActive) return null;

        // A rich text note, and the preview of a Markdown one, hold real
        // heading elements. The editor views of a Markdown note hold none:
        // the note is a CodeMirror document there and a heading is one of its
        // lines.
        const heading = target.closest(panel.headingSelector) ||
            codeMirrorHeadingLineUnder(target);
        if (!heading) return null;

        const noteElement = getVisibleNoteElement();
        if (!noteElement || !noteElement.contains(heading)) return null;
        if (!(heading.textContent || '').trim()) return null;

        return heading;
    }

    function isCodeMirrorHeadingLine(element) {
        return !!(element && element.classList && element.classList.contains('cm-line'));
    }

    /**
     * The heading line of a Markdown editor under the pointer, in both shapes
     * the editor has: Live preview and Rich text draw the line at a heading's
     * size and mark it, while the plain source view (the one the split view
     * shows, and the only one when live rendering is off) writes the # out
     * and colours it with the heading token.
     */
    function codeMirrorHeadingLineUnder(target) {
        const line = target.closest('.cm-line');
        if (!line) return null;
        if (line.classList.contains('cm-live-heading')) return line;
        return line.querySelector('.poznote-cm-heading') ? line : null;
    }

    /**
     * Which line of the Markdown source a heading line of the editor is, so
     * it can be matched with the headings the outline read from that source.
     * CodeMirror only renders the lines on screen, so counting rendered ones
     * would not do: the position is asked of the editor itself.
     */
    function codeMirrorLineNumber(lineElement) {
        const api = window.PoznoteMarkdownCodeMirror;
        const host = lineElement.closest('.markdown-editor');
        if (!api || !host || typeof api.getPosAtCoords !== 'function') return -1;

        const rect = lineElement.getBoundingClientRect();
        const position = api.getPosAtCoords(host, rect.left + 2, rect.top + rect.height / 2);
        if (typeof position !== 'number') return -1;

        const line = typeof api.getLineAt === 'function' ? api.getLineAt(host, position) : null;
        if (!line || typeof line.from !== 'number') return -1;

        const source = typeof api.getValue === 'function' ? api.getValue(host) : '';
        if (!source) return -1;
        return source.slice(0, line.from).split('\n').length - 1;
    }

    // Where the heading's text ends, so the icon follows the text as GitHub's
    // does rather than sitting at the far right of an empty line.
    function headingTextEndRect(heading) {
        try {
            const range = document.createRange();
            range.selectNodeContents(heading);
            const rects = range.getClientRects();
            if (rects.length) return rects[rects.length - 1];
        } catch (_error) {
            // A heading holding something a range cannot measure.
        }
        return heading.getBoundingClientRect();
    }

    function positionButton() {
        if (!hoveredHeading || !hoveredHeading.isConnected) {
            hideButton();
            return;
        }

        const element = getButton();
        const rect = headingTextEndRect(hoveredHeading);
        const size = element.offsetHeight || 22;

        // Out of the window, or scrolled out of the note's own viewport: the
        // icon goes with it instead of hanging at the edge.
        if (rect.bottom < 0 || rect.top > window.innerHeight) {
            hideButton();
            return;
        }

        const left = Math.min(rect.right + 8, window.innerWidth - size - 8);
        element.style.left = Math.max(8, left) + 'px';
        element.style.top = (rect.top + rect.height / 2 - size / 2) + 'px';
    }

    // Measuring where the text ends reads layout, so it happens when
    // something moved the heading and not on every frame.
    function queueReposition() {
        if (repositionQueued || !hoveredHeading) return;
        repositionQueued = true;
        requestAnimationFrame(function () {
            repositionQueued = false;
            if (hoveredHeading) positionButton();
        });
    }

    function showButtonFor(heading) {
        if (hoveredHeading === heading) return;
        hoveredHeading = heading;
        getButton().classList.add('is-visible');
        positionButton();
    }

    function hideButton() {
        hoveredHeading = null;
        if (button) button.classList.remove('is-visible');
    }

    function initHoverIcon() {
        document.addEventListener('pointerover', function (e) {
            // No hover on a touch screen: there, the outline rows carry the
            // same button.
            if (e.pointerType === 'touch') return;
            if (button && (e.target === button || button.contains(e.target))) return;

            const heading = headingUnder(e.target);
            if (heading) {
                showButtonFor(heading);
            } else {
                hideButton();
            }
        });

        document.addEventListener('pointerdown', function (e) {
            if (e.pointerType !== 'touch') return;
            if (button && (e.target === button || button.contains(e.target))) return;
            hideButton();
        });

        // The note scrolls under the icon, the window is resized, or the
        // heading is being typed in.
        document.addEventListener('scroll', queueReposition, { capture: true, passive: true });
        window.addEventListener('resize', queueReposition);
        document.addEventListener('input', queueReposition);
    }

    // ========================================================================
    // FOLLOWING A LINK
    // ========================================================================

    // The section a link asked for, until its note is on screen and the
    // heading is found in it. Every way of opening a note goes through a
    // different loader (a tab, an in-page load, a full page load for another
    // workspace), so the request waits for the note rather than hooking each
    // of them.
    let pending = null;
    let watchTimer = 0;
    // The reader took the scroll over: nothing below fights them for it.
    let readerTookOver = false;

    function clearPending() {
        pending = null;
        if (watchTimer) {
            clearInterval(watchTimer);
            watchTimer = 0;
        }
    }

    function tick() {
        if (!pending) {
            clearPending();
            return;
        }

        const now = Date.now();
        const noteElement = getVisibleNoteElement();
        const noteId = getVisibleNoteId(noteElement);
        const isTarget = noteElement && (!pending.noteId || noteId === pending.noteId);

        if (!isTarget) {
            if (now > pending.noteDeadline) clearPending();
            return;
        }

        if (!pending.sectionDeadline) {
            pending.sectionDeadline = now + SECTION_WAIT_MS;
        }

        const heading = findHeadingForSlug(pending.slug, noteElement);
        if (heading) {
            clearPending();
            scrollToSection(heading, SCROLL_ATTEMPTS);
            return;
        }

        if (now > pending.sectionDeadline) {
            clearPending();
            if (typeof window.poznoteShowToast === 'function') {
                window.poznoteShowToast(
                    tr('common.outline.section_not_found', 'That section no longer exists in this note'),
                    { variant: 'warning' }
                );
            }
        }
    }

    // A note arrives in pieces: a Markdown preview is drawn a beat after the
    // note itself, and images settle later still, so the place a heading was
    // scrolled to is not where it ends up. The scroll is therefore checked
    // and done again, against the heading as it stands by then.
    function headingLooksInPlace(heading) {
        const element = heading && heading.element;
        if (!element || !element.isConnected || !element.offsetParent) return false;
        const top = element.getBoundingClientRect().top;
        return top >= 0 && top <= 260;
    }

    function scrollToSection(heading, attemptsLeft) {
        const panel = outline();
        if (!panel || typeof panel.scrollToHeading !== 'function') return;

        panel.scrollToHeading(heading);
        if (attemptsLeft <= 0) return;

        setTimeout(function () {
            if (readerTookOver) return;
            const fresh = findHeadingForSlug(heading.sectionSlug, getVisibleNoteElement()) || heading;
            if (!headingLooksInPlace(fresh)) scrollToSection(fresh, attemptsLeft - 1);
        }, SCROLL_RECHECK_MS);
    }

    function watchForReaderScroll() {
        readerTookOver = false;
        const stop = function () {
            readerTookOver = true;
            ['wheel', 'touchstart', 'keydown'].forEach(function (event) {
                window.removeEventListener(event, stop, true);
            });
        };
        ['wheel', 'touchstart', 'keydown'].forEach(function (event) {
            window.addEventListener(event, stop, { capture: true, passive: true });
        });
    }

    /**
     * Ask for a section to be scrolled to once its note is on screen. noteId
     * may be left out, for the hash of the address the page was opened with.
     */
    function requestNoteSection(noteId, hash) {
        const slug = hashToSlug(hash);
        if (!slug) return false;

        clearPending();
        watchForReaderScroll();
        pending = {
            noteId: noteId ? String(noteId) : '',
            slug: slug,
            noteDeadline: Date.now() + NOTE_WAIT_MS,
            sectionDeadline: 0
        };
        watchTimer = setInterval(tick, WATCH_INTERVAL_MS);
        tick();
        return true;
    }

    /**
     * The same, for a link whose address carries the section. Every handler
     * that opens an internal link goes through this: the editor's own
     * (js/events-rte-fields.js), the one that saves first when the note has
     * unsaved changes (js/events-navigation.js) and the one that reads
     * data-note-id (js/note-reference.js). Each of them is the only one to
     * run in some case, and none of them passes the address on to the loader.
     */
    function requestSectionFromHref(href, noteId) {
        const raw = String(href || '');
        const hashIndex = raw.indexOf('#');
        if (hashIndex < 0) return false;
        return requestNoteSection(noteId, raw.slice(hashIndex));
    }

    // The hash a full page load carries, for a link that had to switch
    // workspace and for one opened in a new browser tab.
    function requestSectionFromAddressBar() {
        if (!isSectionHash(window.location.hash)) return;
        requestNoteSection(null, window.location.hash);
    }

    function init() {
        initHoverIcon();
        requestSectionFromAddressBar();
        window.addEventListener('hashchange', requestSectionFromAddressBar);
    }

    window.poznoteCopySectionLink = copySectionLink;
    window.poznoteRequestNoteSection = requestNoteSection;
    window.poznoteRequestSectionFromHref = requestSectionFromHref;
    window.poznoteSectionHashPrefix = SECTION_HASH_PREFIX;
    // The hash a pending request is waiting for, so a loader that reloads the
    // page can carry it over in the address.
    window.poznotePendingSectionHash = function (noteId) {
        if (!pending || !pending.slug) return '';
        if (pending.noteId && noteId && String(noteId) !== pending.noteId) return '';
        return SECTION_HASH_PREFIX + pending.slug;
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
