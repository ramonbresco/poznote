<?php
/**
 * Backlinks Controller
 *
 * Returns all notes that reference a given note (backlinks).
 *
 * Detection supports three formats written by the editor:
 *   1. HTML internal link attribute  — data-note-id="{id}"
 *   2. URL-based link                — ?note={id} or &note={id}
 *   3. Wiki-link syntax              — [[Note Title]]
 *
 * A [[Note Title]] only resolves inside its own workspace, so it counts only
 * for notes of the target's workspace; id-based links count from any
 * workspace.
 *
 * With context=1 each backlink also carries the text around every link it
 * writes (discussion #1761, lib/backlink-context.php); with context=check it
 * only carries whether there is any, which is what the row needs to know
 * before it offers a chevron to unfold. Without either the response is byte
 * for byte what it has always been, so get_backlinks and every other caller
 * are untouched.
 */
require_once __DIR__ . '/../../../note_loader.php';
require_once __DIR__ . '/../../../lib/backlink-context.php';

class BacklinksController
{
    private PDO $con;

    public function __construct(PDO $con)
    {
        $this->con = $con;
    }


    // -------------------------------------------------------------------------
    // Public actions
    // -------------------------------------------------------------------------

    /**
     * GET /api/v1/notes/{id}/backlinks
     *
     * Returns every non-trash note that links to the note with the given ID.
     */
    public function index(string $noteId): void
    {
        if (!ctype_digit($noteId)) {
            $this->sendError(400, 'Invalid note ID');
            return;
        }
        $noteId = (int) $noteId;

        try {
            $workspace = '';
            // all_workspaces=1: the workspace parameter still scopes the
            // target note, but linking notes are collected from every
            // workspace. Not for a session confined to a shared workspace.
            if (isset($_GET['workspace']) && is_string($_GET['workspace'])) {
                $workspace = trim($_GET['workspace']);
            }
            $allWorkspaces = ($_GET['all_workspaces'] ?? '') === '1'
                && !(function_exists('isSharedWorkspaceScopeActive') && isSharedWorkspaceScopeActive());
            // context=1 quotes the text around every link; context=check
            // only says whether there is any, which is what the row needs to
            // know before it offers to unfold (discussion #1761).
            $contextMode = (string) ($_GET['context'] ?? '');
            $withContext = ($contextMode === '1');
            $checkContext = ($contextMode === 'check');

            $targetSql = 'SELECT id, heading, workspace, folder_id FROM entries WHERE id = ? AND trash = 0';
            $targetParams = [$noteId];
            if ($workspace !== '') {
                $targetSql .= ' AND workspace = ?';
                $targetParams[] = $workspace;
            }

            // --- Fetch the target note (we need its heading for wiki-link matching)
            $stmt = $this->con->prepare($targetSql);
            $stmt->execute($targetParams);
            $targetNote = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$targetNote) {
                $this->sendError(404, 'Note not found');
                return;
            }

            $targetHeading = (string) ($targetNote['heading'] ?? '');
            $targetWorkspace = (string) ($targetNote['workspace'] ?? '');
            $diaryLinks = $this->diaryLinkResolver($noteId, $targetHeading, $targetWorkspace, $targetNote['folder_id'] ?? null);

            $candidateSql = "SELECT id, heading, type, workspace
                   FROM entries
                  WHERE trash = 0
                    AND id != ?
                    AND type IN ('note', 'markdown', 'tasklist')";
            $candidateParams = [$noteId];
            if ($workspace !== '' && !$allWorkspaces) {
                $candidateSql .= ' AND workspace = ?';
                $candidateParams[] = $workspace;
            }

            // --- Fetch all non-trash candidate notes (exclude the target itself)
            $stmt = $this->con->prepare($candidateSql);
            $stmt->execute($candidateParams);
            $candidates = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $entriesPath = getEntriesPath();
            $backlinks   = [];

            foreach ($candidates as $note) {
                $ext      = ($note['type'] === 'markdown') ? '.md' : '.html';
                $filePath = $entriesPath . '/' . $note['id'] . $ext;

                if (!is_file($filePath)) {
                    continue;
                }
                $content = @file_get_contents($filePath);
                if ($content === false || $content === '') {
                    continue;
                }

                // 0. A link to the diary day this note is the entry of
                //    (diary.php?date=…, discussion #1776) is read as a link
                //    to the note itself, for detection and snippets alike.
                if ($diaryLinks !== null) {
                    $content = poznoteRewriteDiaryLinksToNote(
                        $content,
                        $diaryLinks['date'],
                        $noteId,
                        (string) $note['workspace'],
                        $diaryLinks['resolves']
                    );
                }

                $found = false;

                // 1. HTML internal-link attribute: data-note-id="123"
                if (strpos($content, 'data-note-id="' . $noteId . '"') !== false) {
                    $found = true;
                }

                // 2. URL-based link: ?note=123 or &note=123
                //    The (?:[^0-9]|$) guard prevents matching note=1234 when looking for note=123.
                if (!$found && preg_match('/[?&]note=' . $noteId . '(?:[^0-9]|$)/', $content)) {
                    $found = true;
                }

                // 3. Wiki-link syntax: [[Note Title]]
                if (!$found && $targetHeading !== '' &&
                    (string) $note['workspace'] === $targetWorkspace &&
                    strpos($content, '[[' . $targetHeading . ']]') !== false
                ) {
                    $found = true;
                }

                if ($found) {
                    $entry = [
                        'id'      => (int) $note['id'],
                        'heading' => $note['heading'] !== '' ? $note['heading'] : 'Untitled',
                        'workspace' => (string) $note['workspace'],
                    ];
                    if ($withContext || $checkContext) {
                        // The wiki form only counts inside the target's own
                        // workspace, the same condition as detection 3 above:
                        // without it a [[Title]] of another workspace would
                        // come back as a snippet for a link nobody counted.
                        $mentions = poznoteExtractBacklinkMentions(
                            $content,
                            (string) $note['type'],
                            $noteId,
                            $targetHeading,
                            (string) $note['workspace'] === $targetWorkspace,
                            // One match is all "is there anything to show"
                            // needs, and it is what the probe stops at
                            $checkContext ? 1 : null
                        );
                        if ($checkContext) {
                            $entry['has_mentions'] = ($mentions !== []);
                        } else {
                            $entry['mentions'] = $mentions;
                        }
                    }
                    $backlinks[] = $entry;
                }
            }

            // Sort alphabetically for a consistent display order
            usort($backlinks, static function (array $a, array $b): int {
                return strcasecmp($a['heading'], $b['heading']);
            });

            $this->sendSuccess([
                'backlinks' => $backlinks,
                'count'     => count($backlinks),
            ]);

        } catch (Exception $e) {
            $this->sendError(500, 'Failed to retrieve backlinks');
        }
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /**
     * When the target is a diary entry, the day it is the entry of and the
     * test that tells whether a diary.php?date= link lands on it; null for
     * any other note, which costs the candidates loop nothing.
     *
     * A link lands on the target when diary.php would open it: the entry of
     * that date in the diary the link names (the first diary when it names
     * none), in the target's workspace. Two entries titled with the same day
     * in one diary resolve to the oldest, as diary.php does.
     *
     * @return array{date: string, resolves: callable(string, int): bool}|null
     */
    private function diaryLinkResolver(int $noteId, string $heading, string $workspace, $folderId): ?array
    {
        if ($folderId === null || $folderId === '' || $workspace === ''
            || !function_exists('parseDiaryEntryTitle')) {
            return null;
        }
        $date = parseDiaryEntryTitle($heading);
        if ($date === null) {
            return null;
        }
        $roots = getDiaryRoots($this->con, $workspace);
        if ($roots === [] || findDiaryRootForFolder($this->con, $workspace, (int) $folderId) === null) {
            return null;
        }
        $rootIds = array_column($roots, 'id');
        $con = $this->con;
        $memo = [];
        $resolves = static function (string $linkWorkspace, int $diary) use ($con, $workspace, $date, $noteId, $rootIds, &$memo): bool {
            if ($linkWorkspace !== $workspace) {
                return false;
            }
            $rootId = in_array($diary, $rootIds, true) ? $diary : $rootIds[0];
            if (!array_key_exists($rootId, $memo)) {
                $memo[$rootId] = findDiaryEntryIdForDate($con, $workspace, $date, $rootId) === $noteId;
            }
            return $memo[$rootId];
        };
        return ['date' => $date, 'resolves' => $resolves];
    }

    private function sendSuccess(array $data): void
    {
        apiSuccess($data);
    }

    private function sendError(int $code, string $message): void
    {
        // Delegates to lib/api-response.php. Note that FoldersController and
        // TrashController declare the arguments the other way round; the
        // signatures are typed, so a call in the wrong order fails loudly.
        apiFail($message, $code);
    }
}
