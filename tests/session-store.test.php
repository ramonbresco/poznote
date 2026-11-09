<?php
lib('session-store');

// The "Connected devices" list reads PHP's own session files, whose "php"
// serialize handler writes a flat "key|payload" sequence. Only the payload's
// grammar says where it ends, so a shortcut (splitting on "|", or a regex for
// "login_user_id|i:") would read a key out of someone else's string value.
// These tests exist for that one bug: a session must never be attributed to a
// profile because a text field inside it happened to spell the key.

function sessionBlob(array $pairs): string {
    $out = '';
    foreach ($pairs as $key => $value) {
        $out .= $key . '|' . serialize($value);
    }
    return $out;
}

test('measures every scalar payload', function () {
    assertSame(2, poznoteMeasureSerializedValue('N;', 0));
    assertSame(4, poznoteMeasureSerializedValue('b:1;', 0));
    assertSame(8, poznoteMeasureSerializedValue('i:12345;', 0));
    assertSame(strlen('d:1.5;'), poznoteMeasureSerializedValue('d:1.5;', 0));
    assertSame(strlen('s:5:"hello";'), poznoteMeasureSerializedValue('s:5:"hello";', 0));
});

test('a string payload may hold quotes, semicolons and the key separator', function () {
    $raw = serialize('a";b|c;i:1;');
    assertSame(strlen($raw), poznoteMeasureSerializedValue($raw, 0));
});

test('walks nested arrays without parsing them', function () {
    $raw = serialize(['a' => [1, 2, ['deep' => 'x;y|z']], 'b' => null]);
    assertSame(strlen($raw), poznoteMeasureSerializedValue($raw, 0));
});

test('refuses a truncated payload', function () {
    assertSame(null, poznoteMeasureSerializedValue('s:50:"short";', 0));
    assertSame(null, poznoteMeasureSerializedValue('a:2:{i:0;i:1;', 0));
    assertSame(null, poznoteMeasureSerializedValue('', 0));
    assertSame(null, poznoteMeasureSerializedValue('x:1;', 0));
});

test('reads the keys it was asked for and steps over the rest', function () {
    $raw = sessionBlob([
        'csrf_token' => str_repeat('a', 64),
        'authenticated' => true,
        'login_user_id' => 2744,
        'login_user' => ['id' => 2744, 'username' => 'tim', 'email' => 'tim@example.com'],
        'auth_method' => 'oidc',
        'session_client' => 'Mozilla/5.0 (Linux; Android 14) Chrome/130.0',
        'session_created_at' => 1762700000,
    ]);
    $data = poznoteDecodeSessionFile($raw, ['login_user_id', 'authenticated', 'auth_method', 'session_client', 'session_created_at']);
    assertSame(2744, $data['login_user_id']);
    assertSame(true, $data['authenticated']);
    assertSame('oidc', $data['auth_method']);
    assertSame(1762700000, $data['session_created_at']);
    assertSame(false, array_key_exists('login_user', $data), 'unwanted keys stay out');
});

test('a key spelled inside a string value is not read as a key', function () {
    // What an identity provider's display name, or any text the account owns,
    // could contain. Attributing this session to profile 1 would show it in
    // another account's device list, and let that account end it.
    $raw = sessionBlob([
        'authenticated' => true,
        'login_user_id' => 77,
        'oidc_claims' => ['name' => ';login_user_id|i:1;authenticated|b:1;'],
    ]);
    $data = poznoteDecodeSessionFile($raw, ['login_user_id', 'authenticated']);
    assertSame(77, $data['login_user_id']);
});

test('a half-written file yields nothing instead of a guess', function () {
    $raw = sessionBlob(['authenticated' => true, 'login_user_id' => 5]);
    $data = poznoteDecodeSessionFile(substr($raw, 0, strlen($raw) - 3), ['login_user_id']);
    assertSame(false, array_key_exists('login_user_id', $data));
});

test('a false boolean is kept, not dropped as a parse failure', function () {
    $data = poznoteDecodeSessionFile(sessionBlob(['authenticated' => false]), ['authenticated']);
    assertSame(true, array_key_exists('authenticated', $data));
    assertSame(false, $data['authenticated']);
});

test('the handle is stable, opaque and short', function () {
    $handle = poznoteSessionHandle('0bc490a5be88c1e709ab797baac55bed');
    assertSame(32, strlen($handle));
    assertSame($handle, poznoteSessionHandle('0bc490a5be88c1e709ab797baac55bed'));
    assertSame(false, $handle === poznoteSessionHandle('0bc490a5be88c1e709ab797baac55bee'));
    assertSame(false, strpos($handle, '0bc490a5') === 0, 'the session id must not show through');
});

test('names the browser and the system behind a user agent', function () {
    assertSame('Chrome · Android', poznoteDescribeSessionClient('Mozilla/5.0 (Linux; Android 14; Pixel) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36'));
    assertSame('Safari · iPhone', poznoteDescribeSessionClient('Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 Version/18.1 Mobile/15E148 Safari/604.1'));
    assertSame('Firefox · Windows', poznoteDescribeSessionClient('Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0'));
    assertSame('Edge · Windows', poznoteDescribeSessionClient('Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/130.0 Safari/537.36 Edg/130.0'));
    assertSame('', poznoteDescribeSessionClient(null));
    assertSame('', poznoteDescribeSessionClient('   '));
});
