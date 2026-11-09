<?php
/**
 * Embed providers: the third-party sites a note is allowed to frame.
 *
 * A note may hold an <iframe>, which is how a YouTube video or a GeoGebra
 * applet is shown inside it. Framing an arbitrary site is refused on purpose:
 * a convincing sign-in form inside a page the reader trusts is phishing, and a
 * public share would hand a visitor's browser to whoever owns the framed site.
 * So the hosts live here, in the code, and nothing can add one at runtime.
 *
 * What an administrator can do is switch a shipped provider OFF
 * (Settings > Admin Tools > Integrations > Embeds, stored in the global
 * setting named by POZNOTE_EMBED_PROVIDERS_SETTING). The stored value lists
 * the providers to REFUSE, never hosts to accept, so the setting can only
 * narrow what this file ships and an unexpected value, a provider removed by a
 * later version, or an unreadable master.db all mean "nothing is disabled"
 * rather than "everything is allowed".
 *
 * Every consumer goes through poznoteAllowedIframeDomains(): the trust check in
 * lib/html-sanitize.php, the frame-src of the two pages that set a Content
 * Security Policy over note content (public/index.php, public/public_note.php)
 * and the copy those pages hand to the browser as window.ALLOWED_IFRAME_DOMAINS.
 */

/** Global setting holding the JSON list of providers an admin switched off. */
const POZNOTE_EMBED_PROVIDERS_SETTING = 'embed_providers_disabled';

/**
 * The providers this version ships, in display order.
 *
 * `name` is a proper noun shown as-is in Settings, so it is deliberately not
 * translated. `domains` are matched by host, exactly or as a parent domain
 * (see poznoteIframeSrcIsTrusted), never as a substring of the URL.
 *
 * Adding a provider here is a decision of the project, reviewed like any other
 * code change, and it is enabled on every instance that has not switched it off.
 *
 * @return array<string, array{name: string, domains: string[]}>
 */
function poznoteEmbedProviderCatalogue(): array {
    return [
        'youtube' => [
            'name' => 'YouTube',
            'domains' => [
                'youtube.com',
                'www.youtube.com',
                'youtube-nocookie.com',
                'www.youtube-nocookie.com',
            ],
        ],
        'bilibili' => [
            'name' => 'Bilibili',
            'domains' => [
                'bilibili.com',
                'www.bilibili.com',
                'player.bilibili.com',
            ],
        ],
        // Issue #1742: interactive mathematics applets, for school use. Read
        // only, like every embed here: the applet runs in GeoGebra's own page
        // and nothing it holds is saved back into the note. Persisting a
        // construction would need GeoGebra's deployggb.js inside the note page
        // itself, which the Content Security Policy refuses by design.
        'geogebra' => [
            'name' => 'GeoGebra',
            'domains' => [
                'geogebra.org',
                'www.geogebra.org',
            ],
        ],
    ];
}

/**
 * Per-request cache, by reference so it can be dropped after a write.
 * Resolving the list reads master.db, and the trust check runs once per
 * iframe of every note being sanitised.
 */
function &poznoteEmbedProvidersCacheRef() {
    static $cache = null;
    return $cache;
}

function poznoteResetEmbedProvidersCache(): void {
    $cache = &poznoteEmbedProvidersCacheRef();
    $cache = null;
}

/**
 * The raw stored value, or null when it could not be read at all.
 *
 * getGlobalSetting() lives in users/db_master.php, which pulls in functions.php
 * and config.php at include time: it cannot be loaded without the app around
 * it, and this module is loaded on its own by the test suite. So the file is
 * only required once config has run, and a request that asks before that gets
 * null, which resolves to the full catalogue, exactly the behaviour of the
 * hardcoded list this setting replaced.
 *
 * Null rather than '' so the caller can tell "nothing is disabled" from "ask
 * again later" and leave its cache empty: entry points resolve the hosts for
 * their Content Security Policy while they are still booting, and caching that
 * early answer kept the switched-off providers enabled for the rest of the
 * request.
 */
function poznoteEmbedProvidersStoredValue(): ?string {
    if (!function_exists('getGlobalSetting')) {
        if (!defined('SQLITE_DATABASE')) {
            return null;
        }
        $masterDb = __DIR__ . '/../users/db_master.php';
        if (!is_file($masterDb)) {
            return null;
        }
        require_once $masterDb;
        if (!function_exists('getGlobalSetting')) {
            return null;
        }
    }

    try {
        return (string) getGlobalSetting(POZNOTE_EMBED_PROVIDERS_SETTING, '');
    } catch (Throwable $e) {
        // An unreadable master.db keeps the shipped list rather than dropping
        // every embed of every note.
        return null;
    }
}

/**
 * Read a stored value into provider ids, in catalogue order. Pure, so the
 * narrowing rules are tested without a database.
 *
 * Anything unexpected means "nothing is disabled": an id the catalogue no
 * longer has is ignored rather than rejected, since a version that drops a
 * provider must not make a stored value unusable, and malformed JSON must not
 * drop every embed of every note. A write is validated instead, by
 * poznoteNormalizeEmbedProvidersDisabled().
 *
 * @return string[]
 */
function poznoteResolveDisabledEmbedProviders(string $storedValue): array {
    $stored = trim($storedValue);
    if ($stored === '' || $stored === '[]') {
        return [];
    }

    $decoded = json_decode($stored, true);
    if (!is_array($decoded)) {
        return [];
    }

    $disabled = [];
    foreach (array_keys(poznoteEmbedProviderCatalogue()) as $providerId) {
        if (in_array($providerId, $decoded, true)) {
            $disabled[] = $providerId;
        }
    }
    return $disabled;
}

/**
 * The hosts left once those providers are switched off. Pure.
 *
 * @param string[] $disabledProviders
 * @return string[]
 */
function poznoteResolveEmbedDomains(array $disabledProviders): array {
    $domains = [];
    foreach (poznoteEmbedProviderCatalogue() as $providerId => $provider) {
        if (in_array($providerId, $disabledProviders, true)) {
            continue;
        }
        foreach ($provider['domains'] as $domain) {
            $domain = strtolower(trim((string) $domain));
            if ($domain !== '' && !in_array($domain, $domains, true)) {
                $domains[] = $domain;
            }
        }
    }
    return $domains;
}

/**
 * Provider ids an administrator switched off on this instance.
 *
 * @return string[]
 */
function poznoteDisabledEmbedProviders(): array {
    $cache = &poznoteEmbedProvidersCacheRef();
    if (is_array($cache) && isset($cache['disabled'])) {
        return $cache['disabled'];
    }

    $stored = poznoteEmbedProvidersStoredValue();
    $disabled = poznoteResolveDisabledEmbedProviders((string) $stored);
    if ($stored === null) {
        // Asked too early to know: answer with the shipped list, and let the
        // next call, once master.db can be opened, settle it.
        return $disabled;
    }

    if (!is_array($cache)) {
        $cache = [];
    }
    $cache['disabled'] = $disabled;
    return $disabled;
}

/**
 * True when this provider may be framed on this instance.
 */
function poznoteEmbedProviderIsEnabled(string $providerId): bool {
    return isset(poznoteEmbedProviderCatalogue()[$providerId])
        && !in_array($providerId, poznoteDisabledEmbedProviders(), true);
}

/**
 * Hosts a note may frame on this instance: the catalogue, minus the providers
 * an administrator switched off. The single source of truth for the sanitiser,
 * the Content Security Policy and the browser-side copy.
 *
 * @return string[]
 */
function poznoteAllowedIframeDomains(): array {
    $cache = &poznoteEmbedProvidersCacheRef();
    if (is_array($cache) && isset($cache['domains'])) {
        return $cache['domains'];
    }

    $domains = poznoteResolveEmbedDomains(poznoteDisabledEmbedProviders());

    // Only once the stored value has really been read, see above.
    if (!is_array($cache) || !isset($cache['disabled'])) {
        return $domains;
    }
    $cache['domains'] = $domains;
    return $domains;
}

/**
 * Validate what the settings API is asked to store, and return it in a stable
 * shape ('[]' when nothing is disabled).
 *
 * Takes the JSON array the Embeds modal posts, or an array. An id that is not
 * in the catalogue is refused here, rather than ignored as on the read side: a
 * typo in a write must be visible, while a stored value must keep working.
 *
 * @param mixed $value
 * @throws InvalidArgumentException
 */
function poznoteNormalizeEmbedProvidersDisabled($value): string {
    if (is_string($value)) {
        $raw = trim($value);
        if ($raw === '' || $raw === '[]') {
            return '[]';
        }
        $decoded = json_decode($raw, true);
    } else {
        $decoded = $value;
    }

    if (!is_array($decoded)) {
        throw new InvalidArgumentException('value must be a JSON array of embed provider ids', 400);
    }

    $catalogue = poznoteEmbedProviderCatalogue();
    $disabled = [];
    foreach ($decoded as $providerId) {
        if (!is_string($providerId) || !isset($catalogue[$providerId])) {
            throw new InvalidArgumentException('unknown embed provider', 400);
        }
        $disabled[$providerId] = true;
    }

    // Catalogue order, whatever order the client sent.
    return json_encode(array_values(array_intersect(array_keys($catalogue), array_keys($disabled))));
}
