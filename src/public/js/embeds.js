/**
 * Embeds: the hosts a note may frame, and what the reader sees when one is refused.
 *
 * The list of allowed hosts is built by the server from lib/embed-providers.php
 * and handed over as window.ALLOWED_IFRAME_DOMAINS. It is the same list that
 * the sanitiser enforces when a note is saved and that the Content Security
 * Policy of the page carries, so an embed this file calls blocked is one the
 * browser refuses to load anyway.
 *
 * Without the notice, such an embed is an empty grey rectangle and an error in
 * the developer console, which says nothing to a reader: the administrator
 * switched a provider off, or the note arrived from an instance that allowed
 * more hosts than this one. So the frame is hidden and a short explanation
 * takes its place, with a link to the page the note meant to show.
 *
 * The notice is presentation only and must never reach the stored note: the
 * frame keeps every attribute it had, and stripSearchHighlights() in js/notes.js
 * drops the notice and the marker from the copy that is saved, compared and
 * drafted. Nothing here changes the note, so opening one cannot make it dirty.
 */

(function () {
    'use strict';

    /** Where a blocked embed may be rewritten: note content, nothing else. */
    var NOTE_SCOPES = '.noteentry, .public-note';

    /**
     * Hosts an embed may come from: the list the page received from the server.
     * No list means nothing is embeddable rather than everything, so a page
     * that forgot to publish it refuses embeds instead of trusting them.
     * @returns {string[]}
     */
    function allowedEmbedDomains() {
        var domains = window.ALLOWED_IFRAME_DOMAINS;
        return Array.isArray(domains) ? domains : [];
    }

    /**
     * Same rule as poznoteIframeSrcIsTrusted() server-side: exact host match
     * (or a subdomain of an allowed domain) over http(s), plus same-origin
     * relative paths. A trusted name anywhere else in the URL does not count.
     * @param {string} src - The iframe src attribute
     * @returns {boolean} True when the embed may be framed
     */
    function embedSrcAllowed(src) {
        src = (src || '').trim();
        if (src === '') return false;

        if (src.indexOf('//') === 0) return false;
        if (src.charAt(0) === '/' || src.indexOf('./') === 0) return true;

        var url;
        try {
            url = new URL(src, window.location.href);
        } catch (e) {
            return false;
        }
        if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;

        var host = url.hostname.toLowerCase();
        return allowedEmbedDomains().some(function (domain) {
            domain = String(domain).toLowerCase();
            return host === domain || host.slice(-(domain.length + 1)) === '.' + domain;
        });
    }

    /**
     * The host to name in the notice, or '' when this frame is not a refused
     * embed. Only a real http(s) frame is judged: a same-origin player, an
     * about:blank or a srcdoc frame is left alone.
     * @param {HTMLIFrameElement} frame
     * @returns {string}
     */
    function refusedHost(frame) {
        var src = (frame.getAttribute('src') || '').trim();
        if (src === '') return '';

        var url;
        try {
            url = new URL(src, window.location.href);
        } catch (e) {
            return '';
        }
        if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
        if (embedSrcAllowed(src)) return '';

        return url.hostname.toLowerCase();
    }

    /**
     * The sentences to show. Both pages that render note content publish them
     * (index.php, public_note.php) already translated: the public page has no
     * JavaScript translator, and a visitor is told what happened without the
     * administrator's half of it, which they could not act on.
     * @returns {{title: string, detail: string, open: string}}
     */
    function noticeText() {
        var text = window.POZNOTE_EMBED_BLOCKED;
        return {
            title: (text && text.title) || 'Embedded content blocked',
            detail: (text && text.detail) || 'Content from {{host}} cannot be displayed here.',
            open: (text && text.open) || 'Open in a new tab'
        };
    }

    /**
     * @param {string} host - Host of the refused embed
     * @param {string} src - Its URL, offered as a link
     * @param {string} [source] - The refused markup, shown as written: hiding
     *   the frame must not hide what the author put in the note
     * @returns {HTMLElement}
     */
    function buildNotice(host, src, source) {
        var text = noticeText();

        var notice = document.createElement('div');
        notice.className = 'embed-blocked';
        notice.setAttribute('data-embed-blocked-notice', '1');
        // Note content is editable in the app: the notice is not part of the
        // note and must not take the caret.
        notice.setAttribute('contenteditable', 'false');

        var icon = document.createElement('i');
        icon.className = 'lucide lucide-eye-off embed-blocked-icon';
        icon.setAttribute('aria-hidden', 'true');
        notice.appendChild(icon);

        var body = document.createElement('div');
        body.className = 'embed-blocked-text';

        var title = document.createElement('strong');
        title.textContent = text.title;
        body.appendChild(title);

        var detail = document.createElement('span');
        detail.textContent = text.detail.split('{{host}}').join(host);
        body.appendChild(detail);

        if (source) {
            var written = document.createElement('code');
            written.className = 'embed-blocked-source';
            written.textContent = String(source).trim();
            body.appendChild(written);
        }

        var link = document.createElement('a');
        link.href = src;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = text.open;
        body.appendChild(link);

        notice.appendChild(body);
        return notice;
    }

    /**
     * Make an embed measure itself again once it has loaded.
     *
     * A frame from another site only re-measures when its own box changes, and
     * some of them (a GeoGebra applet) draw their furniture but leave the
     * drawing empty when they booted on a box that was not settled yet: the
     * reader gets the toolbars and no graph until something resizes the frame.
     * One pixel less for one frame, then back, is that something.
     *
     * Only a frame nobody has given a size to: a size set by hand is the
     * reader's and is left alone.
     *
     * @param {HTMLIFrameElement} frame
     */
    function settleAfterLoad(frame) {
        if (frame.style.width !== '') return;

        var done = false;

        function settle() {
            if (done) return;
            done = true;
            if (frame.style.width !== '') return;

            var width = frame.getBoundingClientRect().width;
            if (!(width > 2)) return;

            requestAnimationFrame(function () {
                frame.style.width = (width - 1) + 'px';
                requestAnimationFrame(function () {
                    frame.style.width = '';
                });
            });
        }

        // Twice, because a frame rendered with the page may well have finished
        // loading before anything here could listen, and a cross-origin frame
        // cannot be asked whether it is done.
        frame.addEventListener('load', settle, { once: true });
        setTimeout(settle, 1500);
    }

    /**
     * Hide every refused embed of a note and put the notice in its place.
     * Safe to call again: a frame already handled carries the marker.
     * @param {Document|HTMLElement} [root] - Where to look, the document by default
     */
    function markBlockedEmbeds(root) {
        // An unknown list is not an empty one: a page that did not publish the
        // allowed hosts must not have every embed of every note struck out.
        if (!Array.isArray(window.ALLOWED_IFRAME_DOMAINS)) return;

        var scope = (root && typeof root.querySelectorAll === 'function') ? root : document;
        var frames = scope.querySelectorAll('iframe:not([data-embed-blocked])');

        for (var i = 0; i < frames.length; i++) {
            var frame = frames[i];
            if (!frame.closest || !frame.closest(NOTE_SCOPES)) continue;

            var host = refusedHost(frame);
            if (host === '') {
                if (!frame.hasAttribute('data-embed-settled')) {
                    frame.setAttribute('data-embed-settled', '1');
                    settleAfterLoad(frame);
                }
                continue;
            }

            // Read before the marker is set: what the note holds, not what
            // this pass did to it.
            var written = frame.outerHTML;
            frame.setAttribute('data-embed-blocked', '1');
            if (frame.parentNode) {
                frame.parentNode.insertBefore(
                    buildNotice(host, frame.getAttribute('src'), written),
                    frame.nextSibling
                );
            }
        }
    }

    /**
     * The same notice as HTML, for a renderer that rebuilds note content from
     * its source and never puts the frame in the page: the Markdown parser
     * escapes a refused tag, leaving the reader its source code.
     * @param {string} src - The refused src
     * @param {string} [source] - The refused markup, shown as written
     * @returns {string}
     */
    function blockedEmbedNoticeHtml(src, source) {
        var host = '';
        try {
            host = new URL(src, window.location.href).hostname.toLowerCase();
        } catch (e) {
            host = '?';
        }
        return buildNotice(host || '?', src, source).outerHTML;
    }

    window.poznoteEmbedSrcAllowed = embedSrcAllowed;
    window.poznoteBlockedEmbedNoticeHtml = blockedEmbedNoticeHtml;
    window.poznoteMarkBlockedEmbeds = markBlockedEmbeds;

    // The pages that only read a note have no load sequence to hook into.
    // In the app, note content arrives after this runs, so js/note-content-init.js
    // and the Markdown preview call back in.
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            markBlockedEmbeds(document);
        }, { once: true });
    } else {
        markBlockedEmbeds(document);
    }
})();
