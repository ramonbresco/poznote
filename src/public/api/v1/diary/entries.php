<?php
/**
 * Diary API - rendered entry bodies for the journal view
 *
 * GET ?ids=1,2,3&workspace=<name> returns {"entries": {"<id>": "<html>"}}: the
 * read-only body of each requested note, rendered and sanitized by
 * renderDiaryJournalContent(). diary.php already ships every entry's metadata
 * and excerpt; the journal view asks for full bodies here in small batches as
 * the reader scrolls, so a long diary does not render all its notes up front.
 *
 * Only live notes inside a diary subtree of the workspace are served. Ids that
 * do not qualify are simply absent from the response.
 */

require_once __DIR__ . '/../../../../auth.php';
requireApiAuth();

require_once __DIR__ . '/../../../../db_connect.php';
require_once __DIR__ . '/../../../../functions.php';
require_once __DIR__ . '/../../../../markdown_parser.php';
require_once __DIR__ . '/../../../../public_helpers.php';
require_once __DIR__ . '/../../../../lib/audio-player.php';

header('Content-Type: application/json');

// One scroll step asks for a handful of notes; the cap only bounds the work a
// single request can trigger.
const DIARY_JOURNAL_MAX_IDS = 50;

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
        exit;
    }

    $ids = [];
    foreach (explode(',', (string)($_GET['ids'] ?? '')) as $raw) {
        $id = (int)trim($raw);
        if ($id > 0) $ids[$id] = $id;
    }
    $ids = array_values($ids);
    if (empty($ids) || count($ids) > DIARY_JOURNAL_MAX_IDS) {
        http_response_code(400);
        echo json_encode(['error' => 'Pass between 1 and ' . DIARY_JOURNAL_MAX_IDS . ' note ids']);
        exit;
    }

    // Same fallback as diary.php, which sends the workspace it resolved.
    $workspace = trim((string)($_GET['workspace'] ?? ''));
    if ($workspace === '') {
        $workspace = getFirstWorkspaceName();
    }

    $entries = [];
    $folderIds = getDiaryFolderIds($con, $workspace);
    if (!empty($folderIds)) {
        $stmt = $con->prepare(
            "SELECT id, type, entry, attachments, linked_note_id FROM entries" .
            " WHERE trash = 0 AND workspace = ?" .
            " AND id IN (" . implode(',', array_fill(0, count($ids), '?')) . ")" .
            " AND folder_id IN (" . implode(',', array_fill(0, count($folderIds), '?')) . ")"
        );
        $stmt->execute(array_merge([$workspace], $ids, $folderIds));
        $targetStmt = $con->prepare("SELECT id, type, entry, attachments FROM entries WHERE id = ? AND trash = 0");

        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $source = $row;
            // A shortcut shows the note it points to, as kanban_content.php does.
            if (($row['type'] ?? '') === 'linked' && !empty($row['linked_note_id'])) {
                $targetStmt->execute([(int)$row['linked_note_id']]);
                $target = $targetStmt->fetch(PDO::FETCH_ASSOC);
                if ($target === false) {
                    $entries[(string)$row['id']] = '';
                    continue;
                }
                $source = $target;
            }

            $type = (string)($source['type'] ?? 'note');
            $file = getEntryFilename((int)$source['id'], $type);
            $content = is_readable($file) ? (string)file_get_contents($file) : (string)($source['entry'] ?? '');
            if ($type === 'tasklist') {
                $content = resolveTasklistStoredContent($content, (string)($source['entry'] ?? ''));
            }

            // What a recording in the entry carries in its tags, read from
            // the note's own attachment records (lib/audio-player.php).
            $attachments = (string)($source['attachments'] ?? '');
            $tagsResolver = function (int $audioNoteId, string $audioAttachmentId) use ($attachments): array {
                foreach (poznoteDecodeAttachments($attachments) as $attachment) {
                    if (is_array($attachment) && (string)($attachment['id'] ?? '') === $audioAttachmentId) {
                        return array_merge(poznoteAudioAttachmentTags($attachment), ['size' => (int)($attachment['file_size'] ?? 0)]);
                    }
                }
                return ['title' => '', 'artist' => '', 'has_cover' => false, 'size' => 0];
            };

            $entries[(string)$row['id']] = renderDiaryJournalContent($content, $type, $tagsResolver);
        }
    }

    echo json_encode(['entries' => (object)$entries], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to load diary entries', 'message' => $e->getMessage()]);
}
