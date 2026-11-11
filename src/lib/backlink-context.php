<?php
/**
 * Context snippets for backlinks (discussion #1761).
 *
 * BacklinksController tells which notes link to a note; these functions tell
 * *where*, by pulling the text around each link out of the linking note. One
 * mention per link written, so a note citing three times gives three
 * snippets, the shape Obsidian's "linked mentions" and SilverBullet's
 * "linked mentions" both use.
 *
 * Detection mirrors the controller's three formats exactly, or a note would
 * be listed with no snippet to show:
 *   1. HTML internal-link attribute  — data-note-id="{id}"
 *   2. URL-based link                — ?note={id} or &note={id}
 *   3. Wiki-link syntax              — [[Note Title]]
 *
 * Everything here is pure: no database, no filesystem, no session. The
 * snippets are plain text, never markup — they are rendered into the page as
 * text nodes, and a note's HTML has no business being re-parsed by the
 * browser outside the note itself.
 */

/** Mentions kept per linking note: a note citing more is a list, not context. */
const POZNOTE_BACKLINK_MENTIONS_PER_NOTE = 10;

/** Characters kept for the full snippet ("show more"). */
const POZNOTE_BACKLINK_SNIPPET_MAX = 400;

/** Characters kept for the one-line snippet the mentions block shows. */
const POZNOTE_BACKLINK_PREVIEW_MAX = 160;

/** Characters of run-up before the link in that one line. */
const POZNOTE_BACKLINK_PREVIEW_LEAD = 40;

/** Block-level tags a snippet can be cut at, nearest ancestor winning. */
const POZNOTE_BACKLINK_BLOCK_TAGS = [
    'p' => true, 'li' => true, 'td' => true, 'th' => true, 'caption' => true,
    'h1' => true, 'h2' => true, 'h3' => true, 'h4' => true, 'h5' => true, 'h6' => true,
    'blockquote' => true, 'pre' => true, 'summary' => true, 'figcaption' => true,
    'dd' => true, 'dt' => true, 'div' => true, 'section' => true, 'article' => true,
    'body' => true,
];

/**
 * Every mention of $targetId (and, when $wikiLinks, of [[$targetHeading]])
 * found in one linking note.
 *
 * @param string $content   Stored content of the linking note.
 * @param string $noteType  'note', 'markdown' or 'tasklist'.
 * @param int    $targetId  Note the mentions point to.
 * @param string $targetHeading Its title, for the wiki-link form.
 * @param bool   $wikiLinks Whether [[Title]] counts here: it only resolves
 *                          inside its own workspace, like the controller.
 * @param int|null $limit   How many mentions to stop at. 1 answers "is there
 *                          anything to show at all" for the price of the
 *                          first match instead of all of them.
 * @return array<int, array{text: string, preview: string, label: string}>
 */
function poznoteExtractBacklinkMentions(
    string $content,
    string $noteType,
    int $targetId,
    string $targetHeading,
    bool $wikiLinks = true,
    ?int $limit = null
): array {
    if ($content === '' || $targetId <= 0) {
        return [];
    }

    $limit = ($limit === null || $limit > POZNOTE_BACKLINK_MENTIONS_PER_NOTE)
        ? POZNOTE_BACKLINK_MENTIONS_PER_NOTE
        : max(1, $limit);

    $heading = $wikiLinks ? trim($targetHeading) : '';

    if ($noteType === 'tasklist') {
        $mentions = poznoteBacklinkTasklistMentions($content, $targetId, $heading, $limit);
        // A list written before the JSON format is markup: fall through to the
        // HTML reader rather than show the note with no context at all.
        if ($mentions !== [] || poznoteBacklinkLooksLikeJson($content)) {
            return $mentions;
        }
        $noteType = 'note';
    }

    if ($noteType === 'markdown') {
        return poznoteBacklinkMarkdownMentions($content, $targetId, $heading, $limit);
    }

    return poznoteBacklinkHtmlMentions($content, $targetId, $heading, $limit);
}

/**
 * Builds one mention from the text around a link.
 *
 * $block is the whole paragraph, list item or line; $label the text of the
 * link itself, which the client locates in the snippet to highlight it. Both
 * come back with their whitespace collapsed, so the label stays findable.
 *
 * @return array{text: string, preview: string, label: string}|null
 */
function poznoteBacklinkMention(string $block, string $label): ?array
{
    $block = poznoteBacklinkCollapseSpace($block);
    if ($block === '') {
        return null;
    }
    $label = poznoteBacklinkCollapseSpace($label);
    // A label the snippet does not contain is no use to the client, which
    // locates it by text to highlight it: a URL swallowed by the syntax
    // reduction, a link whose text is an image. Better none than a wrong one.
    if ($label !== '' && mb_strpos($block, $label, 0, 'UTF-8') === false) {
        $label = '';
    }

    // Nothing around the link but the link itself: a note whose whole
    // paragraph is "Alpha", a list of bare links. Quoting that back says no
    // more than the row of titles already does, so it is not a mention at
    // all, and a note with only these ones drops out of the list entirely.
    if ($label !== '' && !poznoteBacklinkHasWordsBesides($block, $label)) {
        return null;
    }

    $text = poznoteBacklinkWindow($block, $label, POZNOTE_BACKLINK_SNIPPET_MAX);
    // The preview is shown on one line, cut by the browser at whatever width
    // the note has: the match is placed near its start rather than at its
    // centre, so a narrow note still shows it before the ellipsis.
    $preview = poznoteBacklinkWindow($text, $label, POZNOTE_BACKLINK_PREVIEW_MAX, POZNOTE_BACKLINK_PREVIEW_LEAD);

    return [
        'text' => $text,
        // Identical strings mean the block already fits: the client then has
        // no "show more" to offer.
        'preview' => $preview,
        'label' => $label,
    ];
}

/**
 * $text cut to $max characters around the first occurrence of $label, with an
 * ellipsis on each side that was cut. The match has to survive the cut: a
 * snippet whose link is not in it tells the reader nothing.
 *
 * $lead is how many characters come before the match; null centres it.
 */
function poznoteBacklinkWindow(string $text, string $label, int $max, ?int $lead = null): string
{
    if (poznoteBacklinkLength($text) <= $max) {
        return $text;
    }

    $at = ($label !== '') ? mb_strpos($text, $label, 0, 'UTF-8') : 0;
    if ($at === false) {
        $at = 0;
    }
    $labelLength = poznoteBacklinkLength($label);

    // Place the window on the match, then pull it back inside the text so a
    // match near either end still gets a full window of context.
    $start = $at - ($lead ?? (int) floor(($max - $labelLength) / 2));
    $start = max(0, min($start, poznoteBacklinkLength($text) - $max));

    $slice = mb_substr($text, $start, $max, 'UTF-8');
    // Do not cut a word in half at either end when a space is close by.
    if ($start > 0) {
        $slice = poznoteBacklinkTrimToWord($slice, true);
        $slice = '…' . $slice;
    }
    if ($start + $max < poznoteBacklinkLength($text)) {
        $slice = poznoteBacklinkTrimToWord($slice, false);
        $slice .= '…';
    }

    return $slice;
}

/** Drops a half word at the start or the end of a window, within 15 chars. */
function poznoteBacklinkTrimToWord(string $slice, bool $atStart): string
{
    $limit = 15;
    if ($atStart) {
        $space = mb_strpos($slice, ' ', 0, 'UTF-8');
        if ($space !== false && $space <= $limit) {
            return ltrim(mb_substr($slice, $space + 1, null, 'UTF-8'));
        }
        return $slice;
    }

    $space = mb_strrpos($slice, ' ', 0, 'UTF-8');
    if ($space !== false && (poznoteBacklinkLength($slice) - $space) <= $limit) {
        return rtrim(mb_substr($slice, 0, $space, 'UTF-8'));
    }
    return $slice;
}

/**
 * Whether $block holds a letter or a digit outside its first $label.
 *
 * Punctuation and symbols do not count: "Alpha", "Alpha." and "- Alpha ->"
 * all say the same nothing.
 */
function poznoteBacklinkHasWordsBesides(string $block, string $label): bool
{
    $at = mb_strpos($block, $label, 0, 'UTF-8');
    if ($at === false) {
        return true;
    }
    $rest = mb_substr($block, 0, $at, 'UTF-8')
        . mb_substr($block, $at + poznoteBacklinkLength($label), null, 'UTF-8');

    return (bool) preg_match('/[\p{L}\p{N}]/u', $rest);
}

function poznoteBacklinkLength(string $text): int
{
    return mb_strlen($text, 'UTF-8');
}

/** Newlines, tabs and runs of spaces become one space; the ends are trimmed. */
function poznoteBacklinkCollapseSpace(string $text): string
{
    $text = str_replace("\xC2\xA0", ' ', $text);
    $text = preg_replace('/\s+/u', ' ', $text);
    return trim((string) $text);
}

function poznoteBacklinkLooksLikeJson(string $content): bool
{
    $trimmed = ltrim($content);
    return $trimmed !== '' && ($trimmed[0] === '[' || $trimmed[0] === '{');
}

// -----------------------------------------------------------------------------
// Markdown notes: a mention is the source line, read as the reader sees it
// -----------------------------------------------------------------------------

/**
 * Mentions in a Markdown note. The snippet is the line carrying the link,
 * with its syntax reduced to what it renders as: a line reading
 * "see [Alpha](index.php?note=12) for the rest" becomes "see Alpha for the
 * rest", which is the point of showing context rather than source.
 *
 * @return array<int, array{text: string, preview: string, label: string}>
 */
function poznoteBacklinkMarkdownMentions(string $content, int $targetId, string $heading, int $limit): array
{
    $mentions = [];

    foreach (preg_split('/\R/u', $content) ?: [] as $line) {
        if ($line === '' || !poznoteBacklinkLineMayMention($line, $targetId, $heading)) {
            continue;
        }

        $labels = poznoteBacklinkMarkdownLineLabels($line, $targetId, $heading);
        if ($labels === []) {
            continue;
        }

        $text = poznoteBacklinkRenderMarkdownLine($line);
        foreach ($labels as $label) {
            $mention = poznoteBacklinkMention($text, $label);
            if ($mention !== null) {
                $mentions[] = $mention;
                if (count($mentions) >= $limit) {
                    return $mentions;
                }
            }
        }
    }

    return $mentions;
}

/** Cheap pre-filter: does this line hold any of the three forms at all? */
function poznoteBacklinkLineMayMention(string $line, int $targetId, string $heading): bool
{
    if (strpos($line, 'note=' . $targetId) !== false
        || strpos($line, 'data-note-id="' . $targetId . '"') !== false) {
        return true;
    }
    return $heading !== '' && strpos($line, '[[' . $heading . ']]') !== false;
}

/**
 * The label of every link to the target on one Markdown line, in the order
 * they are written. A label is the text the reader sees, which is what the
 * client highlights inside the snippet.
 *
 * @return array<int, string>
 */
function poznoteBacklinkMarkdownLineLabels(string $line, int $targetId, string $heading): array
{
    $matches = [];

    // 1. Inline links, [label](url): the only form carrying a label of its own
    if (preg_match_all('/\[([^\]]*)\]\(([^)\s]+)[^)]*\)/u', $line, $found, PREG_OFFSET_CAPTURE)) {
        foreach ($found[0] as $i => $whole) {
            $url = $found[2][$i][0];
            if (poznoteBacklinkUrlTargets($url, $targetId)) {
                $label = trim($found[1][$i][0]);
                $matches[] = [
                    'start' => $whole[1],
                    'end' => $whole[1] + strlen($whole[0]),
                    'label' => $label !== '' ? $label : $url,
                ];
            }
        }
    }

    // 2. Wiki links. Case-sensitive and whole-title, exactly as the
    //    controller detects them: a looser rule here would show context for a
    //    link the controller never counted.
    if ($heading !== '') {
        $needle = '[[' . $heading . ']]';
        $at = 0;
        while (($at = strpos($line, $needle, $at)) !== false) {
            $matches[] = ['start' => $at, 'end' => $at + strlen($needle), 'label' => $heading];
            $at += strlen($needle);
        }
    }

    // 3. Anything else the controller counts: a bare URL, an HTML anchor
    //    written into the Markdown. Skipped where an inline link already
    //    covers that spot, so one link is never two mentions.
    foreach (poznoteBacklinkRawPositions($line, $targetId) as $at) {
        if (!poznoteBacklinkPositionCovered($matches, $at)) {
            $matches[] = [
                'start' => $at,
                'end' => $at,
                // A bare URL is its own label: the reader sees the address,
                // and highlighting it is the only mark available. One written
                // inside a tag is dropped by poznoteBacklinkMention(), which
                // refuses a label the snippet does not hold.
                'label' => poznoteBacklinkTokenAt($line, $at),
            ];
        }
    }

    usort($matches, static fn(array $a, array $b): int => $a['start'] <=> $b['start']);

    return array_map(static fn(array $m): string => $m['label'], $matches);
}

/** Byte offsets of a raw ?note={id} or data-note-id="{id}" on a line. */
function poznoteBacklinkRawPositions(string $line, int $targetId): array
{
    $positions = [];
    // The (?![0-9]) guard stops note=123 matching when looking for note=12,
    // the same guard the controller uses.
    if (preg_match_all('/[?&]note=' . $targetId . '(?![0-9])/', $line, $m, PREG_OFFSET_CAPTURE)) {
        foreach ($m[0] as $hit) {
            $positions[] = $hit[1];
        }
    }
    if (preg_match_all('/data-note-id="' . $targetId . '"/', $line, $m, PREG_OFFSET_CAPTURE)) {
        foreach ($m[0] as $hit) {
            $positions[] = $hit[1];
        }
    }
    return $positions;
}

/**
 * The run of non-space characters around byte offset $at: the bare URL a
 * ?note={id} was found in, as the reader sees it written.
 */
function poznoteBacklinkTokenAt(string $text, int $at): string
{
    $start = $at;
    while ($start > 0 && !ctype_space($text[$start - 1])) {
        $start--;
    }
    $end = $at;
    $length = strlen($text);
    while ($end < $length && !ctype_space($text[$end])) {
        $end++;
    }
    return trim(substr($text, $start, $end - $start));
}

function poznoteBacklinkPositionCovered(array $matches, int $at): bool
{
    foreach ($matches as $match) {
        if ($at >= $match['start'] && $at < $match['end']) {
            return true;
        }
    }
    return false;
}

/**
 * Whether a link URL points at the note.
 *
 * Deliberately the controller's own loose rule rather than the stricter
 * markdownInternalNoteId(), which wants index.php or a leading "?": the
 * controller lists a note for any ?note={id} it finds, so anything stricter
 * here would list a note and then have no snippet to show for it.
 */
function poznoteBacklinkUrlTargets(string $url, int $targetId): bool
{
    return (bool) preg_match('/[?&]note=' . $targetId . '(?![0-9])/', $url);
}

/**
 * One Markdown line as plain text: the syntax that only decorates is dropped,
 * what it decorates is kept. Not a parser, and not meant to be one — a
 * snippet is a line of prose, not a rendering.
 */
function poznoteBacklinkRenderMarkdownLine(string $line): string
{
    $text = $line;

    // Leading block markers, repeated for a nested "> - [ ] item"
    for ($i = 0; $i < 4; $i++) {
        $stripped = preg_replace(
            '/^\s*(?:#{1,6}\s+|>\s?|[-*+]\s+(?:\[[ xX]\]\s+)?|\d+[.)]\s+)/u',
            '',
            $text
        );
        if ($stripped === null || $stripped === $text) {
            break;
        }
        $text = $stripped;
    }

    // Images before links: ![alt](src) would otherwise leave its "!" behind
    $text = preg_replace('/!\[([^\]]*)\]\([^)]*\)/u', '$1', $text) ?? $text;
    $text = preg_replace('/\[([^\]]*)\]\([^)]*\)/u', '$1', $text) ?? $text;
    // Wiki links: an alias shows instead of the title, [[Title|shown]]
    $text = preg_replace('/\[\[[^\]|]+\|([^\]]+)\]\]/u', '$1', $text) ?? $text;
    $text = preg_replace('/\[\[([^\]]+)\]\]/u', '$1', $text) ?? $text;
    // Emphasis, code and strikethrough markers
    $text = preg_replace('/(\*\*|__|~~|`{1,3})/u', '', $text) ?? $text;
    $text = preg_replace('/(?<![\w\\\\])[*_](?=\S)|(?<=\S)[*_](?![\w])/u', '', $text) ?? $text;
    // An HTML anchor written into the Markdown keeps its text, loses its tags
    $text = strip_tags($text);

    return html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');
}

// -----------------------------------------------------------------------------
// Rich-text notes: a mention is the paragraph, not a line — there are none
// -----------------------------------------------------------------------------

/**
 * Mentions in an HTML note. A stored note is one blob of markup with no lines
 * to speak of, so the snippet is the text of the nearest block around the
 * link — the paragraph, the list item, the table cell — cut at any <br>
 * inside it, which is the line break the writer actually typed.
 *
 * @return array<int, array{text: string, preview: string, label: string}>
 */
function poznoteBacklinkHtmlMentions(string $content, int $targetId, string $heading, int $limit): array
{
    if (!class_exists('DOMDocument')) {
        return [];
    }

    $dom = new DOMDocument();
    $dom->encoding = 'UTF-8';
    $wrapped = '<html><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8">'
        . '</head><body>' . $content . '</body></html>';
    if (!@$dom->loadHTML($wrapped, LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD)) {
        return [];
    }

    $xpath = new DOMXPath($dom);
    $mentions = [];
    $seen = [];

    // Anchors first, then the text forms, each list in document order; a spot
    // already taken by an anchor is not counted twice.
    foreach ($xpath->query('//a') as $anchor) {
        if (!$anchor instanceof DOMElement) {
            continue;
        }
        $id = $anchor->getAttribute('data-note-id');
        $isTarget = ($id !== '' && (int) $id === $targetId)
            || poznoteBacklinkUrlTargets($anchor->getAttribute('href'), $targetId);
        if (!$isTarget) {
            continue;
        }
        $mention = poznoteBacklinkMention(
            poznoteBacklinkHtmlLineText($anchor),
            (string) $anchor->textContent
        );
        if ($mention !== null) {
            $seen[spl_object_id($anchor)] = true;
            $mentions[] = $mention;
            if (count($mentions) >= $limit) {
                return $mentions;
            }
        }
    }

    // A wiki link or a bare URL sitting in the text of the note, which the
    // editor never turns into an anchor.
    foreach ($xpath->query('//text()') as $node) {
        if (count($mentions) >= $limit) {
            break;
        }
        $value = (string) $node->nodeValue;
        if ($value === '') {
            continue;
        }
        $parentAnchor = poznoteBacklinkClosestAnchor($node);
        if ($parentAnchor !== null && isset($seen[spl_object_id($parentAnchor)])) {
            continue;
        }

        $labels = [];
        if ($heading !== '' && strpos($value, '[[' . $heading . ']]') !== false) {
            $labels[] = '[[' . $heading . ']]';
        }
        $raw = poznoteBacklinkRawPositions($value, $targetId);
        if ($raw !== []) {
            $labels[] = poznoteBacklinkTokenAt($value, $raw[0]);
        }
        foreach ($labels as $label) {
            $mention = poznoteBacklinkMention(poznoteBacklinkHtmlLineText($node), $label);
            if ($mention !== null) {
                $mentions[] = $mention;
            }
        }
    }

    return array_slice($mentions, 0, $limit);
}

/** The <a> a node sits in, if any: its text is already a mention of its own. */
function poznoteBacklinkClosestAnchor(DOMNode $node): ?DOMElement
{
    for ($cur = $node->parentNode; $cur !== null; $cur = $cur->parentNode) {
        if ($cur instanceof DOMElement && strtolower($cur->nodeName) === 'a') {
            return $cur;
        }
    }
    return null;
}

/**
 * The text of the line $node sits on: its nearest block ancestor, narrowed to
 * the <br>-delimited run holding it. A note written as bare text and <br>
 * would otherwise give the whole note as one snippet.
 */
function poznoteBacklinkHtmlLineText(DOMNode $node): string
{
    $block = null;
    for ($cur = $node->parentNode; $cur !== null; $cur = $cur->parentNode) {
        if ($cur instanceof DOMElement && isset(POZNOTE_BACKLINK_BLOCK_TAGS[strtolower($cur->nodeName)])) {
            $block = $cur;
            break;
        }
    }
    if ($block === null) {
        return (string) $node->textContent;
    }

    $state = ['segments' => [''], 'found' => null, 'target' => $node];
    poznoteBacklinkWalkSegments($block, $state);

    $index = $state['found'];
    if ($index === null || !isset($state['segments'][$index])) {
        return (string) $block->textContent;
    }

    $segment = poznoteBacklinkCollapseSpace($state['segments'][$index]);
    // A line that is only the link (a list of links, one per line) reads
    // better with its block around it than on its own.
    return $segment !== '' ? $segment : poznoteBacklinkCollapseSpace((string) $block->textContent);
}

/**
 * Accumulates the text of $element into $state['segments'], starting a new
 * segment at every <br>, and records which segment holds $state['target'].
 */
function poznoteBacklinkWalkSegments(DOMNode $element, array &$state): void
{
    foreach ($element->childNodes as $child) {
        if ($child === $state['target'] || poznoteBacklinkContains($child, $state['target'])) {
            $state['found'] = count($state['segments']) - 1;
        }

        if ($child instanceof DOMElement && strtolower($child->nodeName) === 'br') {
            $state['segments'][] = '';
            continue;
        }
        if ($child instanceof DOMText) {
            $state['segments'][count($state['segments']) - 1] .= $child->nodeValue;
            continue;
        }
        if ($child instanceof DOMElement) {
            poznoteBacklinkWalkSegments($child, $state);
        }
    }
}

function poznoteBacklinkContains(DOMNode $haystack, DOMNode $needle): bool
{
    for ($cur = $needle->parentNode; $cur !== null; $cur = $cur->parentNode) {
        if ($cur === $haystack) {
            return true;
        }
    }
    return false;
}

// -----------------------------------------------------------------------------
// Task lists: a mention is the task, which is the line the reader sees
// -----------------------------------------------------------------------------

/**
 * Mentions in a task list. The content is JSON, so there is no line and no
 * markup: the snippet is the text of the task, or of the subtask, carrying
 * the link. Task text is plain text, linkified only when it is displayed
 * (js/tasklist-render.js), so a link to a note is a URL written in it.
 *
 * @return array<int, array{text: string, preview: string, label: string}>
 */
function poznoteBacklinkTasklistMentions(string $content, int $targetId, string $heading, int $limit): array
{
    $tasks = json_decode($content, true);
    if (is_array($tasks) && isset($tasks['tasks']) && is_array($tasks['tasks'])) {
        $tasks = $tasks['tasks'];
    }
    if (!is_array($tasks)) {
        return [];
    }

    $mentions = [];
    foreach ($tasks as $task) {
        if (!is_array($task)) {
            continue;
        }
        foreach (poznoteBacklinkTaskTexts($task) as $text) {
            if (!poznoteBacklinkLineMayMention($text, $targetId, $heading)) {
                continue;
            }
            // A task's text is plain text, linkified only when displayed
            // (js/tasklist-render.js), so a link to a note is a bare URL
            $raw = poznoteBacklinkRawPositions($text, $targetId);
            $label = ($heading !== '' && strpos($text, '[[' . $heading . ']]') !== false)
                ? '[[' . $heading . ']]'
                : ($raw !== [] ? poznoteBacklinkTokenAt($text, $raw[0]) : '');
            $mention = poznoteBacklinkMention($text, $label);
            if ($mention !== null) {
                $mentions[] = $mention;
                if (count($mentions) >= $limit) {
                    return $mentions;
                }
            }
        }
    }

    return $mentions;
}

/** The text of a task and of each of its subtasks, in display order. */
function poznoteBacklinkTaskTexts(array $task): array
{
    $texts = [];
    $own = $task['text'] ?? ($task['content'] ?? '');
    if (is_string($own) && $own !== '') {
        $texts[] = $own;
    }
    if (isset($task['subtasks']) && is_array($task['subtasks'])) {
        foreach ($task['subtasks'] as $subtask) {
            if (!is_array($subtask)) {
                continue;
            }
            $text = $subtask['text'] ?? ($subtask['content'] ?? '');
            if (is_string($text) && $text !== '') {
                $texts[] = $text;
            }
        }
    }
    return $texts;
}
