<?php
lib('i18n', 'datetime', 'diary', 'note-titles');

function dutchI18nLeaves(array $dictionary, string $prefix = ''): array {
    $leaves = [];
    foreach ($dictionary as $key => $value) {
        $path = $prefix === '' ? $key : $prefix . '.' . $key;
        if (is_array($value)) {
            $leaves += dutchI18nLeaves($value, $path);
        } else {
            $leaves[$path] = $value;
        }
    }
    return $leaves;
}

// A key missing from nl.json falls back to English at runtime, so a new English
// string does not have to wait for its Dutch translation. Only stale keys fail.
test('Dutch has no key unknown to English and preserves runtime placeholders and HTML', function () {
    $english = dutchI18nLeaves(loadI18nDictionary('en'));
    $dutch = dutchI18nLeaves(loadI18nDictionary('nl'));
    assertSame([], array_values(array_diff(array_keys($dutch), array_keys($english))), 'keys unknown to English');
    foreach ($dutch as $key => $translated) {
        $source = $english[$key];
        assertTrue(is_string($translated) && trim($translated) !== '', $key);
        foreach (['/\{\{[^}]+\}\}/', '/<[^>]+>/', '/<code>.*?<\/code>/s'] as $pattern) {
            preg_match_all($pattern, $source, $original);
            preg_match_all($pattern, $translated, $localized);
            sort($original[0]);
            sort($localized[0]);
            assertSame($original[0], $localized[0], $key);
        }
        assertFalse((bool) preg_match('/<a\b[^>]*>\s*<\/a>/i', $translated), $key . ' has an empty link label');
    }
});

test('Dutch browsers and explicit Dutch settings select the Dutch dictionary', function () {
    assertSame('nl', poznoteNormalizeLanguageCode('NL'));
    assertSame('nl', poznoteDetectBrowserLanguage('nl-NL,nl;q=0.9,en;q=0.8', poznoteSupportedLanguages()));
    assertSame('nl', poznoteDetectBrowserLanguage('nl-BE', poznoteSupportedLanguages()));
    assertSame('fr', poznoteDetectBrowserLanguage('fr-BE,nl;q=0.5', poznoteSupportedLanguages()));
    assertSame('Nederlands', t('settings.language.dutch', [], null, 'nl'));
    assertSame('Dutch', t('settings.language.dutch', [], null, 'en'));
});

test('Dutch long dates keep day and month names in their Dutch form', function () {
    $date = new DateTime('2026-09-05 14:07:00');
    $long = getDateTimeFormatPatterns()['long'];
    assertSame('Zaterdag 5 september 2026 14:07', applyDateNameTokens($date->format($long), $date, 'nl'));
    $short = customDateTimePatternToPhpFormat('ddd DD MMM YYYY');
    assertSame('Za 05 sep. 2026', applyDateNameTokens($date->format($short), $date, 'nl'));
    $march = new DateTime('2026-03-10');
    assertSame('10 maart 2026', applyDateNameTokens($march->format(customDateTimePatternToPhpFormat('D MMMM YYYY')), $march, 'nl'));
});

test('Dutch long diary titles give their day back', function () {
    assertSame('2026-09-05', parseDiaryLongDateTitle('Zaterdag 5 september 2026'));
    assertSame('2026-05-13', parseDiaryLongDateTitle('woensdag 13 mei 2026'));
    $day = new DateTime('2026-01-01');
    for ($i = 0; $i < 365; $i++) {
        assertSame($day->format('Y-m-d'), parseDiaryLongDateTitle(formatLongDate($day, 'nl')), $day->format('Y-m-d'));
        $day->modify('+1 day');
    }
});

test('Dutch messages preserve webhook field paths', function () {
    foreach (['webhooks_user.app_url_unset', 'webhooks_user.app_url_unset_admin', 'webhooks_admin.hints.app_url_unset', 'webhooks_admin.app_url_description'] as $key) {
        assertContains('data.note.url', t($key, [], null, 'nl'), $key);
    }
});

test('the numbered Dutch default title is still a default title', function () {
    $match = matchDefaultNoteTitle(t('index.note.new_note_numbered', ['number' => 3], null, 'nl'));
    assertSame('Nieuwe notitie', $match['title'] ?? null);
    assertSame('3', $match['number'] ?? null);
});
