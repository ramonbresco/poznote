<?php
/**
 * Folding a code block: how much of its listing stays on screen.
 *
 * A folded code block keeps its first lines and clips the rest
 * (css/components/code-block-fold.css). The account picks how many on the
 * Settings page (Display > Code), and the pages that show code blocks pass
 * the number on: index.php on <body>, api_export_note.php on an exported
 * page. 0 means a folded block shows none of its code, which is what folding
 * did before the first lines were kept.
 */

/** The number the Settings card accepts, and what it starts from. */
const POZNOTE_CODE_COLLAPSED_LINES_MIN = 0;
const POZNOTE_CODE_COLLAPSED_LINES_MAX = 100;
const POZNOTE_CODE_COLLAPSED_LINES_DEFAULT = 5;

/**
 * Read a code_block_collapsed_lines value. A number out of range is brought
 * back inside it, which is what the field would have done; anything that is
 * not a number at all (never set, hand-edited) falls back to the default
 * rather than to "hide everything".
 */
function poznoteCodeBlockCollapsedLines($value): int
{
    if ($value === null || $value === false || $value === '' || !is_numeric($value)) {
        return POZNOTE_CODE_COLLAPSED_LINES_DEFAULT;
    }
    return max(
        POZNOTE_CODE_COLLAPSED_LINES_MIN,
        min(POZNOTE_CODE_COLLAPSED_LINES_MAX, (int)$value)
    );
}
