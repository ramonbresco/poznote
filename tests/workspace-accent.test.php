<?php
lib('workspace-accent');

// Discussion #1788: the colour of a workspace replaces the Poznote blue. The
// colour is the user's, so the shades derived from it have to stay readable
// whatever it is: that is what these tests hold.

$wsAccentSamples = [
    '#007db8', '#3b82f6', '#22c55e', '#eab308', '#f97316', '#ef4444', '#a855f7',
    '#ec4899', '#6b7280', '#ffffff', '#000000', '#ffff00', '#00ffff', '#1e1e1e',
];

test('workspace accent: the light fill always carries a white label', function () use ($wsAccentSamples) {
    foreach ($wsAccentSamples as $hex) {
        $fill = poznoteWorkspaceAccentTokens($hex)['fill']['--pz-accent'];
        $ratio = poznoteWsAccentContrast(poznoteWsAccentHexToRgb($fill), [255, 255, 255]);
        assertTrue($ratio >= POZNOTE_WS_ACCENT_LIGHT_CONTRAST, "$hex gives $fill at $ratio:1 on white");
    }
});

test('workspace accent: the strong shade reads on the pale wash', function () use ($wsAccentSamples) {
    foreach ($wsAccentSamples as $hex) {
        $t = poznoteWorkspaceAccentTokens($hex)['light'];
        $ratio = poznoteWsAccentContrast(poznoteWsAccentHexToRgb($t['--pz-accent-strong']), poznoteWsAccentHexToRgb($t['--pz-accent-soft']));
        assertTrue($ratio >= 4.5, "$hex strong on soft is $ratio:1");
    }
});

test('workspace accent: the dark text shade reads on the dark note ground', function () use ($wsAccentSamples) {
    $ground = poznoteWsAccentHexToRgb(POZNOTE_WS_ACCENT_DARK_GROUND);
    foreach ($wsAccentSamples as $hex) {
        $text = poznoteWorkspaceAccentTokens($hex)['dark']['--dm-accent'];
        $ratio = poznoteWsAccentContrast(poznoteWsAccentHexToRgb($text), $ground);
        assertTrue($ratio >= POZNOTE_WS_ACCENT_DARK_CONTRAST, "$hex gives $text at $ratio:1 on the dark ground");
    }
});

test('workspace accent: a readable colour is used as it is', function () {
    $t = poznoteWorkspaceAccentTokens('#007DB8');
    assertSame('#007db8', $t['fill']['--pz-accent']);
    assertSame('0, 125, 184', $t['fill']['--pz-accent-rgb']);
});

test('workspace accent: yellow is darkened, not swapped for another hue', function () {
    $fill = poznoteWorkspaceAccentTokens('#eab308')['fill']['--pz-accent'];
    assertTrue($fill !== '#eab308', 'yellow is too light for a white label');
    $hue = poznoteWsAccentRgbToHsl(poznoteWsAccentHexToRgb($fill))[0];
    $original = poznoteWsAccentRgbToHsl(poznoteWsAccentHexToRgb('#eab308'))[0];
    assertTrue(abs($hue - $original) < 3, "hue moved from $original to $hue");
});

test('workspace accent: anything but #rrggbb gives nothing', function () {
    foreach (['', 'green', '#abc', '#12345g', 'red;}body{display:none', '#123456;x'] as $bad) {
        assertSame(null, poznoteWorkspaceAccentTokens($bad), var_export($bad, true));
        assertSame('', poznoteWorkspaceAccentCss($bad), var_export($bad, true));
    }
});

test('workspace accent: the stylesheet leaves the themes with their own palette alone', function () {
    $css = poznoteWorkspaceAccentCss('#22c55e');
    foreach (preg_split('/\}/', $css, -1, PREG_SPLIT_NO_EMPTY) as $rule) {
        $selector = substr($rule, 0, strpos($rule, '{'));
        foreach (['theme-lavender', 'theme-sepia', 'theme-terminal', 'theme-custom'] as $theme) {
            assertContains(':not(.' . $theme . ')', $selector, $selector);
        }
    }
    // The light-only shades never land on a dark page, where css/tokens.css
    // points them at the dark values.
    assertContains("html:not([data-theme='dark'])", $css);
    assertNotContains('<', $css);
});

test('workspace accent: only workspace pages take the colour, never Settings', function () {
    foreach (['/index.php', 'dashboard.php', '/poznote/tasks.php', 'speed_dial.php'] as $page) {
        assertTrue(poznoteWorkspaceAccentPageAllowed($page), $page);
    }
    foreach (['settings.php', 'backup_export.php', 'ai_settings_user.php', 'admin/users.php', 'login.php', 'public_note.php', 'public_folder.php', 'welcome.php', ''] as $page) {
        assertFalse(poznoteWorkspaceAccentPageAllowed($page), $page);
    }
});

test('workspace accent: on by default, off only when switched off', function () {
    foreach ([false, null, '', ' ', '1', 'true', 'TRUE'] as $on) {
        assertTrue(poznoteWorkspaceAccentEnabled($on), var_export($on, true));
    }
    foreach (['0', 'false', 'off', 'no'] as $off) {
        assertFalse(poznoteWorkspaceAccentEnabled($off), var_export($off, true));
    }
});
