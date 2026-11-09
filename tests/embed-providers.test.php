<?php
lib('embed-providers');
lib('html-sanitize');

// The hosts a note may frame. The catalogue is the only place they are
// declared, and the setting can only switch a shipped provider off: these
// assertions are the net under both halves of that rule (#1742).

test('the catalogue ships the embed providers, hosts included', function () {
    $catalogue = poznoteEmbedProviderCatalogue();
    assertSame(['youtube', 'bilibili', 'geogebra'], array_keys($catalogue));
    assertTrue(in_array('www.youtube.com', $catalogue['youtube']['domains'], true), 'youtube host');
    assertTrue(in_array('player.bilibili.com', $catalogue['bilibili']['domains'], true), 'bilibili host');
    assertSame(['geogebra.org', 'www.geogebra.org'], $catalogue['geogebra']['domains']);
});

test('nothing stored allows every shipped host', function () {
    // What an unreadable master.db, a fresh instance and an empty value all
    // resolve to: the behaviour of the hardcoded list this setting replaced.
    assertSame([], poznoteResolveDisabledEmbedProviders(''));
    $domains = poznoteResolveEmbedDomains([]);
    assertTrue(in_array('www.geogebra.org', $domains, true), 'geogebra allowed by default');
    assertTrue(in_array('youtube-nocookie.com', $domains, true), 'youtube allowed by default');
    assertSame(9, count($domains));
});

test('a disabled provider takes its hosts out of the allowed list', function () {
    $domains = poznoteResolveEmbedDomains(poznoteResolveDisabledEmbedProviders('["geogebra"]'));
    assertTrue(!in_array('www.geogebra.org', $domains, true), 'geogebra host dropped');
    assertTrue(in_array('www.youtube.com', $domains, true), 'the other providers stay');
});

test('a stored value that makes no sense disables nothing', function () {
    // Never "disable everything": that would drop the embeds of every note.
    assertSame([], poznoteResolveDisabledEmbedProviders('not json'));
    assertSame([], poznoteResolveDisabledEmbedProviders('{"youtube":true}'));
    assertSame([], poznoteResolveDisabledEmbedProviders('["no-such-provider"]'));
    assertSame([], poznoteResolveDisabledEmbedProviders('[]'));
    // A provider a later version drops is ignored, the rest still applies.
    assertSame(['youtube'], poznoteResolveDisabledEmbedProviders('["youtube","gone"]'));
});

test('a write is validated and stored in catalogue order', function () {
    assertSame('[]', poznoteNormalizeEmbedProvidersDisabled(''));
    assertSame('[]', poznoteNormalizeEmbedProvidersDisabled('[]'));
    assertSame('["youtube"]', poznoteNormalizeEmbedProvidersDisabled('["youtube"]'));
    assertSame('["youtube","geogebra"]', poznoteNormalizeEmbedProvidersDisabled('["geogebra","youtube"]'));
    assertSame('["youtube","bilibili","geogebra"]', poznoteNormalizeEmbedProvidersDisabled(['geogebra', 'bilibili', 'youtube']));
});

test('a write cannot name anything but a shipped provider', function () {
    // This is what keeps the setting from becoming a host allow-list: an
    // administrator switches off what the version ships, nothing else.
    $refused = 0;
    foreach (['["vimeo.com"]', '["https://evil.test"]', '"youtube"', '[1]', '{"a":1}'] as $value) {
        try {
            poznoteNormalizeEmbedProvidersDisabled($value);
        } catch (InvalidArgumentException $e) {
            $refused++;
        }
    }
    assertSame(5, $refused);
});

test('a GeoGebra applet is a trusted embed, a look-alike host is not', function () {
    assertTrue(poznoteIframeSrcIsTrusted('https://www.geogebra.org/calculator/abcd1234?embed'), 'applet');
    assertTrue(poznoteIframeSrcIsTrusted('https://geogebra.org/m/abcd1234?embed'), 'bare domain');
    assertTrue(!poznoteIframeSrcIsTrusted('https://www.geogebra.org.evil.test/x'), 'look-alike host');
    assertTrue(!poznoteIframeSrcIsTrusted('https://evil.test/?u=https://www.geogebra.org/'), 'host in the query');
});

test('sanitizeHtml keeps a GeoGebra applet in a note', function () {
    $html = sanitizeHtml('<iframe src="https://www.geogebra.org/calculator/abcd1234?embed" width="800" height="600"></iframe>');
    assertContains('geogebra.org/calculator/abcd1234', $html);
});
