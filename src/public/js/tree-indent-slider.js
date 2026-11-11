// ============================================================================
// Tree indentation slider of the View options menu
// ============================================================================
// #sidebarTreeIndentSlider (index.php, in #tree-options-menu) sets the step of
// one level of the notes tree (sidebar_tree_indent, lib/tree-indent.php),
// which css/folders/content.css reads as --pz-tree-indent. index.php writes
// the saved value on :root; this file moves the tree while the slider is
// dragged (an inline value on :root, which outranks the <style> one) and
// saves it once released. The reset button, shown away from the default,
// brings it back to the indentation the tree always had.
//
// The menu lives in #left_col and is replaced by a sidebar refresh, so the
// listeners are delegated and the row is looked up on every event.

(function () {
    'use strict';

    var ROW = '#sidebarTreeIndentSlider';
    var saveTimer = null;

    function bounds(row) {
        return {
            min: parseInt(row.getAttribute('data-min'), 10) || 8,
            max: parseInt(row.getAttribute('data-max'), 10) || 40,
            def: parseInt(row.getAttribute('data-default'), 10) || 21
        };
    }

    function clamp(row, value) {
        var b = bounds(row);
        var n = parseInt(value, 10);
        if (isNaN(n)) return b.def;
        return Math.max(b.min, Math.min(b.max, n));
    }

    // Value label, reset button and the tree itself
    function show(row, value) {
        var output = row.querySelector('.folder-actions-menu-slider-value');
        if (output) output.textContent = value + ' px';
        var reset = row.querySelector('.folder-actions-menu-slider-reset');
        if (reset) reset.hidden = value === bounds(row).def;
        document.documentElement.style.setProperty('--pz-tree-indent', value + 'px');
    }

    function save(value) {
        clearTimeout(saveTimer);
        // A few arrow-key presses in a row make one request
        saveTimer = setTimeout(function () {
            fetch('/api/v1/settings/sidebar_tree_indent', {
                method: 'PUT',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({ value: String(value) })
            })
                .then(function (response) { return response.json(); })
                .then(function (result) {
                    if (!result || !result.success) throw new Error('save rejected');
                })
                .catch(function (e) {
                    console.error('tree-indent-slider: the tree indentation could not be saved', e);
                });
        }, 250);
    }

    document.addEventListener('input', function (event) {
        var input = event.target;
        if (!input || !input.matches || !input.matches(ROW + ' input[type="range"]')) return;
        var row = input.closest(ROW);
        show(row, clamp(row, input.value));
    });

    document.addEventListener('change', function (event) {
        var input = event.target;
        if (!input || !input.matches || !input.matches(ROW + ' input[type="range"]')) return;
        var row = input.closest(ROW);
        var value = clamp(row, input.value);
        show(row, value);
        save(value);
    });

    document.addEventListener('click', function (event) {
        var reset = event.target && typeof event.target.closest === 'function'
            ? event.target.closest(ROW + ' .folder-actions-menu-slider-reset')
            : null;
        if (!reset) return;
        event.preventDefault();
        var row = reset.closest(ROW);
        var input = row.querySelector('input[type="range"]');
        var value = bounds(row).def;
        if (input) {
            input.value = String(value);
            input.focus();
        }
        show(row, value);
        save(value);
    });
})();
