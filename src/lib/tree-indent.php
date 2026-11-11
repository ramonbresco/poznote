<?php
/**
 * How far each level of the notes tree is indented, in pixels.
 *
 * The account picks it on the Settings page (Sidebar > Tree indentation) and
 * index.php passes it on as --pz-tree-indent, which css/folders/content.css
 * reads. The value is the step of one level: a subfolder sits that many
 * pixels right of its parent folder, a note two pixels more (measured: the
 * tree's own offsets for a subfolder and a note are part of the step).
 * The default is the indentation the tree always had (15px + 6px).
 */

const POZNOTE_TREE_INDENT_MIN = 8;
const POZNOTE_TREE_INDENT_MAX = 40;
const POZNOTE_TREE_INDENT_DEFAULT = 21;

/**
 * Read a sidebar_tree_indent value. A number out of range is brought back
 * inside it; anything that is not a number (never set, hand-edited) falls
 * back to the default.
 */
function poznoteTreeIndent($value): int
{
    if ($value === null || $value === false || $value === '' || !is_numeric($value)) {
        return POZNOTE_TREE_INDENT_DEFAULT;
    }
    return max(POZNOTE_TREE_INDENT_MIN, min(POZNOTE_TREE_INDENT_MAX, (int)$value));
}
