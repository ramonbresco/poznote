<?php
/**
 * Where a change to a note came from.
 *
 * A note can be written by the editor, by the REST API, by the MCP server on
 * behalf of a chat app, by the built-in assistant, by a visitor of an
 * editable public share, or by the Chrome extension. The Information dialog
 * of a note reports the last of those (entries.updated_source, schema 55),
 * so "who changed this, and from where" has an answer without digging.
 *
 * Nothing here is a security control: the marker is written from headers the
 * caller sends, so it says what a well-behaved client declares, not what
 * anybody could be made to prove. It is a note about provenance, and the
 * code that reads it treats it as such.
 */

require_once __DIR__ . '/request-kind.php';

/** The app's own editor, on a computer. */
const POZNOTE_SOURCE_APP = 'app';
/** The app's own editor, on a phone or a tablet. */
const POZNOTE_SOURCE_APP_MOBILE = 'app_mobile';
/** A script, a CLI, anything using the REST API with no client marker. */
const POZNOTE_SOURCE_API = 'api';
/** The MCP server, which a chat app drives. */
const POZNOTE_SOURCE_MCP = 'mcp';
/** The browser extension. */
const POZNOTE_SOURCE_EXTENSION = 'extension';
/** The assistant built into the app. */
const POZNOTE_SOURCE_AI = 'ai';
/** A visitor of an editable public share. */
const POZNOTE_SOURCE_PUBLIC = 'public';

/** Every value the column may hold, so a stored string is never trusted blindly. */
function poznoteWriteSources(): array {
    return [
        POZNOTE_SOURCE_APP,
        POZNOTE_SOURCE_APP_MOBILE,
        POZNOTE_SOURCE_API,
        POZNOTE_SOURCE_MCP,
        POZNOTE_SOURCE_EXTENSION,
        POZNOTE_SOURCE_AI,
        POZNOTE_SOURCE_PUBLIC,
    ];
}

/**
 * The source of the request being served.
 *
 * A client that names itself in X-Poznote-Client is taken at its word (the
 * MCP server and the extension do); otherwise a request carrying a browser's
 * Fetch Metadata is the app, and anything else is an API client.
 *
 * @param array|null $server Typically $_SERVER.
 */
function poznoteDetectWriteSource(?array $server = null): string {
    $server = $server ?? $_SERVER;

    $declared = strtolower(trim((string)($server['HTTP_X_POZNOTE_CLIENT'] ?? '')));
    if ($declared === 'mcp') {
        return POZNOTE_SOURCE_MCP;
    }
    if ($declared === 'extension') {
        return POZNOTE_SOURCE_EXTENSION;
    }

    if (!poznoteRequestIsFromBrowser($server)) {
        return POZNOTE_SOURCE_API;
    }

    return poznoteUserAgentLooksMobile((string)($server['HTTP_USER_AGENT'] ?? ''))
        ? POZNOTE_SOURCE_APP_MOBILE
        : POZNOTE_SOURCE_APP;
}

/**
 * A phone or a tablet, from the user agent. Only used to say "on a phone"
 * next to an edit, so a miss costs a slightly wrong word and nothing else.
 */
function poznoteUserAgentLooksMobile(string $userAgent): bool {
    if ($userAgent === '') {
        return false;
    }
    return (bool)preg_match('/\b(Android|iPhone|iPad|iPod|Mobile|Windows Phone|Opera Mini)\b/i', $userAgent);
}

/** A stored value, or '' when the column holds nothing usable. */
function poznoteNormalizeWriteSource(?string $value): string {
    $value = strtolower(trim((string)$value));
    return in_array($value, poznoteWriteSources(), true) ? $value : '';
}

/** The sentence the Information dialog shows for a stored source. */
function poznoteWriteSourceLabel(string $source): string {
    switch (poznoteNormalizeWriteSource($source)) {
        case POZNOTE_SOURCE_APP:
            return t('info.source.app', [], 'Poznote, on a computer');
        case POZNOTE_SOURCE_APP_MOBILE:
            return t('info.source.app_mobile', [], 'Poznote, on a phone or tablet');
        case POZNOTE_SOURCE_API:
            return t('info.source.api', [], 'The REST API');
        case POZNOTE_SOURCE_MCP:
            return t('info.source.mcp', [], 'An app connected through MCP');
        case POZNOTE_SOURCE_EXTENSION:
            return t('info.source.extension', [], 'The browser extension');
        case POZNOTE_SOURCE_AI:
            return t('info.source.ai', [], 'The AI assistant');
        case POZNOTE_SOURCE_PUBLIC:
            return t('info.source.public', [], 'A visitor of the public share');
        default:
            return t('common.not_available', [], 'Not available');
    }
}
