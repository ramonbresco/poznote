/**
 * "Also show images inserted in the note" checkbox of the attachments pages
 * (attachments.php, attachments_list.php). It is the account setting
 * attachments_show_inserted_images, the same one as the card in
 * Settings > Display, so the note's attachments row and toolbar follow too.
 *
 * The page reads the current value from <body data-show-inserted-images>; a
 * change updates that attribute, saves the setting and fires
 * "poznote:inserted-images-changed" on document, which the page's own script
 * answers by redrawing its list. A refused save (a session that may not write
 * the account's settings) puts everything back as it was.
 */
(function () {
    'use strict';

    var SETTING = 'attachments_show_inserted_images';

    function apply(checked) {
        document.body.setAttribute('data-show-inserted-images', checked ? '1' : '0');
        document.dispatchEvent(new CustomEvent('poznote:inserted-images-changed', { detail: { show: checked } }));
    }

    function init() {
        var box = document.getElementById('showInsertedImagesToggle');
        if (!box) return;

        box.checked = document.body.getAttribute('data-show-inserted-images') === '1';
        box.addEventListener('change', function () {
            var checked = box.checked;
            apply(checked);
            box.disabled = true;
            fetch('/api/v1/settings/' + SETTING, {
                method: 'PUT',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({ value: checked ? '1' : '0' })
            })
                .then(function (response) {
                    if (!response.ok) throw new Error('HTTP ' + response.status);
                })
                .catch(function (error) {
                    console.debug('inserted-images-toggle: save failed:', error);
                    box.checked = !checked;
                    apply(!checked);
                })
                .then(function () {
                    box.disabled = false;
                });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
