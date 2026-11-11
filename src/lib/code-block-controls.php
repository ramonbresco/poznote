<?php
/**
 * The controls the app draws around a code block (js/copy-code-on-focus.js):
 * copy, delete, language badge, line numbers, word wrap, fold chevron and the
 * line count next to it. They are what a reader sees, never what a note holds.
 *
 * The editor takes them out before it saves, but its list missed the fold
 * chevron and its line count: version 6.146.0 wrote one more of each into an
 * HTML note at every save. Both sanitizers call this, so nothing of the kind
 * is stored again whoever writes the note (sanitizeHtml), and a note that
 * already carries some is read without them on a public share
 * (sanitizePublicNoteHtml).
 */

const POZNOTE_CODE_BLOCK_CONTROL_CLASSES = [
    'code-block-copy-btn',
    'code-block-delete-btn',
    'code-block-lang-btn',
    'code-block-line-numbers-btn',
    'code-block-wrap-btn',
    'code-block-collapse-btn',
    'code-block-collapsed-summary',
];

function poznoteRemoveCodeBlockControls(DOMXPath $xpath): void {
    $tests = [];
    foreach (POZNOTE_CODE_BLOCK_CONTROL_CLASSES as $class) {
        $tests[] = 'contains(concat(" ", normalize-space(@class), " "), " ' . $class . ' ")';
    }
    $controls = $xpath->query('//*[' . implode(' or ', $tests) . ']');
    if ($controls === false) {
        return;
    }
    foreach (iterator_to_array($controls) as $control) {
        if ($control->parentNode) {
            $control->parentNode->removeChild($control);
        }
    }
}
