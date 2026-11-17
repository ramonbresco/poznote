<?php
/**
 * Workspace colour as the accent colour (discussion #1788).
 *
 * A workspace can carry a colour (workspaces.color, a palette id or
 * '#rrggbb'), which the Dashboard uses to tell several workspaces apart.
 * With the account setting workspace_color_accent on (the default), that colour
 * also replaces the Poznote blue while the user works in the workspace:
 * blue icons, hovers, the line on the active tab, links, primary buttons,
 * selection, active rows. Everything that is blue reads the accent tokens of
 * css/tokens.css, so overriding those tokens is the whole feature.
 *
 * Only the Light, Dark and Black themes follow it. Lavender, Sepia, Terminal
 * and the custom themes (theme-init.js marks those with html.theme-custom)
 * bring their own palette and keep it. Settings and its sub-pages keep the
 * blue too (decided by the maintainer): they belong to no workspace, so only
 * the pages listed in poznoteWorkspaceAccentPages() get the colour.
 *
 * One colour has to give every shade the tokens hold, in both modes, and some
 * colours make poor accents (a yellow link on white, white text on a yellow
 * button). So the colour is never used as it is when it would be hard to
 * read: the light fill is darkened until a white label on it, and the fill as
 * text on white, reach the contrast the default blue has; the dark text shade
 * is lightened until it reads on the dark note ground. Only the lightness
 * moves, the hue and saturation stay, so a yellow workspace comes out a deep
 * gold rather than another colour.
 *
 * Everything here is pure except poznoteRenderWorkspaceAccentStyle(), so the
 * shades can be checked without an instance (tests/workspace-accent.test.php).
 */

/** Contrast of the light fill against white (#007db8 is 4.6:1). */
const POZNOTE_WS_ACCENT_LIGHT_CONTRAST = 4.5;
/** Contrast of the strong light shade (text on the pale wash) against white. */
const POZNOTE_WS_ACCENT_STRONG_CONTRAST = 7.5;
/** Contrast of the dark text shade against the dark note ground (#4a9eff is 5.9:1). */
const POZNOTE_WS_ACCENT_DARK_CONTRAST = 5.5;
/** The dark theme's note ground, the lightest one the dark shade has to read on. */
const POZNOTE_WS_ACCENT_DARK_GROUND = '#252526';

/**
 * The pages that belong to a workspace and therefore take its colour, by
 * script name. Settings, its sub-pages, the admin pages, login and the public
 * pages are deliberately absent.
 */
function poznoteWorkspaceAccentPages(): array {
    return [
        'index.php', 'dashboard.php', 'speed_dial.php', 'tasks.php', 'diary.php',
        'graph.php', 'list_tags.php', 'list_folders.php', 'trash.php',
        'attachments_list.php', 'attachments.php', 'shared.php',
        'offline_notes.php', 'notes_manager.php', 'mentions.php', 'favorites.php',
        'revisions.php', 'excalidraw_editor.php', 'create.php',
    ];
}

function poznoteWorkspaceAccentPageAllowed(string $scriptName): bool {
    return in_array(basename($scriptName), poznoteWorkspaceAccentPages(), true);
}

/** '#rrggbb' to [r, g, b] (0-255), or null. */
function poznoteWsAccentHexToRgb(string $hex): ?array {
    if (!preg_match('/^#([0-9a-f]{6})$/i', trim($hex), $m)) {
        return null;
    }
    return [hexdec(substr($m[1], 0, 2)), hexdec(substr($m[1], 2, 2)), hexdec(substr($m[1], 4, 2))];
}

function poznoteWsAccentRgbToHex(array $rgb): string {
    return sprintf('#%02x%02x%02x',
        max(0, min(255, (int)round($rgb[0]))),
        max(0, min(255, (int)round($rgb[1]))),
        max(0, min(255, (int)round($rgb[2]))));
}

/** WCAG relative luminance of [r, g, b]. */
function poznoteWsAccentLuminance(array $rgb): float {
    $channel = function ($v) {
        $v = $v / 255;
        return $v <= 0.03928 ? $v / 12.92 : (($v + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * $channel($rgb[0]) + 0.7152 * $channel($rgb[1]) + 0.0722 * $channel($rgb[2]);
}

/** WCAG contrast ratio between two [r, g, b]. */
function poznoteWsAccentContrast(array $a, array $b): float {
    $la = poznoteWsAccentLuminance($a);
    $lb = poznoteWsAccentLuminance($b);
    return (max($la, $lb) + 0.05) / (min($la, $lb) + 0.05);
}

/** [r, g, b] to [h (0-360), s (0-1), l (0-1)]. */
function poznoteWsAccentRgbToHsl(array $rgb): array {
    $r = $rgb[0] / 255;
    $g = $rgb[1] / 255;
    $b = $rgb[2] / 255;
    $max = max($r, $g, $b);
    $min = min($r, $g, $b);
    $l = ($max + $min) / 2;
    if ($max === $min) {
        return [0.0, 0.0, $l];
    }
    $d = $max - $min;
    $s = $l > 0.5 ? $d / (2 - $max - $min) : $d / ($max + $min);
    if ($max === $r) {
        $h = ($g - $b) / $d + ($g < $b ? 6 : 0);
    } elseif ($max === $g) {
        $h = ($b - $r) / $d + 2;
    } else {
        $h = ($r - $g) / $d + 4;
    }
    return [$h * 60, $s, $l];
}

/** [h, s, l] to [r, g, b] (floats, 0-255). */
function poznoteWsAccentHslToRgb(array $hsl): array {
    [$h, $s, $l] = $hsl;
    $l = max(0.0, min(1.0, $l));
    if ($s <= 0) {
        return [$l * 255, $l * 255, $l * 255];
    }
    $q = $l < 0.5 ? $l * (1 + $s) : $l + $s - $l * $s;
    $p = 2 * $l - $q;
    $hue = function ($t) use ($p, $q) {
        if ($t < 0) { $t += 1; }
        if ($t > 1) { $t -= 1; }
        if ($t < 1 / 6) { return $p + ($q - $p) * 6 * $t; }
        if ($t < 1 / 2) { return $q; }
        if ($t < 2 / 3) { return $p + ($q - $p) * (2 / 3 - $t) * 6; }
        return $p;
    };
    $h /= 360;
    return [$hue($h + 1 / 3) * 255, $hue($h) * 255, $hue($h - 1 / 3) * 255];
}

/**
 * The colour with its lightness moved by $delta (-1..1), rounded to a hex.
 */
function poznoteWsAccentShiftLightness(string $hex, float $delta): string {
    $hsl = poznoteWsAccentRgbToHsl(poznoteWsAccentHexToRgb($hex));
    $hsl[2] = max(0.0, min(1.0, $hsl[2] + $delta));
    return poznoteWsAccentRgbToHex(poznoteWsAccentHslToRgb($hsl));
}

/**
 * The colour, darkened ($direction -1) or lightened (+1) one lightness step at
 * a time until it reaches $ratio against $ground. Returned unchanged when it
 * already does. Black or white is the end of the road and always qualifies
 * for the ratios used here.
 */
function poznoteWsAccentUntilContrast(string $hex, string $ground, float $ratio, int $direction): string {
    $groundRgb = poznoteWsAccentHexToRgb($ground);
    $current = strtolower($hex);
    for ($i = 0; $i < 100; $i++) {
        if (poznoteWsAccentContrast(poznoteWsAccentHexToRgb($current), $groundRgb) >= $ratio) {
            return $current;
        }
        $next = poznoteWsAccentShiftLightness($current, $direction * 0.01);
        if ($next === $current) {
            break;
        }
        $current = $next;
    }
    return $current;
}

/** $weight of $hex over $ground (0..1), as a hex. */
function poznoteWsAccentMix(string $hex, string $ground, float $weight): string {
    $a = poznoteWsAccentHexToRgb($hex);
    $b = poznoteWsAccentHexToRgb($ground);
    return poznoteWsAccentRgbToHex([
        $a[0] * $weight + $b[0] * (1 - $weight),
        $a[1] * $weight + $b[1] * (1 - $weight),
        $a[2] * $weight + $b[2] * (1 - $weight),
    ]);
}

function poznoteWsAccentRgbChannels(string $hex): string {
    $rgb = poznoteWsAccentHexToRgb($hex);
    return $rgb[0] . ', ' . $rgb[1] . ', ' . $rgb[2];
}

/**
 * Every accent token a workspace colour sets, by group:
 *   fill:  the fill of a button with a white label, the same in both modes
 *          (the dark theme keeps the light fill too)
 *   light: the shades only a light theme uses
 *   dark:  the dark layer's values (--dm-*), for Dark and Black
 *   black: the active row and wash again, mixed into the Black theme's ground
 * Returns null for anything that is not '#rrggbb'.
 */
function poznoteWorkspaceAccentTokens(string $hex): ?array {
    $hex = strtolower(trim($hex));
    if (poznoteWsAccentHexToRgb($hex) === null) {
        return null;
    }

    $fill = poznoteWsAccentUntilContrast($hex, '#ffffff', POZNOTE_WS_ACCENT_LIGHT_CONTRAST, -1);
    $strong = poznoteWsAccentUntilContrast($fill, '#ffffff', POZNOTE_WS_ACCENT_STRONG_CONTRAST, -1);
    $darkText = poznoteWsAccentUntilContrast($hex, POZNOTE_WS_ACCENT_DARK_GROUND, POZNOTE_WS_ACCENT_DARK_CONTRAST, 1);

    return [
        'fill' => [
            '--pz-accent' => $fill,
            '--pz-accent-hover' => poznoteWsAccentShiftLightness($fill, -0.09),
            '--pz-accent-rgb' => poznoteWsAccentRgbChannels($fill),
        ],
        'light' => [
            '--pz-accent-strong' => $strong,
            '--pz-accent-soft' => poznoteWsAccentMix($fill, '#ffffff', 0.12),
        ],
        'dark' => [
            '--dm-accent' => $darkText,
            '--dm-accent-rgb' => poznoteWsAccentRgbChannels($darkText),
            '--dm-accent-hover' => poznoteWsAccentShiftLightness($darkText, 0.08),
            '--dm-accent-soft' => poznoteWsAccentMix($darkText, '#252526', 0.25),
            '--dm-active' => poznoteWsAccentMix($darkText, '#1e1e1e', 0.28),
        ],
        'black' => [
            '--dm-accent-soft' => poznoteWsAccentMix($darkText, '#141821', 0.22),
            '--dm-active' => poznoteWsAccentMix($darkText, '#0f1117', 0.22),
        ],
    ];
}

/**
 * The stylesheet that applies a workspace colour, or '' for no colour.
 *
 * The selectors outrank every block of css/tokens.css that sets these names
 * (html[data-theme='dark'] is 0,1,1 and html.theme-black[data-theme='dark']
 * 0,2,1), whatever the order the two stylesheets arrive in, and leave out the
 * themes that keep their own palette. The light-only shades are kept off a
 * dark page, where the dark block points them at the --dm-* values.
 */
function poznoteWorkspaceAccentCss(string $hex): string {
    $tokens = poznoteWorkspaceAccentTokens($hex);
    if ($tokens === null) {
        return '';
    }

    $own = ':not(.theme-lavender):not(.theme-sepia):not(.theme-terminal):not(.theme-custom)';
    $block = function (string $selector, array $vars): string {
        $lines = [];
        foreach ($vars as $name => $value) {
            $lines[] = $name . ':' . $value . ';';
        }
        return $selector . '{' . implode('', $lines) . '}';
    };

    return $block('html' . $own, $tokens['fill'])
        . $block('html:not([data-theme=\'dark\'])' . $own, $tokens['light'])
        . $block('html[data-theme=\'dark\']' . $own, $tokens['dark'])
        . $block('html.theme-black[data-theme=\'dark\']' . $own, $tokens['black']);
}

/**
 * Whether the stored workspace_color_accent value means on. On by default
 * (decided by the maintainer): no row, or an empty value, is on, so only an
 * explicit "off" keeps the blue. A workspace without a colour stays blue
 * either way, so nothing changes until someone gives a workspace a colour.
 */
function poznoteWorkspaceAccentEnabled($stored): bool {
    if ($stored === false || $stored === null) {
        return true;
    }
    $value = strtolower(trim((string)$stored));
    if ($value === '') {
        return true;
    }
    return $value === '1' || $value === 'true';
}

/**
 * The workspace the page shows: the one of the note it opens when it names
 * one (a note link may leave the workspace out of the URL), else the page's
 * workspace filter.
 */
function poznoteWorkspaceAccentCurrentWorkspace(PDO $con): string {
    $noteId = isset($_GET['note']) ? (int)$_GET['note'] : 0;
    if ($noteId > 0) {
        try {
            $stmt = $con->prepare('SELECT workspace FROM entries WHERE id = ?');
            $stmt->execute([$noteId]);
            $workspace = $stmt->fetchColumn();
            if (is_string($workspace) && $workspace !== '') {
                return $workspace;
            }
        } catch (Throwable $e) {
            // Fall back on the workspace filter below.
        }
    }
    return function_exists('getWorkspaceFilter') ? trim((string)getWorkspaceFilter()) : '';
}

/**
 * The <style> element the head of a workspace page gets, or '' when the
 * setting is off, the page is not a workspace page, the workspace has no
 * colour or nothing can be read. Never fails a page: any error means blue.
 */
function poznoteRenderWorkspaceAccentStyle(): string {
    global $con;
    if (!isset($con) || !($con instanceof PDO)) {
        return '';
    }
    if (!poznoteWorkspaceAccentPageAllowed((string)($_SERVER['SCRIPT_NAME'] ?? ''))) {
        return '';
    }

    try {
        $stmt = $con->prepare('SELECT value FROM settings WHERE key = ?');
        $stmt->execute(['workspace_color_accent']);
        if (!poznoteWorkspaceAccentEnabled($stmt->fetchColumn())) {
            return '';
        }

        $workspace = poznoteWorkspaceAccentCurrentWorkspace($con);
        if ($workspace === '') {
            return '';
        }

        $stmt = $con->prepare('SELECT color FROM workspaces WHERE name = ?');
        $stmt->execute([$workspace]);
        $stored = (string)$stmt->fetchColumn();
        if ($stored === '') {
            return '';
        }

        if (!function_exists('resolveNoteColorHex')) {
            require_once __DIR__ . '/note-colors.php';
        }
        $css = poznoteWorkspaceAccentCss((string)resolveNoteColorHex($stored));
    } catch (Throwable $e) {
        return '';
    }

    if ($css === '') {
        return '';
    }
    return '<style id="poznote-workspace-accent">' . $css . '</style>';
}
