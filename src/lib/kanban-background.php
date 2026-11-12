<?php
/**
 * Background image of a Kanban board (issue #1771), one per folder.
 *
 * Stored next to the workspace backgrounds, in data/users/{id}/backgrounds/,
 * but in a folder of its own rather than the workspace's: a folder can move
 * to another workspace and its board keeps its picture. getWorkspaceBackgroundSegment()
 * never returns a name starting with "_" (a leading underscore is trimmed and
 * the name hashed), so no workspace can share this folder.
 *
 * The opacity is the setting kanban_background_opacity_{folder id}, 5 to 100,
 * 100 by default: the columns are opaque, the picture is only seen around them.
 */

const POZNOTE_KANBAN_BACKGROUND_SEGMENT = '_kanban';

function poznoteKanbanBackgroundPrefix(int $folderId): string {
    return 'folder-' . $folderId;
}

function poznoteKanbanBackgroundDir(int $userId): string {
    return __DIR__ . '/../data/users/' . $userId . '/backgrounds/' . POZNOTE_KANBAN_BACKGROUND_SEGMENT;
}

/**
 * URL of the board's image, with its mtime so a replaced picture is fetched
 * again, or null when the board has none.
 */
function poznoteKanbanBackgroundUrl(int $userId, int $folderId): ?string {
    if ($userId <= 0 || $folderId <= 0) {
        return null;
    }
    $files = glob(poznoteKanbanBackgroundDir($userId) . '/' . poznoteKanbanBackgroundPrefix($folderId) . '.*');
    if (empty($files)) {
        return null;
    }
    return '/data/users/' . $userId . '/backgrounds/' . POZNOTE_KANBAN_BACKGROUND_SEGMENT . '/'
        . rawurlencode(basename($files[0])) . '?v=' . filemtime($files[0]);
}

function poznoteKanbanBackgroundOpacity($value): int {
    $parsed = filter_var($value, FILTER_VALIDATE_INT);
    if ($parsed === false) {
        return 100;
    }
    return max(5, min(100, (int)$parsed));
}

/**
 * Only the account's owner sets it: a session confined to a shared workspace,
 * or one looking at another account, cannot write the settings the opacity
 * lives in (auth.php), so it is not offered the image either.
 */
function poznoteKanbanBackgroundEditable(): bool {
    if (function_exists('getSharedWorkspaceScope') && getSharedWorkspaceScope() !== null) {
        return false;
    }
    return !function_exists('isActiveAccountOwnedByAuthenticatedUser') || isActiveAccountOwnedByAuthenticatedUser();
}
