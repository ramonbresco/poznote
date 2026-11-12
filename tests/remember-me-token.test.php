<?php
lib('remember-me-token');

// A remember-me cookie is ended by writing its fingerprint on a list. The
// sign-in path reads a cookie leniently (base64 that skips stray characters,
// the id and the timestamp cast to integers), so one cookie has many
// spellings that all sign in. These tests exist for that: a fingerprint taken
// from the raw text would let whoever holds a copy of an ended cookie rewrite
// it and walk past the list.

function rememberTestToken(string $username, string $userId, string $timestamp, string $hash): string {
    return base64_encode($username . ':' . $userId . ':' . $timestamp . ':' . $hash);
}

const REMEMBER_TEST_HASH = '3f2a9c0d5e6b7a8f1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b';

test('reads the four fields as the sign-in path does', function () {
    $parts = poznoteRememberMeTokenParts(rememberTestToken('alice', '12', '1794000000', REMEMBER_TEST_HASH));
    assertSame('alice', $parts['username']);
    assertSame(12, $parts['user_id']);
    assertSame(1794000000, $parts['timestamp']);
    assertSame(REMEMBER_TEST_HASH, $parts['hash']);
});

test('anything that is not four fields is not a cookie', function () {
    assertSame(null, poznoteRememberMeTokenParts(''));
    assertSame(null, poznoteRememberMeTokenParts(base64_encode('alice:1794000000:' . REMEMBER_TEST_HASH)), 'the legacy three-field form');
    assertSame(null, poznoteRememberMeTokenParts(base64_encode('a:b:c:d:e')));
    assertSame(0, poznoteRememberMeTokenUserId(base64_encode('no fields here')));
});

test('names the profile a cookie claims', function () {
    assertSame(12, poznoteRememberMeTokenUserId(rememberTestToken('alice', '12', '1794000000', REMEMBER_TEST_HASH)));
    assertSame(0, poznoteRememberMeTokenUserId(rememberTestToken('alice', '-5', '1794000000', REMEMBER_TEST_HASH)));
    assertSame(0, poznoteRememberMeTokenUserId(rememberTestToken('alice', 'abc', '1794000000', REMEMBER_TEST_HASH)));
});

test('every spelling of one cookie has the same fingerprint', function () {
    $token = rememberTestToken('alice', '12', '1794000000', REMEMBER_TEST_HASH);
    $fingerprint = poznoteRememberMeFingerprint($token);

    // A zero in front of the timestamp: the same integer once cast.
    assertSame($fingerprint, poznoteRememberMeFingerprint(rememberTestToken('alice', '12', '01794000000', REMEMBER_TEST_HASH)), 'padded timestamp');
    // The id written another way: getUserProfileById((int)$userId) finds the same profile.
    assertSame($fingerprint, poznoteRememberMeFingerprint(rememberTestToken('alice', '012', '1794000000', REMEMBER_TEST_HASH)), 'padded id');
    assertSame($fingerprint, poznoteRememberMeFingerprint(rememberTestToken('alice', '12abc', '1794000000', REMEMBER_TEST_HASH)), 'id with a tail');
    // Characters a lenient base64 decoder skips.
    assertSame($fingerprint, poznoteRememberMeFingerprint(substr($token, 0, 5) . '!' . substr($token, 5)), 'a skipped character');
    assertSame($fingerprint, poznoteRememberMeFingerprint(' ' . $token . "\n"), 'surrounding whitespace');
    assertSame($fingerprint, poznoteRememberMeFingerprint(rtrim($token, '=')), 'padding removed');
});

test('two different cookies never share a fingerprint', function () {
    $fingerprint = poznoteRememberMeFingerprint(rememberTestToken('alice', '12', '1794000000', REMEMBER_TEST_HASH));

    assertTrue($fingerprint !== poznoteRememberMeFingerprint(rememberTestToken('alice', '12', '1794000001', REMEMBER_TEST_HASH)), 'another timestamp');
    assertTrue($fingerprint !== poznoteRememberMeFingerprint(rememberTestToken('alice', '13', '1794000000', REMEMBER_TEST_HASH)), 'another profile');
    assertTrue($fingerprint !== poznoteRememberMeFingerprint(rememberTestToken('Alice', '12', '1794000000', REMEMBER_TEST_HASH)), 'another username');
    assertTrue($fingerprint !== poznoteRememberMeFingerprint(rememberTestToken('alice', '12', '1794000000', strtoupper(REMEMBER_TEST_HASH))), 'the hash is compared as written');
});

test('the fingerprint is one way and of a fixed shape', function () {
    $token = rememberTestToken('alice', '12', '1794000000', REMEMBER_TEST_HASH);
    $fingerprint = poznoteRememberMeFingerprint($token);
    assertSame(64, strlen($fingerprint));
    assertTrue(ctype_xdigit($fingerprint));
    assertTrue(strpos($fingerprint, REMEMBER_TEST_HASH) === false);
    // Not a cookie: still a fingerprint, of its own text.
    assertSame(64, strlen(poznoteRememberMeFingerprint('garbage')));
    assertTrue(poznoteRememberMeFingerprint('garbage') !== poznoteRememberMeFingerprint('garbage2'));
});
