<?php
require_once dirname(__DIR__) . '/src/markdown_parser.php';

// A coloured span holding another coloured span (a colour put around a word
// that already had one). The span rule only matches a span with no span inside
// it, so a single pass drew the inner one and left the outer one as escaped
// text. js/markdown-parser.js follows the same rule.

test('a span inside a span is drawn with both', function () {
    $html = parseMarkdown('Avant <span style="color:red">un <span style="background-color:yellow">deux</span> trois</span> après.');
    assertContains('<span style="color:red">un <span style="background-color:yellow">deux</span> trois</span>', $html);
    assertSame(false, str_contains($html, '&lt;span'), 'no span left as text');
});

test('a coloured highlight around a coloured word in a table cell', function () {
    $md = "| a | b |\n| - | - |\n| x | <span style=\"color:var(--pz-color-yellow, #eab308)\">==<span style=\"color:var(--pz-color-blue, #2563eb)\">sdf</span>==</span> |";
    $html = parseMarkdown($md);
    assertContains('<td><span style="color:var(--pz-color-yellow, #eab308)"><mark><span style="color:var(--pz-color-blue, #2563eb)">sdf</span></mark></span></td>', $html);
    assertSame(false, str_contains($html, '&lt;span'), 'no span left as text');
});

test('spans side by side are unchanged', function () {
    assertContains('<span style="color:red">seul</span> et <span style="color:blue"><strong>gras</strong></span>', parseMarkdown('<span style="color:red">seul</span> et <span style="color:blue">**gras**</span>'));
});
