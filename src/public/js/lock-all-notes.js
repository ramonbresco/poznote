/**
 * The padlock at the top of the notes tree: locks or unlocks every note of
 * the account at once.
 *
 * The per-note lock lives in the menu of the note itself
 * (js/note-edit-lock.js); this one is the same state set on all of them, for
 * someone who keeps a whole account as a read-only archive. It acts straight
 * away and says so in a toast: nothing is written and nothing is lost either
 * way, and the same button undoes it.
 *
 * The button is rendered by index.php and rebuilt on every sidebar refresh,
 * hence the delegated listener rather than one bound to the element.
 */
(function () {
    'use strict';

    function t(key, vars, fallback) {
        if (typeof window.t === 'function') {
            return window.t(key, vars || {}, fallback);
        }

        var text = fallback || key;
        Object.keys(vars || {}).forEach(function (name) {
            text = text.split('{{' + name + '}}').join(vars[name]);
        });
        return text;
    }

    function notify(message, variant) {
        if (typeof window.poznoteShowToast === 'function') {
            window.poznoteShowToast(message, variant ? { variant: variant } : undefined);
            return;
        }
        if (typeof window.showNotificationPopup === 'function') {
            window.showNotificationPopup(message, variant || 'success');
        }
    }

    function paintButton(button, locked) {
        var label = locked
            ? t('note_lock.unlock_all', {}, 'Unlock all notes')
            : t('note_lock.lock_all', {}, 'Lock all notes against editing');
        button.dataset.locked = locked ? '1' : '0';
        button.classList.toggle('active', !!locked);
        button.setAttribute('aria-pressed', locked ? 'true' : 'false');
        button.setAttribute('title', label);
        button.setAttribute('aria-label', label);
        var icon = button.querySelector('i');
        if (icon) {
            icon.className = 'lucide ' + (locked ? 'lucide-lock' : 'lucide-lock-open');
        }
    }

    // The note on screen was just locked or unlocked with the others, so its
    // editor follows without asking the server again. The rows of the tree
    // show nothing of the lock, so there is nothing else to repaint.
    function paintOpenNote(locked) {
        var noteId = null;
        var card = document.querySelector('.notecard[id^="note"]');
        if (card) {
            noteId = card.id.replace(/^note/, '');
        }
        if (noteId && typeof window.applyNoteManualLockState === 'function') {
            window.applyNoteManualLockState(noteId, locked);
        }
    }

    function run(button) {
        var locked = button.dataset.locked !== '1';

        button.disabled = true;
        fetch('/api/v1/notes/locked', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            credentials: 'same-origin',
            body: JSON.stringify({ locked: locked })
        }).then(function (response) {
            return response.json().catch(function () { return null; });
        }).then(function (data) {
            button.disabled = false;
            if (!data || !data.success) {
                notify((data && data.error)
                    || t('note_lock.lock_all_failed', {}, 'Unable to change the lock of the notes.'), 'warning');
                return;
            }

            paintButton(button, locked);
            paintOpenNote(locked);
            notify(locked
                ? t('note_lock.locked_all_toast', {}, 'All notes locked')
                : t('note_lock.unlocked_all_toast', {}, 'All notes unlocked'));
        }).catch(function () {
            button.disabled = false;
            notify(t('note_lock.lock_all_failed', {}, 'Unable to change the lock of the notes.'), 'warning');
        });
    }

    document.addEventListener('click', function (event) {
        var button = event.target.closest ? event.target.closest('[data-action="toggle-lock-all-notes"]') : null;
        if (!button || button.disabled) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        run(button);
    });
})();
