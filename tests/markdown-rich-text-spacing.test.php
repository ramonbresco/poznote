<?php
require_once dirname(__DIR__) . '/src/markdown_parser.php';
require_once dirname(__DIR__) . '/src/html_to_markdown.php';

// Converting a Markdown note to rich text (parseMarkdownForRichText) has to
// write the blank lines the two formats express differently: in Markdown a
// blank line separates two blocks and the rendering shows it as the air under
// a paragraph, while a rich-text note gives a paragraph no margin at all and
// writes an empty paragraph for a blank line.

test('a paragraph break becomes an empty line in rich text', function () {
    $html = parseMarkdownForRichText("Avant\n\nmilieu\n\nApres\n");
    assertSame(2, substr_count($html, 'class="blank-line"'), 'one per break');
    assertSame("Avant\n\nmilieu\n\nApres", trim(poznoteHtmlToMarkdown($html)), 'and folds back');
});

test('a block that has margins of its own is left alone', function () {
    $html = parseMarkdownForRichText("# Titre\n\nUn paragraphe\n\n- un\n- deux\n\nFin\n");
    assertNotContains('class="blank-line"', $html);
});

test('a toggle counts with the paragraphs and keeps its closing tag', function () {
    $source = "Avant\n\n<details class=\"toggle-block\">\n<summary class=\"toggle-header\">T</summary>\n\ncorps un\n\ncorps deux\n\n</details>\n\nApres\n";
    $html = parseMarkdownForRichText($source);
    assertSame(3, substr_count($html, 'class="blank-line"'), 'before, inside and after');
    assertContains('</details>', $html, 'the closing tag is not rewritten as a paragraph');
    assertSame(1, substr_count($html, '<details'), 'one toggle in, one toggle out');
});

test('the blank lines inside a code block are its text', function () {
    $html = parseMarkdownForRichText("Avant\n\n```\ncode\n\navec une ligne vide\n```\n\nApres\n");
    assertContains("code\n\navec une ligne vide", $html);
    assertSame(2, substr_count($html, 'class="blank-line"'), 'one on each side of the block');
});

test('an empty line already there is not doubled', function () {
    $html = parseMarkdownForRichText("Avant\n\n\nApres\n");
    assertSame(1, substr_count($html, 'class="blank-line"'));
});

test('a separator keeps the blank line the Markdown left around it', function () {
    $html = parseMarkdownForRichText("Avant\n\n---\n\nApres\n");
    assertSame(2, substr_count($html, 'class="blank-line"'), 'one on each side of the rule');
    assertSame(1, substr_count($html, '<hr>'), 'one rule in, one rule out');
    assertSame("Avant\n\n---\n\nApres", trim(poznoteHtmlToMarkdown($html)), 'and folds back');
});

test('a separator next to a block that has margins of its own is left alone', function () {
    $html = parseMarkdownForRichText("# Titre\n\n---\n\nApres\n");
    assertSame(1, substr_count($html, 'class="blank-line"'), 'only under the rule');
});

test('a separator at the edge of a note gets no empty line of its own', function () {
    assertNotContains('class="blank-line"', parseMarkdownForRichText("---\n"));
});
