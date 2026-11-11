<?php
lib('backlink-context');

// Discussion #1761: the backlinks row says which notes cite this one, never
// why. poznoteExtractBacklinkMentions() pulls the text around each link out
// of the linking note, one mention per link written.

/** The snippets of a note, as the mentions block shows them collapsed. */
function backlinkPreviews(string $content, string $type, int $id = 12, string $heading = 'Alpha', bool $wiki = true): array
{
    return array_map(
        static fn(array $m): string => $m['preview'],
        poznoteExtractBacklinkMentions($content, $type, $id, $heading, $wiki)
    );
}

// --- Markdown -----------------------------------------------------------------

test('a markdown line gives its prose, not its syntax', function () {
    $md = "intro\n\nsee [Alpha](index.php?note=12) for the rest\n";
    assertSame(['see Alpha for the rest'], backlinkPreviews($md, 'markdown'));
});

test('the label of the link is reported for highlighting', function () {
    $mentions = poznoteExtractBacklinkMentions(
        'see [the plan](index.php?note=12) now', 'markdown', 12, 'Alpha'
    );
    assertSame('the plan', $mentions[0]['label']);
    assertSame('see the plan now', $mentions[0]['text']);
});

test('a wiki link counts, and keeps its brackets off the snippet', function () {
    assertSame(['talk to Alpha about it'], backlinkPreviews('talk to [[Alpha]] about it', 'markdown'));
});

test('a wiki link of another workspace gives nothing', function () {
    assertSame([], backlinkPreviews('talk to [[Alpha]] about it', 'markdown', 12, 'Alpha', false));
});

test('the wiki form is whole-title and case-sensitive, like the controller', function () {
    assertSame([], backlinkPreviews('see [[Alphabet]]', 'markdown'));
    assertSame([], backlinkPreviews('see [[alpha]]', 'markdown'));
});

test('two links on one line are two mentions', function () {
    $md = 'both [Alpha](?note=12) and [[Alpha]] here';
    assertSame(
        ['both Alpha and Alpha here', 'both Alpha and Alpha here'],
        backlinkPreviews($md, 'markdown')
    );
});

test('one link is never counted twice by two rules', function () {
    // The inline-link rule and the bare ?note= rule both see this spot
    assertSame(1, count(backlinkPreviews('see [Alpha](index.php?note=12)', 'markdown')));
});

test('note=12 does not match note=123', function () {
    assertSame([], backlinkPreviews('see [Other](index.php?note=123)', 'markdown'));
});

test('a heading, a bullet and a quote lose their markers', function () {
    assertSame(['Alpha matters'], backlinkPreviews('## [[Alpha]] matters', 'markdown'));
    assertSame(['Alpha matters'], backlinkPreviews('- [ ] [[Alpha]] matters', 'markdown'));
    assertSame(['Alpha matters'], backlinkPreviews('> - [[Alpha]] matters', 'markdown'));
});

test('emphasis and code markers are dropped around the link', function () {
    assertSame(['really Alpha now'], backlinkPreviews('**really** [[Alpha]] `now`', 'markdown'));
});

test('an image on the line keeps its alt text, not its bang', function () {
    assertSame(['shot Alpha'], backlinkPreviews('![shot](photo.png) [[Alpha]]', 'markdown'));
});

test('a long paragraph is cut around the link, never losing it', function () {
    $filler = str_repeat('word ', 200);
    $mention = poznoteExtractBacklinkMentions(
        $filler . '[[Alpha]] ' . $filler, 'markdown', 12, 'Alpha'
    )[0];
    assertContains('Alpha', $mention['preview'], 'the link survives the cut');
    assertContains('Alpha', $mention['text'], 'the link survives the full snippet too');
    assertTrue(mb_strlen($mention['preview']) <= POZNOTE_BACKLINK_PREVIEW_MAX + 2, 'preview is bounded');
    assertTrue(mb_strlen($mention['text']) <= POZNOTE_BACKLINK_SNIPPET_MAX + 2, 'snippet is bounded');
    assertContains('…', $mention['preview'], 'the cut is marked');
});

test('the one-line preview keeps a short run-up before the link', function () {
    // It is cut by the browser at the note's width, so the link has to be
    // near its start: centred, a narrow note would cut it off
    $filler = str_repeat('word ', 200);
    $mention = poznoteExtractBacklinkMentions(
        $filler . '[[Alpha]] ' . $filler, 'markdown', 12, 'Alpha'
    )[0];
    $at = mb_strpos($mention['preview'], 'Alpha');
    assertTrue($at !== false && $at <= POZNOTE_BACKLINK_PREVIEW_LEAD + 2, 'the link opens the line');
});

test('a short line offers nothing more to show', function () {
    $mention = poznoteExtractBacklinkMentions('see [[Alpha]]', 'markdown', 12, 'Alpha')[0];
    assertSame($mention['text'], $mention['preview'], 'preview and full text are the same');
});

test('a limit of 1 answers "is there anything to quote" and stops there', function () {
    // What context=check asks for: the row has to know before it draws the
    // chevron, and one match is the whole answer
    $md = "see [[Alpha]] here\nand [[Alpha]] again\n";
    assertSame(1, count(poznoteExtractBacklinkMentions($md, 'markdown', 12, 'Alpha', true, 1)));
    assertSame(2, count(poznoteExtractBacklinkMentions($md, 'markdown', 12, 'Alpha', true, null)));

    $html = '<p>a <a data-note-id="12" href="?note=12">Alpha</a></p>'
        . '<p>b <a data-note-id="12" href="?note=12">Alpha</a></p>';
    assertSame(1, count(poznoteExtractBacklinkMentions($html, 'note', 12, 'Alpha', true, 1)));

    $json = json_encode([['id' => 1, 'text' => 'see [[Alpha]]'], ['id' => 2, 'text' => 'and [[Alpha]]']]);
    assertSame(1, count(poznoteExtractBacklinkMentions($json, 'tasklist', 12, 'Alpha', true, 1)));
});

test('a passage that is only the link itself is not a mention', function () {
    // It would quote back the title the row already shows, which is the whole
    // reason the grouped-by-note layout was dropped
    assertSame([], backlinkPreviews('<p><a data-note-id="12" href="?note=12">Alpha</a></p>', 'note'));
    assertSame([], backlinkPreviews('[Alpha](index.php?note=12)', 'markdown'));
    assertSame([], backlinkPreviews('[[Alpha]]', 'markdown'));
    // Punctuation around it is still nothing
    assertSame([], backlinkPreviews('- [[Alpha]].', 'markdown'));
    assertSame([], backlinkPreviews('<li>→ <a data-note-id="12" href="?note=12">Alpha</a></li>', 'note'));
    // One real word is enough to make it worth quoting
    assertSame(['See Alpha.'], backlinkPreviews('See [[Alpha]].', 'markdown'));
    assertSame(['Alpha 2027'], backlinkPreviews('[[Alpha]] 2027', 'markdown'));
});

test('a link with nothing quotable around it yields no mention at all', function () {
    // The case the chevron is hidden for: the link is an image alone in its
    // paragraph, so the block around it has no text to show
    $html = '<p><a data-note-id="12" href="?note=12"><img src="x.png" alt=""></a></p>';
    assertSame([], poznoteExtractBacklinkMentions($html, 'note', 12, 'Alpha'));
    assertSame([], poznoteExtractBacklinkMentions($html, 'note', 12, 'Alpha', true, 1));
});

test('mentions are capped per note', function () {
    $line = "see [[Alpha]] here\n";
    $found = backlinkPreviews(str_repeat($line, 40), 'markdown');
    assertSame(POZNOTE_BACKLINK_MENTIONS_PER_NOTE, count($found));
});

// --- Rich text ----------------------------------------------------------------

test('an html note gives the paragraph holding the link', function () {
    $html = '<p>first one</p><p>see <a href="index.php?note=12" data-note-id="12">Alpha</a> for the rest</p>';
    assertSame(['see Alpha for the rest'], backlinkPreviews($html, 'note'));
});

test('the nearest block wins, so a list item is one mention', function () {
    $html = '<ul><li>one</li><li>two <a data-note-id="12" href="?note=12">Alpha</a></li></ul>';
    assertSame(['two Alpha'], backlinkPreviews($html, 'note'));
});

test('a table cell is a mention of its own', function () {
    $html = '<table><tr><td>left</td><td>right <a data-note-id="12" href="?note=12">Alpha</a></td></tr></table>';
    assertSame(['right Alpha'], backlinkPreviews($html, 'note'));
});

test('a note written with <br> is cut at the line the writer typed', function () {
    $html = '<div>one line<br>see <a data-note-id="12" href="?note=12">Alpha</a><br>third line</div>';
    assertSame(['see Alpha'], backlinkPreviews($html, 'note'));
});

test('two links in one html note are two mentions', function () {
    $html = '<p>a <a data-note-id="12" href="?note=12">Alpha</a></p>'
        . '<p>b <a data-note-id="12" href="?note=12">Alpha again</a></p>';
    assertSame(['a Alpha', 'b Alpha again'], backlinkPreviews($html, 'note'));
});

test('an anchor is not counted a second time as raw text', function () {
    $html = '<p>see <a data-note-id="12" href="index.php?note=12">Alpha</a></p>';
    assertSame(1, count(backlinkPreviews($html, 'note')));
});

test('a wiki link typed into a rich-text note is shown as typed', function () {
    // Nothing renders [[Alpha]] in an HTML note: the reader sees the brackets
    assertSame(['talk to [[Alpha]] later'], backlinkPreviews('<p>talk to [[Alpha]] later</p>', 'note'));
});

test('an anchor pointing elsewhere gives nothing', function () {
    $html = '<p>see <a data-note-id="99" href="index.php?note=99">Other</a></p>';
    assertSame([], backlinkPreviews($html, 'note'));
});

test('a heading in the note is a block like any other', function () {
    assertSame(['About Alpha'], backlinkPreviews('<h2>About <a data-note-id="12" href="?note=12">Alpha</a></h2>', 'note'));
});

// --- Task lists ---------------------------------------------------------------

test('a task list gives the text of the task carrying the link', function () {
    $json = json_encode([
        ['id' => 1, 'text' => 'buy milk', 'completed' => false],
        ['id' => 2, 'text' => 'read index.php?note=12 first', 'completed' => false],
    ]);
    assertSame(['read index.php?note=12 first'], backlinkPreviews($json, 'tasklist'));
});

test('a subtask is a mention of its own', function () {
    $json = json_encode([[
        'id' => 1,
        'text' => 'plan',
        'completed' => false,
        'subtasks' => [['id' => 11, 'text' => 'see [[Alpha]]', 'completed' => false]],
    ]]);
    assertSame(['see [[Alpha]]'], backlinkPreviews($json, 'tasklist'));
});

test('a task list stored in the old markup is read as html', function () {
    $legacy = '<ul><li>see <a data-note-id="12" href="?note=12">Alpha</a></li></ul>';
    assertSame(['see Alpha'], backlinkPreviews($legacy, 'tasklist'));
});

test('a bare URL is its own label, so it can be highlighted', function () {
    // What a task holds: the text is linkified only when it is displayed
    $json = json_encode([['id' => 1, 'text' => 'read index.php?note=12 first']]);
    $mentions = poznoteExtractBacklinkMentions($json, 'tasklist', 12, 'Alpha');
    assertSame('index.php?note=12', $mentions[0]['label']);

    $md = 'go to index.php?note=12 now';
    assertSame('index.php?note=12', poznoteExtractBacklinkMentions($md, 'markdown', 12, 'Alpha')[0]['label']);
});

test('a task list with no mention gives nothing', function () {
    assertSame([], backlinkPreviews(json_encode([['id' => 1, 'text' => 'buy milk']]), 'tasklist'));
});

// --- Edges --------------------------------------------------------------------

test('empty content and a missing target give nothing', function () {
    assertSame([], poznoteExtractBacklinkMentions('', 'markdown', 12, 'Alpha'));
    assertSame([], poznoteExtractBacklinkMentions('see [[Alpha]]', 'markdown', 0, 'Alpha'));
});

test('a label the snippet does not hold is reported as none', function () {
    // The URL is the only label available, and the syntax reduction eats it
    $mentions = poznoteExtractBacklinkMentions(
        'see [](https://elsewhere.test/?note=12) here', 'markdown', 12, 'Alpha'
    );
    assertSame('', $mentions[0]['label']);
    // The run of spaces the empty label left behind is collapsed
    assertSame('see here', $mentions[0]['text']);
});

test('html entities come back as characters', function () {
    assertSame(['café Alpha'], backlinkPreviews('café [[Alpha]]', 'markdown'));
    assertSame(['café Alpha'], backlinkPreviews('caf&eacute; [[Alpha]]', 'markdown'));
});

test('an accented snippet is cut on characters, not bytes', function () {
    $filler = str_repeat('é', 500);
    $mention = poznoteExtractBacklinkMentions($filler . ' [[Alpha]]', 'markdown', 12, 'Alpha')[0];
    assertTrue(mb_strlen($mention['preview']) <= POZNOTE_BACKLINK_PREVIEW_MAX + 2, 'bounded in characters');
    assertContains('Alpha', $mention['preview'], 'the link is still there');
});
