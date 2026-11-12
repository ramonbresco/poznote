/**
 * Turns a <select> into an icon button that opens a small menu of its
 * options, texts centred (js/row-actions-menu.js draws the menu).
 *
 *   window.poznoteSelectMenu.attach(select, { icon: 'lucide-arrow-up-down' });
 *
 * The <select> stays in the page, out of sight: it keeps holding the choice
 * and the translated labels, and the page's own code goes on reading its
 * value and listening to its 'change' event, so nothing else has to know
 * about the menu. Choosing an item sets the value and fires 'change'.
 *
 * The button's tooltip is the chosen option, and it is marked active
 * (`is-active`) whenever that option is not the first one, which is the
 * default of the two lists using this: "All reasons" on the Offline page,
 * "Sort by name" on the Shares page. Options a page hides or disables are
 * left out of the menu, and `initially-hidden` on the <select> hides the
 * button too (poznoteSelectMenu.sync()).
 */
(function () {
    'use strict';

    function visibleOptions(select) {
        return Array.prototype.filter.call(select.options, function (option) {
            return !option.hidden && !option.disabled;
        });
    }

    function selectedOption(select) {
        return select.options[select.selectedIndex] || null;
    }

    // The tooltip says what the list is on, the aria-label what it is for
    function sync(select) {
        var state = select && select.poznoteSelectMenu;
        if (!state) return;
        var toggle = state.toggle;
        var chosen = selectedOption(select);
        toggle.title = chosen && chosen.textContent.trim() ? chosen.textContent.trim() : state.label;
        toggle.classList.toggle('is-active', !!chosen && chosen.index > 0);
        toggle.classList.toggle('initially-hidden', select.classList.contains('initially-hidden'));
    }

    function attach(select, options) {
        if (!select || select.poznoteSelectMenu) return null;
        if (!window.poznoteRowActionsMenu) return null;
        options = options || {};
        var label = options.label || select.getAttribute('aria-label') || '';
        var toggle = window.poznoteRowActionsMenu.createToggle(label, function () {
            var current = select.value;
            return visibleOptions(select).map(function (option) {
                return {
                    label: option.textContent,
                    selected: option.value === current,
                    onSelect: function () {
                        if (option.value === select.value) return;
                        select.value = option.value;
                        select.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                };
            });
        }, {
            icon: options.icon || 'lucide-arrow-up-down',
            // It sits on a page's toolbar row, with the magnifier
            // (css/components/toolbar-button.css)
            buttonClass: 'pz-toolbar-btn',
            className: 'pz-select-menu-toggle' + (options.className ? ' ' + options.className : ''),
            menuClass: 'row-actions-menu-choices',
            align: options.align || 'left'
        });
        // Out of sight and out of the tab order: the button carries the label
        select.classList.add('pz-select-menu-source');
        select.setAttribute('aria-hidden', 'true');
        select.tabIndex = -1;
        if (select.parentNode) select.parentNode.insertBefore(toggle, select);
        select.poznoteSelectMenu = { toggle: toggle, label: label };
        select.addEventListener('change', function () { sync(select); });
        sync(select);
        return toggle;
    }

    window.poznoteSelectMenu = { attach: attach, sync: sync };
})();
