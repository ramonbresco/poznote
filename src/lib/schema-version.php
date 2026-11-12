<?php
/**
 * The schema version of an account database.
 *
 * Two places need it: the bootstrap of db_connect.php, which migrates a
 * database whose stored version differs from this one, and the restore of a
 * backup (lib/backup-restore.php), which replaces the database and has to
 * decide whether that bootstrap must run again.
 */

/**
 * Bump it whenever the bootstrap of db_connect.php gains something an existing
 * database has to receive (a column, an index, a migration).
 *
 * 55: entries.updated_source (where the last change came from); 54:
 * entries.locked (a note its owner locked against editing); 53:
 * shared_notes.password_exempt (per-note exemption from an inherited folder
 * share password); 52: folders.title_color (#1729); 51: the speed dial's rail
 * entry shown again; 50: entries.speed_dial_order
 */
const POZNOTE_SCHEMA_VERSION = 55;

/**
 * Make the next request replay the bootstrap on a database that was just
 * rebuilt from a backup dump.
 *
 * A dump carries tables and rows, not the indexes: those are only created by
 * the bootstrap of db_connect.php, which is skipped when the stored version is
 * the current one. A backup made and restored under the same release would
 * therefore leave the account without a single index (and without the UNIQUE
 * ones that keep two folders from sharing a name) until the next release that
 * bumps the version. Dropping the version claim sends the database through the
 * bootstrap again, which is idempotent and stamps the version back.
 *
 * Only a database claiming the current version is touched. An older or newer
 * one replays the bootstrap anyway, and must keep its real version: the
 * migrations read it to know which ones apply.
 *
 * @param PDO $con Connection to the restored database, in exception mode
 * @return bool Whether the version claim was dropped
 */
function poznoteForgetRestoredSchemaVersion(PDO $con): bool {
    $stored = $con->query("SELECT value FROM settings WHERE key = 'schema_version'")->fetchColumn();
    if ($stored === false || (int)$stored !== POZNOTE_SCHEMA_VERSION) {
        return false;
    }

    $con->exec("DELETE FROM settings WHERE key = 'schema_version'");

    return true;
}
