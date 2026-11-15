<?php
/**
 * Width of the content of the speed dial, the dashboard and the attachments
 * page (the grid, the cards, the list: not the title nor the toolbar), set
 * from the slider of their toolbar (js/page-width.js): a percentage of the
 * room beside the icon rail, kept in this browser (__poznoteUserStorage, one
 * key per page) and put on <html> by js/theme-init.js before the page paints.
 * Empty or absent, the page keeps its own layout: the speed dial's 1200px
 * column, the dashboard's full width (the dashboard's 100 being stored as
 * empty again), the attachments page's 900px or 1100px column.
 *
 * It used to be an account setting (speed_dial_width, dashboard_width,
 * attachments_list_width): a browser that has never stored a width starts
 * from that value (data-legacy-value), then keeps its own.
 */

const POZNOTE_PAGE_WIDTH_MIN = 10;
const POZNOTE_PAGE_WIDTH_MAX = 100;

// Per page: the browser storage key (the same three names in
// js/theme-init.js), the former account setting, the CSS variable the page
// reads, the content it sizes, and the width it has without a value (null: a
// layout of its own, which no percentage matches).
const POZNOTE_PAGE_WIDTH_PAGES = [
    'speed-dial' => ['storage' => 'page_width_speed_dial', 'setting' => 'speed_dial_width', 'var' => '--speed-dial-width', 'column' => '.speed-dial-grid', 'default' => null],
    'dashboard' => ['storage' => 'page_width_dashboard', 'setting' => 'dashboard_width', 'var' => '--dashboard-width', 'column' => '.dashboard-content', 'default' => 100],
    // attachments_list.php: its own column (900px as a list, 1100px as a grid) without a setting
    'attachments' => ['storage' => 'page_width_attachments', 'setting' => 'attachments_list_width', 'var' => '--attachments-list-width', 'column' => '.attachments-list-container', 'default' => null],
];

/** A stored width as a whole percentage, null for the page's own layout. */
function poznotePageWidth($value): ?int {
    $value = trim((string)$value);
    if ($value === '' || !ctype_digit($value)) {
        return null;
    }
    return max(POZNOTE_PAGE_WIDTH_MIN, min(POZNOTE_PAGE_WIDTH_MAX, (int)$value));
}

/** The width the former account setting held, a browser's starting point. */
function poznotePageWidthLegacySetting(string $page): ?int {
    return poznotePageWidth(getSetting(POZNOTE_PAGE_WIDTH_PAGES[$page]['setting'], ''));
}

/**
 * The slider itself (js/page-width.js): its name and its value, then the
 * range. No reset button, unlike the note's: the slider is the way back. In
 * the "..." menu of the speed dial (ui_customization_panel.php) and in a
 * popover of the dashboard's toolbar. $class adds the menu's entry classes
 * where it is one.
 */
function poznoteRenderPageWidthSlider(string $page, string $id, string $class = ''): void {
    $config = POZNOTE_PAGE_WIDTH_PAGES[$page];
    $legacy = poznotePageWidthLegacySetting($page);
    ?>
    <div id="<?php echo $id; ?>" class="page-more-menu-slider<?php echo $class !== '' ? ' ' . $class : ''; ?>" role="group" aria-labelledby="<?php echo $id; ?>Label" data-page-width
        data-storage-key="<?php echo $config['storage']; ?>"
        data-css-var="<?php echo $config['var']; ?>"
        data-column="<?php echo $config['column']; ?>"
        data-legacy-value="<?php echo $legacy === null ? '' : $legacy; ?>"
        data-default-width="<?php echo $config['default'] === null ? '' : (int)$config['default']; ?>"
        data-label-default="<?php echo t_h('page_menu.width_default', [], 'Default'); ?>"
        data-label-full="<?php echo t_h('modals.note_width.full_width', [], 'Full Width'); ?>">
        <div class="page-more-menu-slider-head">
            <?php if ($class !== ''): ?><i class="lucide lucide-move-horizontal"></i><?php endif; ?>
            <span id="<?php echo $id; ?>Label" class="page-more-menu-label"><?php echo t_h('page_menu.page_width', [], 'Page width'); ?></span>
            <output class="page-more-menu-slider-value" for="<?php echo $id; ?>Input"></output>
        </div>
        <input type="range" id="<?php echo $id; ?>Input" class="page-more-menu-slider-input" min="<?php echo POZNOTE_PAGE_WIDTH_MIN; ?>" max="<?php echo POZNOTE_PAGE_WIDTH_MAX; ?>" step="1" value="100" aria-labelledby="<?php echo $id; ?>Label">
    </div>
    <?php
}
