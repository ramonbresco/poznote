/**
 * Connected devices card and modal on the Settings page.
 *
 * Lists the sessions currently open on the account, one row per browser, and
 * ends the ones the user no longer wants. The server side is
 * src/lib/session-store.php; a row is identified by a one-way handle, never by
 * a session id, and the session making the request can only be ended by
 * logging out, so its row has no button.
 */
(function () {
    'use strict';

    const tr = window.t || function (key, vars, fallback) { return fallback || key; };
    const esc = window.escapeHtml || function (text) {
        var div = document.createElement('div');
        div.textContent = text == null ? '' : String(text);
        return div.innerHTML;
    };

    var API = '/api/v1/users/me/sessions';
    var sessionCount = null;
    var lifetimeDays = null;

    // ========== Card badge ==========

    function seedFromPageConfig() {
        if (sessionCount !== null || typeof window.getPoznotePageConfig !== 'function') {
            return;
        }
        var config = window.getPoznotePageConfig();
        if (config && config.sessions) {
            if (typeof config.sessions.count === 'number') sessionCount = config.sessions.count;
            if (typeof config.sessions.lifetime_days === 'number') lifetimeDays = config.sessions.lifetime_days;
        }
    }

    function renderBadge() {
        var badge = document.getElementById('sessions-status-badge');
        if (!badge || sessionCount === null) return;
        badge.textContent = sessionCount === 1
            ? tr('sessions.status.count_one', {}, '1 session')
            : tr('sessions.status.count_other', { count: sessionCount }, '{{count}} sessions');
        badge.className = 'setting-status ' + (sessionCount > 1 ? 'enabled' : 'disabled');
    }

    // ========== API ==========

    function request(method, path) {
        return fetch(path, {
            method: method,
            headers: { 'Accept': 'application/json' },
            credentials: 'same-origin'
        }).then(function (r) {
            return r.json().catch(function () { return {}; }).then(function (data) {
                return { status: r.status, data: data || {} };
            });
        });
    }

    // ========== Modal ==========

    function buildModal() {
        var existing = document.getElementById('userSessionsModal');
        if (existing) existing.remove();

        var modal = document.createElement('div');
        modal.id = 'userSessionsModal';
        modal.className = 'modal';

        modal.innerHTML =
            '<div class="modal-content">' +
                '<h3>' + esc(tr('sessions.modal.title', {}, 'Connected devices')) + '</h3>' +
                '<p class="text-small-muted user-sessions-description" id="usDescription"></p>' +
                '<div id="usError" class="error user-sessions-error" hidden></div>' +
                '<ul class="user-session-list" id="usList"></ul>' +
                '<div class="modal-buttons">' +
                    '<button type="button" class="btn-danger" id="usRevokeOthersBtn" hidden>' +
                        esc(tr('sessions.modal.revoke_others', {}, 'Sign out other devices')) +
                    '</button>' +
                    '<button type="button" class="btn-cancel" id="usCloseBtn">' + esc(tr('sessions.modal.close', {}, 'Close')) + '</button>' +
                '</div>' +
            '</div>';

        document.body.appendChild(modal);
        return modal;
    }

    function renderDescription() {
        var el = document.getElementById('usDescription');
        if (!el) return;
        var days = lifetimeDays === null ? 7 : lifetimeDays;
        var expiry = days === 1
            ? tr('sessions.lifetime.day_one', {}, '1 day')
            : tr('sessions.lifetime.day_other', { count: days }, '{{count}} days');
        el.textContent = tr('sessions.modal.description', { duration: expiry },
            'Each row is a browser signed in to your account. A session ends on its own after {{duration}} without activity, and whenever your password changes.');
    }

    function showError(message) {
        var el = document.getElementById('usError');
        if (!el) return;
        el.textContent = message || '';
        el.hidden = !message;
    }

    // Short on purpose: it sits in a one-line metadata row next to the date.
    function methodLabel(method) {
        if (method === 'oidc') return tr('sessions.method.sso', {}, 'SSO');
        if (method === 'auto') return tr('sessions.method.auto', {}, 'No login');
        return tr('sessions.method.password', {}, 'Password');
    }

    function renderList(rows) {
        var list = document.getElementById('usList');
        if (!list) return;

        if (rows === null) {
            list.innerHTML = '<li class="user-sessions-empty">' + esc(tr('sessions.modal.loading', {}, 'Loading...')) + '</li>';
            return;
        }
        if (rows.length === 0) {
            list.innerHTML = '<li class="user-sessions-empty">' + esc(tr('sessions.modal.empty', {}, 'No open session found.')) + '</li>';
            return;
        }

        list.innerHTML = rows.map(function (row) {
            var meta = [methodLabel(row.auth_method)];
            if (row.last_active) {
                meta.push(tr('sessions.modal.last_active', { date: row.last_active }, 'Last active {{date}}'));
            }

            var name = row.client || tr('sessions.modal.unknown_client', {}, 'Unknown browser');
            return '<li class="user-session-row' + (row.current ? ' is-current' : '') + '">' +
                '<div class="user-session-main">' +
                    '<span class="user-session-client">' + esc(name) +
                        (row.current ? ' <span class="user-session-badge">' + esc(tr('sessions.modal.this_device', {}, 'This device')) + '</span>' : '') +
                    '</span>' +
                    '<span class="user-session-meta">' + esc(meta.join(' · ')) + '</span>' +
                '</div>' +
                (row.current ? '' :
                    '<button type="button" class="btn btn-danger user-session-revoke" data-id="' + esc(row.id) + '">' +
                        esc(tr('sessions.modal.revoke', {}, 'Sign out')) +
                    '</button>') +
            '</li>';
        }).join('');
    }

    function loadList() {
        return request('GET', API).then(function (result) {
            if (result.status !== 200 || !result.data.sessions) {
                showError(result.data.error || tr('sessions.errors.load_failed', {}, 'Could not load your sessions.'));
                renderList([]);
                return;
            }
            sessionCount = typeof result.data.count === 'number' ? result.data.count : 0;
            if (typeof result.data.lifetime_days === 'number') lifetimeDays = result.data.lifetime_days;
            renderBadge();
            renderDescription();
            renderList(result.data.sessions);

            var others = result.data.sessions.filter(function (row) { return !row.current; }).length;
            var btn = document.getElementById('usRevokeOthersBtn');
            if (btn) {
                btn.hidden = others === 0;
                btn.classList.remove('is-armed');
                btn.disabled = false;
                btn.textContent = tr('sessions.modal.revoke_others', {}, 'Sign out other devices');
            }
        }).catch(function () {
            showError(tr('sessions.errors.load_failed', {}, 'Could not load your sessions.'));
            renderList([]);
        });
    }

    // Signing a device out cannot be undone from here (that browser has to
    // sign in again), so the button asks once: a first click arms it, a second
    // within a few seconds confirms. Same behaviour as the app passwords
    // dialog, and for the same reason: no second modal on top of this one.
    function armOrRun(btn, idleLabel, run) {
        if (!btn.classList.contains('is-armed')) {
            btn.classList.add('is-armed');
            btn.textContent = tr('sessions.modal.confirm', {}, 'Confirm');
            btn._disarm = setTimeout(function () {
                btn.classList.remove('is-armed');
                btn.textContent = idleLabel;
            }, 4000);
            return;
        }
        clearTimeout(btn._disarm);
        btn.disabled = true;
        showError('');
        run();
    }

    function onListClick(event) {
        var btn = event.target.closest('.user-session-revoke');
        if (!btn) return;
        var id = btn.getAttribute('data-id');
        armOrRun(btn, tr('sessions.modal.revoke', {}, 'Sign out'), function () {
            request('DELETE', API + '/' + encodeURIComponent(id)).then(function (result) {
                if (result.status === 200) return loadList();
                btn.disabled = false;
                showError(result.data.error || tr('sessions.errors.generic', {}, 'Something went wrong. Try again.'));
            }).catch(function () {
                btn.disabled = false;
                showError(tr('sessions.errors.generic', {}, 'Something went wrong. Try again.'));
            });
        });
    }

    function onRevokeOthers(event) {
        var btn = event.currentTarget;
        armOrRun(btn, tr('sessions.modal.revoke_others', {}, 'Sign out other devices'), function () {
            request('DELETE', API).then(function (result) {
                if (result.status === 200) return loadList();
                btn.disabled = false;
                showError(result.data.error || tr('sessions.errors.generic', {}, 'Something went wrong. Try again.'));
            }).catch(function () {
                btn.disabled = false;
                showError(tr('sessions.errors.generic', {}, 'Something went wrong. Try again.'));
            });
        });
    }

    function showModal() {
        var modal = buildModal();
        modal.style.display = 'flex';
        renderDescription();

        document.getElementById('usList').addEventListener('click', onListClick);
        document.getElementById('usRevokeOthersBtn').addEventListener('click', onRevokeOthers);
        document.getElementById('usCloseBtn').addEventListener('click', function () {
            modal.style.display = 'none';
        });
        var pressedOnBackdrop = false;
        modal.addEventListener('mousedown', function (e) {
            pressedOnBackdrop = (e.target === modal);
        });
        modal.addEventListener('click', function (e) {
            if (e.target === modal && pressedOnBackdrop) modal.style.display = 'none';
            pressedOnBackdrop = false;
        });

        renderList(null);
        loadList();
    }

    function init() {
        seedFromPageConfig();
        renderBadge();

        var card = document.getElementById('sessions-card');
        if (card) {
            card.addEventListener('click', showModal);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    document.addEventListener('poznote:i18n:loaded', renderBadge);
})();
