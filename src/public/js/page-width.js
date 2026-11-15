/**
 * Page width slider, in a popover of the toolbar of the speed dial, the
 * dashboard and the attachments page (speed_dial.php, dashboard.php,
 * attachments_list.php), rendered by poznoteRenderPageWidthSlider().
 *
 * The width of the page's content (the grid, the cards, the list: not the
 * title nor the toolbar), as a percentage of the room beside the icon rail,
 * kept in this browser (__poznoteUserStorage, one key per page). It is a CSS
 * variable on <html>, which js/theme-init.js sets before the page paints and
 * which the page's stylesheet reads; without one the page keeps its own
 * layout. A browser that has never stored a width starts from the former
 * account setting (data-legacy-value).
 */
document.addEventListener('DOMContentLoaded', function () {
    'use strict';

    var row = document.querySelector('[data-page-width]');
    if (!row) return;

    var input = row.querySelector('.page-more-menu-slider-input');
    var output = row.querySelector('.page-more-menu-slider-value');
    // The popover the slider sits in, and its button
    var toggle = document.querySelector('[data-page-width-toggle]');
    var popup = toggle ? document.getElementById(toggle.getAttribute('aria-controls')) : null;
    var storageKey = row.getAttribute('data-storage-key');
    var storage = window.__poznoteUserStorage;
    var cssVar = row.getAttribute('data-css-var');
    var column = document.querySelector(row.getAttribute('data-column'));
    var min = parseInt(input.min, 10);
    var max = parseInt(input.max, 10);
    var step = parseInt(input.step, 10);

    function readWidth(raw) {
        var width = parseInt(raw, 10);
        return isNaN(width) ? null : Math.min(max, Math.max(min, width));
    }

    // The width the page has without a setting: the dashboard's is full
    // width, the speed dial's is a column of its own, null here
    var defaultWidth = readWidth(row.getAttribute('data-default-width'));
    // Stored as '' for the page's own layout; absent (null) until this
    // browser first stores a width, when the former account setting is used
    var stored = storage ? storage.getItem(storageKey) : null;
    var width = readWidth(stored === null ? row.getAttribute('data-legacy-value') : stored);

    // Without a setting, the dashboard says "Full width" like the slider at 100
    function label(value) {
        if (value === null && defaultWidth !== null) value = defaultWidth;
        if (value === null) return row.getAttribute('data-label-default') || 'Default';
        if (value >= 100) return row.getAttribute('data-label-full') || 'Full width';
        return value + ' %';
    }

    // Where the thumb sits without a setting: the page's own width, read off
    // the column against the room it is a percentage of
    function measuredWidth() {
        if (defaultWidth !== null) return defaultWidth;
        if (!column || !column.parentElement) return max;

        var parent = column.parentElement;
        var style = window.getComputedStyle(parent);
        var room = parent.clientWidth - (parseFloat(style.paddingLeft) || 0) - (parseFloat(style.paddingRight) || 0);
        if (room <= 0) return max;

        var percent = Math.round(column.getBoundingClientRect().width / room * 100 / step) * step;
        return Math.min(max, Math.max(min, percent));
    }

    function show() {
        input.value = String(width === null ? measuredWidth() : width);
        output.textContent = label(width);
        input.setAttribute('aria-valuetext', label(width));
    }

    function apply() {
        var root = document.documentElement;
        if (width === null) {
            root.style.removeProperty(cssVar);
        } else {
            root.style.setProperty(cssVar, width + '%');
        }
    }

    function save() {
        if (storage) storage.setItem(storageKey, width === null ? '' : String(width));
    }

    // The former account setting, taken over by this browser: applied (the
    // head script had nothing to read yet) and stored, so it is read before
    // the page paints from now on
    if (stored === null && width !== null) {
        apply();
        save();
    }

    // The page follows the thumb as it moves. The width the page has anyway
    // is stored as no setting at all.
    input.addEventListener('input', function () {
        var value = readWidth(input.value);
        width = value === defaultWidth ? null : value;
        apply();
        show();
        save();
    });

    // Measured when the popover opens: the room changes with the
    // window, the docked panels and the rail
    if (popup && typeof MutationObserver === 'function') {
        new MutationObserver(function () {
            if (!popup.hidden) show();
        }).observe(popup, { attributes: true, attributeFilter: ['hidden'] });
    }

    // The dashboard's popover is fixed, as its toolbar is a scroller that
    // would clip it: it is placed under its button on open. The speed dial's
    // hangs from its button in CSS.
    if (toggle && popup) {
        var setOpen = function (open) {
            popup.hidden = !open;
            toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
            if (!open) return;

            if (window.getComputedStyle(popup).position === 'fixed') {
                var rect = toggle.getBoundingClientRect();
                popup.style.top = (rect.bottom + 6) + 'px';
                popup.style.left = Math.max(8, Math.min(rect.left, window.innerWidth - popup.offsetWidth - 8)) + 'px';
            }
            input.focus();
        };

        toggle.addEventListener('click', function () {
            setOpen(popup.hidden);
        });
        document.addEventListener('mousedown', function (event) {
            if (!popup.hidden && !popup.contains(event.target) && !toggle.contains(event.target)) setOpen(false);
        }, true);
        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape' && !popup.hidden) {
                setOpen(false);
                toggle.focus();
            }
        }, true);
        window.addEventListener('resize', function () { setOpen(false); });
    }

    show();
});
