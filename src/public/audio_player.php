<?php
/**
 * The page the editor frames around a note's audio.
 *
 * Chrome does not render <audio> controls inside a contenteditable zone, so a
 * recording in a note is an <iframe> pointing here. The player itself is the
 * one lib/audio-player.php renders everywhere else (a public share, the
 * journal): this page is the frame around it, nothing more.
 *
 * It carries its own <head>, so it also carries the theme. The parent is the
 * same origin, which is how the frame can read the theme the app is in and
 * follow it when the reader switches: a frame has no way of inheriting one.
 */

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../auth.php';
require_once __DIR__ . '/../functions.php';
require_once __DIR__ . '/../lib/attachments.php';
require_once __DIR__ . '/../lib/audio-player.php';

// Verify the user is authenticated (uses the centralized auth system with
// session, remember-me cookies, and OIDC support)
if (!isAuthenticated()) {
    http_response_code(401);
    exit('Unauthorized');
}

$noteId = intval($_GET['note'] ?? 0);
$attachmentId = (string)($_GET['attachment'] ?? '');
$workspace = (string)($_GET['workspace'] ?? '');

if (!$noteId || $attachmentId === '') {
    http_response_code(400);
    exit('Missing parameters');
}

$audioUrl = poznoteBuildAttachmentUrl($noteId, $attachmentId, $workspace);

// What the tags say about this file, read from the note's own attachment
// record. The bytes are served by the API, which does its own authorization;
// the record is read here only to know what to draw, and a session confined
// to a shared workspace is held to that workspace for it, as everywhere else.
$tags = ['title' => '', 'artist' => '', 'has_cover' => false];
$fileSize = 0;

try {
    require_once __DIR__ . '/../db_connect.php';
    $scopeName = function_exists('getSharedWorkspaceScopeName') ? getSharedWorkspaceScopeName() : null;

    if ($scopeName !== null) {
        $stmt = $con->prepare('SELECT attachments FROM entries WHERE id = ? AND workspace = ? LIMIT 1');
        $stmt->execute([$noteId, $scopeName]);
    } else {
        $stmt = $con->prepare('SELECT attachments FROM entries WHERE id = ? LIMIT 1');
        $stmt->execute([$noteId]);
    }
    $note = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($note) {
        foreach (poznoteDecodeAttachments($note['attachments'] ?? '') as $attachment) {
            if (!is_array($attachment) || (string)($attachment['id'] ?? '') !== $attachmentId) {
                continue;
            }
            $fileSize = (int)($attachment['file_size'] ?? 0);
            $tags = poznoteAudioAttachmentTags($attachment);
            break;
        }
    }
} catch (Throwable $e) {
    error_log('audio_player: could not read the attachment record: ' . $e->getMessage());
}

$coverUrl = $tags['has_cover']
    ? $audioUrl . (strpos($audioUrl, '?') !== false ? '&' : '?') . 'audio_cover=1'
    : '';

$player = poznoteRenderAudioPlayer([
    'src' => $audioUrl,
    'cover_url' => $coverUrl,
    'title' => $tags['title'],
    'artist' => $tags['artist'],
    'size' => $fileSize,
]);

$escape = static function ($value): string {
    return htmlspecialchars((string)$value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
};
?>
<!DOCTYPE html>
<html lang="<?php echo $escape(getUserLanguage()); ?>">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<?php poznoteRenderStylesheets('audio_player'); ?>
<style>
  html, body {
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
    overflow: hidden;
    background: transparent;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  }
  /* The frame is the player: it has no page around it to sit in, so it
     fills the frame and leaves the margins to the note. */
  html body .pz-audio {
    max-width: none;
    height: 100%;
    margin: 0;
    border: 0;
    border-radius: var(--pz-radius-lg);
  }
</style>
</head>
<body>
<?php echo $player; ?>
<script src="<?php echo poznoteAsset('js/audio-player.js'); ?>"></script>
<script>
// Two things a framed page cannot do on its own, both of them through the
// parent, which is the same origin.
(function () {
  function parentWindow() {
    try {
      return (window.frameElement && window.parent && window.parent !== window) ? window.parent : null;
    } catch (e) {
      return null;
    }
  }

  // 1. The theme. A frame inherits nothing, so the attributes the app carries
  //    on <html> are copied over and kept in step with it: css/tokens.css
  //    paints every theme from those two, so nothing else has to be known.
  (function () {
    var host = parentWindow();
    var root = document.documentElement;
    var source = null;
    try {
      source = host && host.document ? host.document.documentElement : null;
    } catch (e) {
      source = null;
    }
    if (!source) {
      // Framed by something else, or opened on its own: follow the system.
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        root.setAttribute('data-theme', 'dark');
      }
      return;
    }
    var apply = function () {
      var theme = source.getAttribute('data-theme');
      if (theme) {
        root.setAttribute('data-theme', theme);
      } else {
        root.removeAttribute('data-theme');
      }
      root.className = source.className;
    };
    apply();
    if (typeof MutationObserver === 'function') {
      new MutationObserver(apply).observe(source, { attributes: true, attributeFilter: ['data-theme', 'class'] });
    }
  })();

  // 2. The right-click menu. A click in this frame never reaches the note
  //    around it, so it is handed to the attachment menu there
  //    (js/note-attachment-menu.js), and any other click closes that menu.
  //    Hosts without the menu keep the browser's own.
  function host(name) {
    var parent = parentWindow();
    try {
      return (parent && typeof parent[name] === 'function') ? parent[name] : null;
    } catch (e) {
      return null;
    }
  }
  document.addEventListener('contextmenu', function (event) {
    var open = host('openNoteAttachmentMenuFromFrame');
    if (open && open(window.frameElement, event.clientX, event.clientY)) {
      event.preventDefault();
    }
  });
  document.addEventListener('mousedown', function (event) {
    var close = event.button !== 2 ? host('closeNoteAttachmentMenu') : null;
    if (close) close();
  });
  document.addEventListener('keydown', function (event) {
    var close = event.key === 'Escape' ? host('closeNoteAttachmentMenu') : null;
    if (close) close();
  });
})();
</script>
</body>
</html>
