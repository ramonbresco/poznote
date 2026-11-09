<?php
/**
 * The profile's own open sessions: listing them for the "Connected devices"
 * dialog, and ending one (or every other one) from there.
 *
 * A session lives as one file in poznoteSessionSavePath(). There is no index
 * and no database row, so the list is read from those files: for each one, the
 * profile it belongs to and the client that opened it come from its contents,
 * and "last active" from its modification time, which PHP refreshes on every
 * request that opens the session.
 *
 * A session id is a credential, so it never leaves the server: the dialog gets
 * poznoteSessionHandle(), a one-way fingerprint, and a revoke call is matched
 * back by re-hashing each candidate.
 */

require_once __DIR__ . '/session.php';

/** Opaque, non-reversible id for one session, safe to put in a page. */
function poznoteSessionHandle(string $sessionId): string {
    return substr(hash('sha256', 'poznote-session|' . $sessionId), 0, 32);
}

/**
 * Length in bytes of the serialize() payload that starts at $offset, or null
 * when it is not one (a truncated file, a half-written session).
 *
 * PHP's "php" session format is a flat sequence of "key|<payload>", and only
 * the payload's own grammar says where it ends, so skipping to the next key
 * means measuring it. Containers are walked rather than parsed: their contents
 * are of no interest here, only their size.
 */
function poznoteMeasureSerializedValue(string $raw, int $offset): ?int {
    $length = strlen($raw);
    if ($offset >= $length) {
        return null;
    }
    $type = $raw[$offset];

    // N; - null
    if ($type === 'N') {
        return ($offset + 1 < $length && $raw[$offset + 1] === ';') ? 2 : null;
    }

    // b:1; i:12; d:1.5; e:... - everything up to the closing semicolon
    if ($type === 'b' || $type === 'i' || $type === 'd' || $type === 'E') {
        $end = strpos($raw, ';', $offset);
        return $end === false ? null : $end - $offset + 1;
    }

    // s:5:"hello"; - the declared byte count, which may itself hold quotes,
    // semicolons or the | that separates keys
    if ($type === 's') {
        if (!preg_match('/^s:(\d+):"/', substr($raw, $offset, 24), $m)) {
            return null;
        }
        $header = strlen($m[0]);
        $size = (int)$m[1];
        $total = $header + $size + 2; // closing quote and semicolon
        if ($offset + $total > $length || substr($raw, $offset + $header + $size, 2) !== '";') {
            return null;
        }
        return $total;
    }

    // a:2:{<key><value><key><value>} - and objects, whose properties are laid
    // out the same way after their class name
    if ($type === 'a' || $type === 'O' || $type === 'C') {
        if (!preg_match('/^[aOC]:(\d+):/', substr($raw, $offset, 24), $m)) {
            return null;
        }
        $cursor = $offset + strlen($m[0]);
        $count = (int)$m[1];
        if ($type !== 'a') {
            // The class name sits between the count and the brace: "Foo":{...}
            $brace = strpos($raw, '{', $cursor);
            if ($brace === false) {
                return null;
            }
            $cursor = $brace;
        }
        if ($cursor >= $length || $raw[$cursor] !== '{') {
            return null;
        }
        $cursor++;
        $items = $type === 'a' ? $count * 2 : $count * 2;
        for ($i = 0; $i < $items; $i++) {
            $size = poznoteMeasureSerializedValue($raw, $cursor);
            if ($size === null) {
                return null;
            }
            $cursor += $size;
        }
        if ($cursor >= $length || $raw[$cursor] !== '}') {
            return null;
        }
        return $cursor + 1 - $offset;
    }

    return null;
}

/**
 * Top-level keys of one session file, decoded. Returns an empty array for
 * anything that does not parse, so a file being written right now is skipped
 * instead of guessed at. Only the keys in $wanted are unserialized; the others
 * are measured and stepped over, objects never being instantiated.
 */
function poznoteDecodeSessionFile(string $raw, array $wanted): array {
    $out = [];
    $cursor = 0;
    $length = strlen($raw);
    while ($cursor < $length) {
        $separator = strpos($raw, '|', $cursor);
        if ($separator === false || $separator === $cursor) {
            break;
        }
        $key = substr($raw, $cursor, $separator - $cursor);
        $valueAt = $separator + 1;
        $size = poznoteMeasureSerializedValue($raw, $valueAt);
        if ($size === null) {
            break;
        }
        if (in_array($key, $wanted, true)) {
            $value = @unserialize(substr($raw, $valueAt, $size), ['allowed_classes' => false]);
            if ($value !== false || substr($raw, $valueAt, $size) === 'b:0;') {
                $out[$key] = $value;
            }
        }
        $cursor = $valueAt + $size;
    }
    return $out;
}

/** Browser and system behind a user agent string, for the dialog's list. */
function poznoteDescribeSessionClient(?string $userAgent): string {
    $userAgent = trim((string)$userAgent);
    if ($userAgent === '') {
        return '';
    }

    $browsers = [
        'Edg/' => 'Edge',
        'OPR/' => 'Opera',
        'Chrome/' => 'Chrome',
        'Firefox/' => 'Firefox',
        'Safari/' => 'Safari',
    ];
    $browser = '';
    foreach ($browsers as $needle => $name) {
        if (stripos($userAgent, $needle) !== false) {
            $browser = $name;
            break;
        }
    }

    $systems = [
        'Android' => 'Android',
        'iPhone' => 'iPhone',
        'iPad' => 'iPad',
        'Macintosh' => 'Mac',
        'Mac OS X' => 'Mac',
        'Windows' => 'Windows',
        'CrOS' => 'ChromeOS',
        'Linux' => 'Linux',
    ];
    $system = '';
    foreach ($systems as $needle => $name) {
        if (stripos($userAgent, $needle) !== false) {
            $system = $name;
            break;
        }
    }

    if ($browser !== '' && $system !== '') {
        return $browser . ' · ' . $system;
    }
    return $browser !== '' ? $browser : $system;
}

/**
 * Every open session of one profile, most recently active first.
 *
 * Each row carries its handle, whether it is the session making the request,
 * how it signed in, the client that opened it, when it was opened, when it was
 * last active and when it expires if left alone.
 */
function poznoteListUserSessions(int $userId, string $currentSessionId = ''): array {
    if ($userId <= 0) {
        return [];
    }
    $directory = poznoteSessionSavePath();
    if (!is_dir($directory) || !is_readable($directory)) {
        return [];
    }
    $files = @scandir($directory);
    if ($files === false) {
        return [];
    }

    $lifetime = poznoteSessionLifetimeSeconds();
    $wanted = ['login_user_id', 'authenticated', 'auth_method', 'session_client', 'session_created_at'];
    $rows = [];
    foreach ($files as $file) {
        if (strncmp($file, 'sess_', 5) !== 0) {
            continue;
        }
        $path = $directory . '/' . $file;
        if (!is_file($path)) {
            continue;
        }
        $raw = @file_get_contents($path);
        if ($raw === false || $raw === '') {
            continue;
        }
        $data = poznoteDecodeSessionFile($raw, $wanted);
        if (empty($data['authenticated']) || (int)($data['login_user_id'] ?? 0) !== $userId) {
            continue;
        }

        $sessionId = substr($file, 5);
        $lastActive = @filemtime($path) ?: 0;
        $rows[] = [
            'id' => poznoteSessionHandle($sessionId),
            'current' => $currentSessionId !== '' && hash_equals($sessionId, $currentSessionId),
            'auth_method' => is_string($data['auth_method'] ?? null) ? $data['auth_method'] : '',
            'client' => poznoteDescribeSessionClient($data['session_client'] ?? null),
            'created_at' => (int)($data['session_created_at'] ?? 0),
            'last_active' => $lastActive,
            'expires_at' => $lastActive > 0 ? $lastActive + $lifetime : 0,
        ];
    }

    usort($rows, static function (array $a, array $b): int {
        if ($a['current'] !== $b['current']) {
            return $a['current'] ? -1 : 1;
        }
        return $b['last_active'] <=> $a['last_active'];
    });
    return $rows;
}

/**
 * Ends one session of this profile, named by its handle. Deleting the file is
 * what ends it: the next request that presents the cookie finds nothing and
 * lands on the login page. False when no session of this profile matches, so a
 * handle from another account can never delete anything.
 */
function poznoteRevokeUserSession(int $userId, string $handle): bool {
    if ($userId <= 0 || $handle === '') {
        return false;
    }
    $directory = poznoteSessionSavePath();
    foreach (poznoteListUserSessions($userId) as $row) {
        if (!hash_equals($row['id'], $handle)) {
            continue;
        }
        // The handle is one way, so the file is found by re-hashing the
        // candidates rather than by naming it from the handle.
        $files = @scandir($directory) ?: [];
        foreach ($files as $file) {
            if (strncmp($file, 'sess_', 5) !== 0) {
                continue;
            }
            if (hash_equals(poznoteSessionHandle(substr($file, 5)), $handle)) {
                return @unlink($directory . '/' . $file);
            }
        }
        return false;
    }
    return false;
}

/** Ends every session of this profile except the one making the request. */
function poznoteRevokeOtherUserSessions(int $userId, string $currentSessionId): int {
    $ended = 0;
    foreach (poznoteListUserSessions($userId, $currentSessionId) as $row) {
        if ($row['current']) {
            continue;
        }
        if (poznoteRevokeUserSession($userId, $row['id'])) {
            $ended++;
        }
    }
    return $ended;
}
