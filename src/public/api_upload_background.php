<?php
require_once __DIR__ . '/../auth.php';
require_once __DIR__ . '/../lib/api-response.php';
requireAuth();

require_once __DIR__ . '/../functions.php';

header('Content-Type: application/json');

$currentUser = getCurrentUser();
$user_id = $currentUser['id'];

// Get workspace from request (GET, POST, or DELETE body)
$workspace = null;
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $workspace = $_GET['workspace'] ?? null;
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $workspace = $_POST['workspace'] ?? null;
} elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $workspace = $_GET['workspace'] ?? null;
    if (!$workspace) {
        parse_str(file_get_contents('php://input'), $delete_params);
        $workspace = $delete_params['workspace'] ?? null;
    }
}

$workspace = trim((string)($workspace ?? ''));
$workspaceSegment = getWorkspaceBackgroundSegment($workspace);
$responseWorkspace = $workspace !== '' ? $workspace : 'default';

// The speed dial (issue #1714) keeps an image of its own next to the workspace's:
// shown in full there, it would not suit the faint background of the notes.
$filePrefix = 'background';
$requestScope = (string)($_GET['scope'] ?? $_POST['scope'] ?? '');
if ($requestScope === 'kanban') {
    // A Kanban board's own image (issue #1771), one per folder. Kept apart
    // from the workspace folders (lib/kanban-background.php) so that moving
    // the folder to another workspace keeps its picture.
    require_once __DIR__ . '/../lib/kanban-background.php';
    require_once __DIR__ . '/../db_connect.php';
    $kanbanFolderId = (int)($_GET['folder_id'] ?? $_POST['folder_id'] ?? 0);
    $folderStmt = $con->prepare('SELECT id FROM folders WHERE id = ?');
    $folderStmt->execute([$kanbanFolderId]);
    if ($kanbanFolderId <= 0 || !$folderStmt->fetchColumn()) {
        apiFail('Folder not found', 404);
        exit;
    }
    // Decoration of the owner's board, like the other display settings
    if ($_SERVER['REQUEST_METHOD'] !== 'GET' && !poznoteKanbanBackgroundEditable()) {
        apiFail('This action is not available in a workspace shared with you', 403);
        exit;
    }
    $workspaceSegment = POZNOTE_KANBAN_BACKGROUND_SEGMENT;
    $filePrefix = poznoteKanbanBackgroundPrefix($kanbanFolderId);
} elseif ($requestScope === 'speed_dial') {
    require_once __DIR__ . '/../lib/speed-dial.php';
    $speedDialBoard = (string)($_GET['board'] ?? $_POST['board'] ?? POZNOTE_SPEED_DIAL_TAG);
    $speedDialKey = poznoteSpeedDialIsBoardTag($speedDialBoard) ? poznoteSpeedDialBackgroundKey($speedDialBoard) : '';
    $filePrefix = $speedDialKey !== '' ? 'speed-dial-' . $speedDialKey : 'speed-dial';
}

// Create user backgrounds directory with workspace subdirectory if it doesn't exist
$user_dir = __DIR__ . '/../data/users/' . $user_id;
$backgrounds_dir = $user_dir . '/backgrounds';
$workspace_backgrounds_dir = $backgrounds_dir . '/' . $workspaceSegment;

if (!createDirectoryWithPermissions($user_dir)) {
    apiFail('Failed to prepare background storage', 500);
    exit;
}

if (!createDirectoryWithPermissions($backgrounds_dir)) {
    apiFail('Failed to prepare background storage', 500);
    exit;
}

if (!createDirectoryWithPermissions($workspace_backgrounds_dir)) {
    apiFail('Failed to prepare background storage', 500);
    exit;
}

// Handle upload
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_FILES['background'])) {
    $file = $_FILES['background'];
    
    // Validate file
    $allowedTypes = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/gif' => 'gif',
        'image/webp' => 'webp',
    ];
    $max_size = 5 * 1024 * 1024; // 5MB
    
    if ($file['size'] > $max_size) {
        apiFail('File too large. Maximum size is 5MB.', 413);
        exit;
    }
    
    if ($file['error'] !== UPLOAD_ERR_OK) {
        apiFail('Upload failed with error code: ' . $file['error'], 400);
        exit;
    }

    if (!is_uploaded_file($file['tmp_name'])) {
        apiFail('Invalid uploaded file.', 400);
        exit;
    }

    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mimeType = $finfo ? finfo_file($finfo, $file['tmp_name']) : false;

    if (!is_string($mimeType) || !isset($allowedTypes[$mimeType])) {
        apiFail('Invalid file type. Only JPG, PNG, GIF, and WebP are allowed.', 400);
        exit;
    }
    
    // Delete old background if exists
    $old_files = glob($workspace_backgrounds_dir . '/' . $filePrefix . '.*');
    foreach ($old_files as $old_file) {
        @unlink($old_file);
    }
    
    // Save new background
    $filename = $filePrefix . '.' . $allowedTypes[$mimeType];
    $destination = $workspace_backgrounds_dir . '/' . $filename;
    
    if (move_uploaded_file($file['tmp_name'], $destination)) {
        $url = '/data/users/' . $user_id . '/backgrounds/' . rawurlencode($workspaceSegment) . '/' . $filename . '?v=' . time();
        echo json_encode(['success' => true, 'url' => $url, 'workspace' => $responseWorkspace]);
    } else {
        apiFail('Failed to save file', 500);
    }
    exit;
}

// Handle delete
if ($_SERVER['REQUEST_METHOD'] === 'DELETE' || (isset($_POST['_method']) && $_POST['_method'] === 'DELETE')) {
    $files = glob($workspace_backgrounds_dir . '/' . $filePrefix . '.*');
    foreach ($files as $file) {
        @unlink($file);
    }
    echo json_encode(['success' => true, 'workspace' => $responseWorkspace]);
    exit;
}

// Handle GET - check if background exists
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $files = glob($workspace_backgrounds_dir . '/' . $filePrefix . '.*');
    if (!empty($files)) {
        $file = basename($files[0]);
        $url = '/data/users/' . $user_id . '/backgrounds/' . rawurlencode($workspaceSegment) . '/' . $file . '?v=' . filemtime($files[0]);
        echo json_encode(['success' => true, 'url' => $url, 'exists' => true, 'workspace' => $responseWorkspace]);
    } else {
        echo json_encode(['success' => true, 'exists' => false, 'workspace' => $responseWorkspace]);
    }
    exit;
}

apiFail('Invalid request method', 400);
