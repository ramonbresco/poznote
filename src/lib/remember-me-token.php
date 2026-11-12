<?php
/**
 * Reading a remember-me cookie without deciding whether it is valid.
 *
 * The cookie is base64("username:user_id:timestamp:hash"), signed with the
 * profile's password hash (auth.php). Nothing on the server stores one, so
 * ending a cookie (from the "Connected devices" dialog, or at logout) is done
 * by writing its fingerprint on a list of cookies that no longer sign anyone
 * in (revoked_remember_tokens in the master database).
 *
 * The fingerprint has to name the cookie, not one spelling of it. The sign-in
 * path decodes leniently and casts the id and the timestamp to integers, so
 * the same cookie can be written many ways that all sign in: a zero in front
 * of the timestamp, a character base64 skips. A fingerprint of the raw text
 * would let whoever holds a copy step around the list by rewriting it; this
 * one is taken from the fields as the sign-in path reads them.
 *
 * Pure: no session, no database, so tests/remember-me-token.test.php can pin
 * it down.
 */

/**
 * The four fields of a remember-me cookie as the sign-in path reads them, or
 * null when it does not have that shape. Says nothing of its signature.
 *
 * @return array{username: string, user_id: int, timestamp: int, hash: string}|null
 */
function poznoteRememberMeTokenParts(string $token): ?array {
    if ($token === '') {
        return null;
    }
    // Lenient on purpose, like isAuthenticated(): what matters is that this
    // reads a cookie exactly as the code that honours it does.
    $decoded = base64_decode($token);
    if ($decoded === false || $decoded === '') {
        return null;
    }
    $parts = explode(':', $decoded);
    if (count($parts) !== 4) {
        return null;
    }
    return [
        'username' => $parts[0],
        'user_id' => (int)$parts[1],
        'timestamp' => (int)$parts[2],
        'hash' => $parts[3],
    ];
}

/**
 * The profile a remember-me cookie names, 0 when it does not read as one.
 * Says nothing of whether the cookie is valid: only whose it claims to be.
 */
function poznoteRememberMeTokenUserId(string $token): int {
    $parts = poznoteRememberMeTokenParts($token);
    return $parts !== null ? max(0, $parts['user_id']) : 0;
}

/**
 * One-way fingerprint of a remember-me cookie: what a session keeps of the
 * cookie it travels with, and what the list of ended cookies holds. The
 * cookie is a login credential, so it is never stored as it is.
 *
 * Every spelling of one cookie that the sign-in path would honour gives the
 * same fingerprint. Something that is not a cookie at all still gets one, of
 * its own text, so a caller never has to handle "no fingerprint".
 */
function poznoteRememberMeFingerprint(string $token): string {
    $parts = poznoteRememberMeTokenParts($token);
    $canonical = $parts !== null
        ? $parts['username'] . ':' . $parts['user_id'] . ':' . $parts['timestamp'] . ':' . $parts['hash']
        : 'raw:' . $token;
    return hash('sha256', 'poznote-remember|' . $canonical);
}
