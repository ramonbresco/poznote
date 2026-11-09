<?php
/**
 * The PHP session every Poznote page shares.
 *
 * auth.php opens it for the app; the public share pages (public_note.php,
 * public_folder.php) open it themselves because they do not load auth.php.
 * Both must use the same name, cookie flags and storage, or a password typed
 * on a share page and the login of a signed-in visitor end up in two
 * different files for the same cookie.
 */

/**
 * True when the session cookie must be Secure (HTTPS, directly or behind a
 * reverse proxy), unless POZNOTE_FORCE_SECURE_COOKIES says otherwise.
 */
function poznoteSessionCookieIsSecure(): bool {
    $isSecure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
             || (!empty($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https')
             || (!empty($_SERVER['HTTP_X_FORWARDED_SSL']) && $_SERVER['HTTP_X_FORWARDED_SSL'] === 'on')
             || (!empty($_SERVER['HTTP_X_FORWARDED_PORT']) && $_SERVER['HTTP_X_FORWARDED_PORT'] === '443');

    // Allow override via environment variable for edge cases
    $forceSecureCookies = getenv('POZNOTE_FORCE_SECURE_COOKIES');
    if ($forceSecureCookies !== false && $forceSecureCookies !== '') {
        $isSecure = filter_var($forceSecureCookies, FILTER_VALIDATE_BOOLEAN);
    }

    return $isSecure;
}

/**
 * How long a session survives without activity, in days.
 *
 * PHP's own default is 24 minutes (session.gc_maxlifetime), a number nobody
 * chose here: a password login never feels it, because the remember-me cookie
 * rebuilds the session in silence, while an OIDC login has no such cookie (it
 * must never have one, so that a revocation at the identity provider takes
 * effect immediately) and lands back on the provider's page instead.
 *
 * Read from the environment and not from a global setting in master.db: the
 * session has to be open before anything else, the public share pages call
 * poznoteStartSession() without auth.php, and config.php reads global settings
 * while it is still loading, so a database read here would invert the
 * bootstrap.
 */
function poznoteSessionLifetimeDays(): int {
    $defaultDays = 7;
    $raw = $_ENV['POZNOTE_SESSION_LIFETIME_DAYS'] ?? getenv('POZNOTE_SESSION_LIFETIME_DAYS');
    if (!is_string($raw)) {
        return $defaultDays;
    }
    $raw = trim($raw);
    if ($raw === '' || !ctype_digit($raw)) {
        return $defaultDays;
    }
    $days = (int)$raw;
    // A longer deadline than the browsers honour would promise what they do
    // not keep: Chrome and Firefox cap a cookie's expiry at 400 days.
    return ($days >= 1 && $days <= 400) ? $days : $defaultDays;
}

/** The same lifetime in seconds, for the session settings below. */
function poznoteSessionLifetimeSeconds(): int {
    return poznoteSessionLifetimeDays() * 24 * 60 * 60;
}

/**
 * Re-send the session cookie with an expiry date, so a signed-in session
 * survives closing the browser and its deadline slides with use.
 *
 * The cookie is created without one, as a browser-session cookie, and only a
 * session that has signed in is given a lasting one: an anonymous visitor who
 * typed a share password keeps the old behaviour, their access ending with the
 * browser. PHP would otherwise write the expiry once, when it creates the
 * session, so a session in daily use would still be dropped by the browser one
 * lifetime after the login.
 *
 * Sent again when the stored deadline is within an hour of sliding, and
 * whenever the session id has changed, session_regenerate_id() at login
 * re-sending the cookie without an expiry.
 */
function poznoteRefreshSessionCookie(): void {
    if (session_status() !== PHP_SESSION_ACTIVE || headers_sent()) {
        return;
    }
    if (empty($_SESSION['authenticated']) || (int)($_SESSION['login_user_id'] ?? 0) <= 0) {
        return;
    }
    $sessionId = session_id();
    if (!is_string($sessionId) || $sessionId === '') {
        return;
    }

    $lifetime = poznoteSessionLifetimeSeconds();
    $now = time();
    $sentFor = (string)($_SESSION['cookie_sent_for'] ?? '');
    $expiresAt = (int)($_SESSION['cookie_expires_at'] ?? 0);
    if ($sentFor === $sessionId && $expiresAt > $now + $lifetime - 3600) {
        return;
    }

    $params = session_get_cookie_params();
    $path = (string)($params['path'] ?? '');
    $sameSite = (string)($params['samesite'] ?? '');
    $sent = setcookie(session_name(), $sessionId, [
        'expires' => $now + $lifetime,
        'path' => $path !== '' ? $path : '/',
        'domain' => (string)($params['domain'] ?? ''),
        'secure' => !empty($params['secure']),
        'httponly' => true,
        'samesite' => $sameSite !== '' ? $sameSite : 'Lax',
    ]);
    if ($sent) {
        $_SESSION['cookie_sent_for'] = $sessionId;
        $_SESSION['cookie_expires_at'] = $now + $lifetime;
    }
}

/**
 * Name of the session cookie. It carries the configured port so several
 * instances on one host keep separate sessions.
 */
function poznoteSessionName(): string {
    return 'POZNOTE_SESSION_' . ($_ENV['HTTP_WEB_PORT'] ?? '8040');
}

/**
 * Directory the session files live in: the data volume, not the container's
 * /tmp (issue #1389, see poznoteStartSession()). Also read by
 * lib/session-store.php, which lists and revokes a profile's own sessions.
 */
function poznoteSessionSavePath(): string {
    return dirname(__DIR__) . '/data/sessions';
}

/**
 * Start the shared session, configured the way auth.php always did. Does
 * nothing when a session is already open.
 */
function poznoteStartSession(): void {
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }

    // Idle lifetime of the session file, swept by PHP once it has not been
    // touched for this long (every request that opens the session refreshes
    // its timestamp). Set here rather than in docker/php/php.ini so the value
    // lives next to the cookie settings it goes with, and so an instance that
    // runs the source without rebuilding the image gets it too.
    ini_set('session.gc_maxlifetime', (string)poznoteSessionLifetimeSeconds());

    // Configure session cookie for reverse proxy compatibility
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'domain' => '',
        'secure' => poznoteSessionCookieIsSecure(),
        'httponly' => true,
        'samesite' => 'Lax'
    ]);

    // Configure session name based on configured port to allow multiple instances
    $sessionName = poznoteSessionName();
    session_name($sessionName);

    // Sessions live in the data volume, not in the container's /tmp: recreating
    // the container (an update, a rollout) then keeps everyone signed in, since
    // the browser still holds its cookie and the file that cookie names is still
    // there (issue #1389). The directory is created on first use, stays private
    // to the PHP user, and nginx never serves anything under /data/.
    $sessionSavePath = poznoteSessionSavePath();
    if (!is_dir($sessionSavePath)) {
        @mkdir($sessionSavePath, 0700, true);
    }
    if (is_dir($sessionSavePath) && is_writable($sessionSavePath)) {
        // A session opened before this directory existed is still in the old
        // location: carry it over once, so the update that ships this change is
        // not itself the restart that signs everyone out.
        $currentSessionId = (string)($_COOKIE[$sessionName] ?? '');
        if ($currentSessionId !== '' && preg_match('/^[a-zA-Z0-9,-]{22,256}$/', $currentSessionId)) {
            $legacySessionDir = (string)session_save_path();
            if ($legacySessionDir === '') {
                $legacySessionDir = sys_get_temp_dir();
            }
            $legacySessionFile = rtrim($legacySessionDir, '/') . '/sess_' . $currentSessionId;
            $movedSessionFile = $sessionSavePath . '/sess_' . $currentSessionId;
            if (!is_file($movedSessionFile) && is_file($legacySessionFile) && @copy($legacySessionFile, $movedSessionFile)) {
                @chmod($movedSessionFile, 0600);
                @unlink($legacySessionFile);
            }
        }
        session_save_path($sessionSavePath);
    }

    session_start();

    // An already signed-in session gets its lasting cookie back on every
    // request; a fresh login gets it from setAuthenticatedIdentity().
    poznoteRefreshSessionCookie();
}
