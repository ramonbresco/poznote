<?php
require_once dirname(__DIR__) . '/src/markdown_parser.php';
require_once dirname(__DIR__) . '/src/html_to_markdown.php';

// A Markdown task list rendered for a rich-text note (parseMarkdownForRichText)
// becomes the checklist the editor itself writes: ".noteentry" carries no rule
// for the "task-list" markup of the Markdown preview, so a converted list came
// out with the bullets of a plain list, no strikethrough on a ticked line and a
// checkbox no script listens to.

test('a task list becomes a checklist', function () {
    $html = parseMarkdownForRichText("- [x] fait\n- [ ] a faire\n");
    assertContains('<ul class="checklist"', $html);
    assertNotContains('task-list', $html);
    assertNotContains('markdown-task-checkbox', $html);
    assertSame(2, substr_count($html, 'class="checklist-checkbox"'));
    assertSame(2, substr_count($html, 'class="checklist-text"'));
});

test('a ticked line carries the state the editor reads', function () {
    $html = parseMarkdownForRichText("- [x] fait\n- [ ] a faire\n");
    assertContains('<li class="checklist-item checklist-item-checked">', $html);
    assertContains('checked="checked" data-checked="1"', $html);
    assertContains('<li class="checklist-item">', $html);
    assertContains('data-checked="0"', $html);
    assertNotContains('data-checked="0" checked', $html, 'an unticked line is never checked');
});

test('the text of a line keeps its inline formatting and its source', function () {
    $html = parseMarkdownForRichText("- [ ] **gras** et `code`\n");
    assertContains('<strong>gras</strong> et <code>code</code>', $html);
    assertContains('data-value="**gras** et `code`"', $html);
});

test('a nested task list is nested in the checklist', function () {
    $html = parseMarkdownForRichText("- [ ] un\n  - [x] deux\n");
    assertSame(2, substr_count($html, '<ul class="checklist"'));
    assertContains('</span><ul class="checklist"', $html, 'the sublist sits inside its item');
});

test('a converted checklist folds back to the same Markdown', function () {
    $markdown = "- [x] fait\n- [ ] a faire";
    assertSame($markdown, trim(poznoteHtmlToMarkdown(parseMarkdownForRichText($markdown . "\n"))));
});

test('a plain bullet list is not a checklist', function () {
    $html = parseMarkdownForRichText("- un\n- deux\n");
    assertNotContains('checklist', $html);
});
