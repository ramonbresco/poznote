<?php
/**
 * The lock a note's owner puts on it: entries.locked (schema 54).
 *
 * This is NOT the edit lock of two people opening the same note at once
 * (note_edit_locks, lib/note-edit-lock.php): that one is short-lived, taken
 * by whoever types first and released on its own. This one is a deliberate
 * state the owner switches on from the note toolbar and that nothing clears
 * by itself.
 *
 * What it protects is the note's TEXT and its TITLE. A locked note refuses
 * every write to those, wherever it comes from: the editor, the REST API,
 * the MCP server, the built-in assistant and a visitor of an editable public
 * share. Everything else about the note stays as it was, since none of it
 * can lose a word the owner wrote: tags, favourite, icon and colour, the
 * folder it sits in, its attachments, its reminders, and moving it to the
 * trash (which is reversible and already asks first).
 *
 * The flag is per note, not per account: a note shared with a workspace stays
 * locked for everyone who can reach it, which is the point.
 */

/** Refusals carry this code, so a client can tell them from an edit-lock 423. */
const POZNOTE_NOTE_LOCKED_CODE = 'note_is_locked';

/**
 * True when the note exists and its owner locked it.
 *
 * Reads the column defensively: a database that has not run the schema 54
 * migration yet (a restore in progress, a connection opened before it) must
 * read as "not locked" rather than make every write fail.
 */
function poznoteNoteIsLocked(PDO $con, int $noteId): bool {
    if ($noteId <= 0) {
        return false;
    }
    try {
        $stmt = $con->prepare('SELECT locked FROM entries WHERE id = ?');
        $stmt->execute([$noteId]);
        $value = $stmt->fetchColumn();
    } catch (PDOException $e) {
        return false;
    }
    return $value !== false && (int)$value === 1;
}

/**
 * The message a refusal carries. One wording for every caller, so the editor,
 * the API, an agent and a public visitor are all told the same thing.
 */
function poznoteNoteLockedMessage(): string {
    return function_exists('t')
        ? t('note_lock.locked_error', [], 'This note is locked. Unlock it from the note toolbar before editing it.')
        : 'This note is locked. Unlock it from the note toolbar before editing it.';
}
