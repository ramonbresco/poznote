/**
 * The browser tab follows the open note.
 *
 * Off by default, the tab keeps the instance's name and icon, as it always
 * has. Switched on (Settings > Display > "Tab follows the open note"), the
 * title of the tab becomes the title of the note on screen and its icon
 * becomes the note's icon, in the note's colour, so several tabs open on
 * several notes can be told apart.
 *
 * The icon is built from what the page already has: a Lucide icon is a CSS
 * mask whose image is an inline SVG (css/lucide.css), so the icon drawn next
 * to the note title is read back from the computed style and served to the
 * browser as the tab icon. Nothing is downloaded, and an icon this version
 * does not know simply leaves the tab icon alone.
 */
(function () {
    'use strict';

    var config = window.POZNOTE_CONFIG || {};
    if (!config.tabFollowsNote) {
        return;
    }

    var baseTitle = document.title;
    // The icon links the page was served with, so they can be put back
    var baseIcons = Array.prototype.map.call(
        document.querySelectorAll('link[rel~="icon"]'),
        function (link) {
            return { rel: link.getAttribute('rel'), href: link.getAttribute('href'), type: link.getAttribute('type'), sizes: link.getAttribute('sizes') };
        }
    );
    var ownLink = null;

    function noteCardOnScreen() {
        return document.querySelector('#right_col .notecard');
    }

    function noteTitleOnScreen(card) {
        var input = card ? card.querySelector('input.css-title') : null;
        var value = input ? String(input.value || '').trim() : '';
        return value;
    }

    /**
     * The SVG a Lucide class paints, taken from the mask of a live element.
     * Returns '' when the browser reports no mask (an icon the stylesheet
     * does not carry, a font icon, an emoji).
     */
    function svgFromIconElement(el) {
        if (!el || typeof window.getComputedStyle !== 'function') {
            return '';
        }
        var style = window.getComputedStyle(el);
        var mask = style.maskImage || style.webkitMaskImage || '';
        var match = /url\(["']?(data:image\/svg\+xml,[^"')]+)["']?\)/.exec(mask);
        if (!match) {
            return '';
        }
        try {
            return decodeURIComponent(match[1].slice('data:image/svg+xml,'.length));
        } catch (e) {
            return '';
        }
    }

    function iconColour(el) {
        if (!el || typeof window.getComputedStyle !== 'function') {
            return '#111827';
        }
        var colour = window.getComputedStyle(el).backgroundColor;
        // A mask is painted with background-color; transparent means the
        // element takes its colour from somewhere else
        if (!colour || colour === 'rgba(0, 0, 0, 0)' || colour === 'transparent') {
            colour = window.getComputedStyle(el).color;
        }
        return colour || '#111827';
    }

    function setTabIcon(href) {
        if (!ownLink) {
            ownLink = document.createElement('link');
            ownLink.setAttribute('rel', 'icon');
            ownLink.setAttribute('type', 'image/svg+xml');
            document.head.appendChild(ownLink);
        }
        ownLink.setAttribute('href', href);
        // The icons of the page itself would win over ours in some browsers
        Array.prototype.forEach.call(document.querySelectorAll('link[rel~="icon"]'), function (link) {
            if (link !== ownLink) {
                link.remove();
            }
        });
    }

    function restoreTabIcon() {
        if (!ownLink) {
            return;
        }
        ownLink.remove();
        ownLink = null;
        if (document.querySelector('link[rel~="icon"]')) {
            return;
        }
        baseIcons.forEach(function (icon) {
            var link = document.createElement('link');
            link.setAttribute('rel', icon.rel || 'icon');
            if (icon.href) link.setAttribute('href', icon.href);
            if (icon.type) link.setAttribute('type', icon.type);
            if (icon.sizes) link.setAttribute('sizes', icon.sizes);
            document.head.appendChild(link);
        });
    }

    function apply() {
        var card = noteCardOnScreen();
        var title = noteTitleOnScreen(card);

        document.title = title !== '' ? title + ' - ' + baseTitle : baseTitle;

        var iconEl = card ? card.querySelector('.note-title-heading .note-icon') : null;
        var svg = svgFromIconElement(iconEl);
        if (svg === '') {
            restoreTabIcon();
            return;
        }
        // The mask SVG is drawn with currentColor, which means black on its
        // own: paint it with the colour the note icon is wearing.
        svg = svg.split('currentColor').join(iconColour(iconEl));
        setTabIcon('data:image/svg+xml,' + encodeURIComponent(svg));
    }

    var pending = null;
    function scheduleApply() {
        clearTimeout(pending);
        pending = setTimeout(apply, 80);
    }

    document.addEventListener('DOMContentLoaded', scheduleApply);
    if (document.readyState !== 'loading') {
        scheduleApply();
    }

    // The note pane is swapped without a page load (js/note-loader.js), the
    // title is edited in place, and the icon is changed from its picker.
    var pane = document.getElementById('right_pane') || document.body;
    if (window.MutationObserver && pane) {
        new MutationObserver(scheduleApply).observe(pane, { childList: true, subtree: true });
    }
    document.addEventListener('input', function (e) {
        if (e.target && e.target.classList && e.target.classList.contains('css-title')) {
            scheduleApply();
        }
    });
})();
