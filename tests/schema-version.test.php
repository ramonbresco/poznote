<?php
lib('schema-version');
require_once dirname(__DIR__) . '/src/backup_sql_restore.php';

// A backup dump carries tables and rows, never the indexes: only the bootstrap
// of db_connect.php creates those, and it is skipped while the stored version
// is the current one. A backup made and restored under the same release left
// the account without any index, the UNIQUE ones on folders included, until
// the next release that bumped the version.

/** A database holding nothing but a settings table, at the given version. */
function schemaVersionDb(?string $storedVersion): PDO
{
    $con = new PDO('sqlite::memory:');
    $con->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $con->exec('CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT)');
    $con->exec("INSERT INTO settings (key, value) VALUES ('language', 'fr')");
    if ($storedVersion !== null) {
        $con->prepare("INSERT INTO settings (key, value) VALUES ('schema_version', ?)")->execute([$storedVersion]);
    }
    return $con;
}

function storedSchemaVersion(PDO $con)
{
    return $con->query("SELECT value FROM settings WHERE key = 'schema_version'")->fetchColumn();
}

test('a database restored at the current version loses its version claim', function () {
    $con = schemaVersionDb((string)POZNOTE_SCHEMA_VERSION);
    assertTrue(poznoteForgetRestoredSchemaVersion($con));
    assertSame(false, storedSchemaVersion($con), 'the bootstrap must not be skipped');
    assertSame('fr', $con->query("SELECT value FROM settings WHERE key = 'language'")->fetchColumn(), 'other settings');
});

test('an older backup keeps its version, the migrations read it', function () {
    $older = (string)(POZNOTE_SCHEMA_VERSION - 5);
    $con = schemaVersionDb($older);
    assertFalse(poznoteForgetRestoredSchemaVersion($con));
    assertSame($older, storedSchemaVersion($con));
});

test('a backup from a newer release keeps its version too', function () {
    $newer = (string)(POZNOTE_SCHEMA_VERSION + 1);
    $con = schemaVersionDb($newer);
    assertFalse(poznoteForgetRestoredSchemaVersion($con));
    assertSame($newer, storedSchemaVersion($con));
});

test('a database without a version is left as it is', function () {
    $con = schemaVersionDb(null);
    assertFalse(poznoteForgetRestoredSchemaVersion($con));
    assertSame(false, storedSchemaVersion($con));
});

test('a dump restored at the current version comes back without index, and without a version', function () {
    $sql = "CREATE TABLE \"folders\" (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, parent_id INTEGER DEFAULT NULL);\n"
        . "INSERT INTO \"folders\" (\"id\", \"name\", \"parent_id\") VALUES (1, 'Work', NULL);\n"
        . "CREATE TABLE \"settings\" (key TEXT PRIMARY KEY, value TEXT);\n"
        . "INSERT INTO \"settings\" (\"key\", \"value\") VALUES ('schema_version', '" . POZNOTE_SCHEMA_VERSION . "');\n";
    $sqlPath = tempnam(sys_get_temp_dir(), 'poznote-test-sql-');
    $dbPath = tempnam(sys_get_temp_dir(), 'poznote-test-db-');
    @unlink($dbPath);
    file_put_contents($sqlPath, $sql);
    try {
        $executed = poznoteExecuteBackupSqlFile($dbPath, $sqlPath);
        assertTrue($executed['success'], (string)($executed['error'] ?? ''));
        $con = new PDO('sqlite:' . $dbPath);
        $con->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        // The premise of the whole fix: nothing in a dump rebuilds an index
        $indexes = (int)$con->query("SELECT COUNT(*) FROM sqlite_master WHERE type = 'index' AND name LIKE 'idx_%'")->fetchColumn();
        assertSame(0, $indexes, 'indexes a restore brings back');
        assertTrue(poznoteForgetRestoredSchemaVersion($con));
        assertSame(false, storedSchemaVersion($con));
        $con = null;
    } finally {
        @unlink($sqlPath);
        @unlink($dbPath);
        @unlink($dbPath . '-wal');
        @unlink($dbPath . '-shm');
    }
});

test('the bootstrap and the restore read the same version', function () {
    $bootstrap = (string)file_get_contents(dirname(__DIR__) . '/src/db_connect.php');
    assertContains('$CURRENT_SCHEMA_VERSION = POZNOTE_SCHEMA_VERSION;', $bootstrap);
    if (preg_match('/\$CURRENT_SCHEMA_VERSION\s*=\s*\d/', $bootstrap)) {
        fail('db_connect.php carries its own version number again, the restore would compare with a stale one');
    }

    $restore = (string)file_get_contents(dirname(__DIR__) . '/src/lib/backup-restore.php');
    assertContains('poznoteForgetRestoredSchemaVersion(', $restore, 'restoreDatabaseFromFile()');
});
