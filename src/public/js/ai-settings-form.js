/**
 * AI Assistant settings form, shared by ai_settings.php (instance
 * configuration) and ai_settings_user.php (personal configuration).
 *
 * The host page provides window.poznoteAiSettingsI18n and
 * window.poznoteAiLocalHost before loading this file.
 */
document.addEventListener('DOMContentLoaded', function() {
    setupSecretToggles();
    setupUserFilter();
    setupMcpSwitches();

    var testBtn = document.getElementById('ai-test-btn');
    var resultEl = document.getElementById('ai-test-result');
    var providerSel = document.getElementById('ai_provider');
    if (!testBtn || !resultEl || !providerSel) return;

    var i18n = window.poznoteAiSettingsI18n || {};
    var localHost = window.poznoteAiLocalHost || 'host.docker.internal';

    // Provider-driven field visibility: local servers need a URL but no
    // key; Anthropic/OpenAI have a fixed URL and need a key; custom shows
    // everything. Custom headers stay open to every provider: an Anthropic
    // organization key may need anthropic-workspace-id, an OpenAI one
    // OpenAI-Organization or OpenAI-Project.
    var PROVIDERS = {
        ollama:    { url: 'http://' + localHost + ':11434', fixedUrl: false, key: 'none' },
        lmstudio:  { url: 'http://' + localHost + ':1234',  fixedUrl: false, key: 'none' },
        anthropic: { url: 'https://api.anthropic.com', fixedUrl: true, key: 'required' },
        openai:    { url: 'https://api.openai.com', fixedUrl: true, key: 'required' },
        custom:    { url: '', fixedUrl: false, key: 'optional' }
    };
    var urlGroup = document.getElementById('ai-url-group');
    var urlInput = document.getElementById('ai_url');
    var keyGroup = document.getElementById('ai-key-group');
    var keyLabel = document.getElementById('ai-key-label');
    var keyDesc = document.getElementById('ai-key-desc');
    var headersInput = document.getElementById('ai_headers');
    var modelSelect = document.getElementById('ai_model');
    var modelMsg = document.getElementById('ai-model-empty-msg');

    function resetModelField() {
        modelSelect.innerHTML = '';
        modelSelect.hidden = true;
        modelMsg.textContent = i18n.modelHint;
        modelMsg.hidden = false;
    }

    function applyProvider(initial) {
        var p = PROVIDERS[providerSel.value] || PROVIDERS.custom;
        urlGroup.style.display = p.fixedUrl ? 'none' : '';
        if (p.fixedUrl || !initial) {
            // Switching provider always resets the URL to that provider's
            // default, predictable, and never keeps a stale URL around
            urlInput.value = p.url;
        }
        keyGroup.style.display = (p.key === 'none') ? 'none' : '';
        keyLabel.textContent = (p.key === 'required') ? i18n.apiKeyRequired : i18n.apiKeyOptional;
        keyDesc.style.display = (p.key === 'optional') ? '' : 'none';
        if (!initial) {
            // The headers and the model belong to the previous server
            headersInput.value = '';
            requestSeq++;
            resetModelField();
            resultEl.hidden = true;
            resultEl.textContent = '';
        }
    }

    providerSel.addEventListener('change', function() { applyProvider(false); });
    applyProvider(true);

    // Which configuration this page edits: the server falls back to that
    // configuration's stored key when the field still shows the mask, so a
    // saved key keeps working on the next visit without being typed again.
    var scope = window.poznoteAiSettingsScope || 'instance';

    // Only the latest request may touch the form: a slow answer must not
    // fill in the models of a server the user has since moved away from
    var requestSeq = 0;

    // Fetch the server's models and fill the select. A silent load (issue
    // #1612, on page open) shows no status line and leaves the form as it is
    // when the server cannot be reached.
    function loadModels(silent) {
        var url = urlInput.value.trim();
        var apiKey = document.getElementById('ai_api_key').value;
        if (apiKey === '••••••••') apiKey = '';

        // Read before the list is replaced: a failed test must leave the
        // configured model alone, a successful one re-selects it if still offered
        var previousModel = modelSelect.value;
        var seq = ++requestSeq;

        if (!silent) {
            resultEl.hidden = false;
            resultEl.textContent = i18n.testing;
        }

        var body = new URLSearchParams();
        body.append('url', url);
        body.append('scope', scope);
        if (apiKey) body.append('api_key', apiKey);
        // Always posted, an empty field included: only what the form shows
        // is sent, the server fills in the values still masked
        body.append('headers', headersInput.value);

        fetch('api_ai_chat.php?action=test', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body.toString()
        })
        .then(function(r) { return r.json(); })
        .then(function(data) {
            if (seq !== requestSeq) return;
            if (data.success) {
                var models = data.models || [];
                if (silent) {
                    if (!models.length) return;
                    // The saved model stays in the list even when the server
                    // no longer offers it: opening the page must not change
                    // what the next save writes
                    if (models.indexOf(previousModel) === -1) {
                        models = [previousModel].concat(models);
                    }
                } else {
                    resultEl.textContent = i18n.success.replace('{{count}}', models.length);
                }
                modelSelect.innerHTML = '';
                models.forEach(function(m) {
                    var opt = document.createElement('option');
                    opt.value = m;
                    opt.textContent = m;
                    modelSelect.appendChild(opt);
                });
                if (models.length) {
                    modelSelect.hidden = false;
                    modelMsg.hidden = true;
                    // Keep the previously configured model selected if this server still offers it
                    if (previousModel && models.indexOf(previousModel) !== -1) {
                        modelSelect.value = previousModel;
                    }
                } else {
                    modelSelect.hidden = true;
                    modelMsg.textContent = i18n.modelNoneFound;
                    modelMsg.hidden = false;
                }
            } else if (!silent) {
                resultEl.textContent = i18n.failure.replace('{{error}}', data.error || 'unknown');
            }
        })
        .catch(function(e) {
            if (seq !== requestSeq || silent) return;
            resultEl.textContent = i18n.failure.replace('{{error}}', e.message);
        });
    }

    testBtn.addEventListener('click', function() { loadModels(false); });

    // Issue #1612: the page only stores the chosen model, so the list held
    // that single entry until the button was clicked again
    if (modelSelect.value && urlInput.value.trim()) {
        loadModels(true);
    }
});

/**
 * The two switches of the External tools section (admin page only) save as
 * soon as they are flipped, through the settings API: the section's server
 * forms sit between them, so a shared Save button would have posted one
 * form while the admin had filled in another. Users' own servers need the
 * feature on, so their switch is only usable while the first one is.
 */
function setupMcpSwitches() {
    var feature = document.getElementById('mcp_enabled');
    var userServers = document.getElementById('mcp_user_servers_enabled');
    if (!feature || !userServers) return;

    var i18n = window.poznoteAiSettingsI18n || {};

    function save(input) {
        var key = input.getAttribute('data-global-setting');
        input.disabled = true;
        fetch('api/v1/settings/' + encodeURIComponent(key), {
            method: 'PUT',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ value: input.checked ? '1' : '0' })
        })
        .then(function(r) { return r.json(); })
        .then(function(data) {
            if (!data || !data.success) throw new Error((data && data.error) || 'unknown');
        })
        .catch(function() {
            // The page shows what is stored, never a change that was refused
            input.checked = !input.checked;
            if (i18n.saveError) window.alert(i18n.saveError);
        })
        .then(function() {
            input.disabled = false;
            userServers.disabled = !feature.checked;
        });
    }

    feature.addEventListener('change', function() { save(feature); });
    userServers.addEventListener('change', function() { save(userServers); });
}

/**
 * Filter the allowed-users list (admin page only). Matching is
 * accent-insensitive so "Herve" finds "Hervé".
 */
function setupUserFilter() {
    var input = document.getElementById('ai-user-filter');
    var list = document.querySelector('.ai-user-list');
    if (!input || !list) return;

    var emptyEl = document.getElementById('ai-user-filter-empty');
    var rows = Array.prototype.slice.call(list.querySelectorAll('.ai-user'));

    function fold(text) {
        text = (text || '').toLowerCase();
        return text.normalize ? text.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : text;
    }

    var haystacks = rows.map(function(row) { return fold(row.textContent); });

    function apply() {
        var needle = fold(input.value.trim());
        var shown = 0;
        rows.forEach(function(row, i) {
            var match = needle === '' || haystacks[i].indexOf(needle) !== -1;
            row.hidden = !match;
            if (match) shown++;
        });
        if (emptyEl) emptyEl.hidden = shown > 0;
    }

    input.addEventListener('input', apply);
    // A search input clears itself with Escape or its native cross
    input.addEventListener('search', apply);
    apply();
}

/**
 * Eye buttons of the API key and custom headers fields. The server renders
 * saved secrets as a mask (the key as ••••••••, each header value
 * as "Name: ••••••••") and reads that mask back as "keep the stored
 * value", so the stored values travel in a data attribute and the eye swaps
 * them in and out of the field.
 *
 * Only what still equals the stored value goes back under the mask when the
 * eye is closed: an edited key or header line stays as typed, otherwise
 * hiding it would throw the edit away on save.
 */
function setupSecretToggles() {
    var MASK = '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022';

    function storedHeaders(field) {
        var map = {};
        try {
            var pairs = JSON.parse(field.getAttribute('data-secret-headers') || '[]');
            pairs.forEach(function(pair) {
                if (Array.isArray(pair) && pair.length === 2) map[String(pair[0]).toLowerCase()] = String(pair[1]);
            });
        } catch (e) { /* nothing stored to reveal */ }
        return map;
    }

    // Rewrite each "Name: value" line whose name is a stored header
    function mapHeaderLines(text, stored, reveal) {
        return text.split('\n').map(function(line) {
            var colon = line.indexOf(':');
            if (colon <= 0) return line;
            var name = line.slice(0, colon).trim();
            var value = line.slice(colon + 1).trim();
            var key = name.toLowerCase();
            if (!Object.prototype.hasOwnProperty.call(stored, key)) return line;
            if (reveal && value === MASK) return name + ': ' + stored[key];
            if (!reveal && value === stored[key]) return name + ': ' + MASK;
            return line;
        }).join('\n');
    }

    function setRevealed(field, button, reveal) {
        if (field.tagName === 'TEXTAREA') {
            field.value = mapHeaderLines(field.value, storedHeaders(field), reveal);
        } else {
            var secret = field.getAttribute('data-secret-value') || '';
            if (reveal && secret !== '' && field.value === MASK) field.value = secret;
            if (!reveal && secret !== '' && field.value === secret) field.value = MASK;
            field.setAttribute('type', reveal ? 'text' : 'password');
        }
        field.classList.toggle('is-revealed', reveal);
        var label = button.getAttribute(reveal ? 'data-hide-label' : 'data-show-label') || '';
        button.setAttribute('title', label);
        button.setAttribute('aria-label', label);
        button.setAttribute('aria-pressed', reveal ? 'true' : 'false');
        var icon = button.querySelector('i');
        if (icon) {
            icon.classList.toggle('lucide-eye', !reveal);
            icon.classList.toggle('lucide-eye-off', reveal);
        }
    }

    Array.prototype.forEach.call(document.querySelectorAll('[data-secret-toggle]'), function(button) {
        var field = document.getElementById(button.getAttribute('data-secret-toggle'));
        if (!field) return;
        button.addEventListener('click', function() {
            setRevealed(field, button, !field.classList.contains('is-revealed'));
        });
    });
}
