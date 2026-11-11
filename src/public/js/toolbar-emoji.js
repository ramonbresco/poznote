// Toolbar: the emoji picker and the symbol picker.
//
// One popup serves both: the caret handling (DOM range, CodeMirror offsets,
// title and task fields) is the hard part and must not exist twice. The root
// element keeps the class .emoji-picker whatever it holds, because two modals
// read that class to know a picker is open and must not close under it
// (js/modals-events.js, js/tasklist-edit-modal.js).

// Simplified popular emojis collection
const PICKER_EMOJIS = ['😀', '😃', '😄', '😁', '😊', '😉', '🙃', '😍', '😘', '😎', '🤔', '😅', '😂', '😐', '🙄', '😒', '🫩', '🙁', '😢', '😭', '😡', '👍', '👎', '👉', '👌', '✌️', '👏', '🙌', '👋', '🤝', '🙏', '✊', '👊', '❤️', '➜', '🚧', '✅', '🟩', '🟪', '☑️', '❌', '✔️', '❗', '❓', '⭐', '🔥', '💯', '🎯', '📌', '🚀', '💡', '🔔', '⚡', '🌟', '💎', '📱', '💻', '📧', '📁', '📄', '📝', '🔍', '🔑', '⚙️', '🛠️', '📊', '📈', '⚠️', '🚩', '🟢', '🔴', '🔵', '☀️', '🌙', '☕', '🍕', '🎂', '🍎', '🌱', '🌸', '🐱', '🐶', '🎵', '🎨'];

// Characters a scientific or technical note needs and no keyboard offers.
// Plain Unicode, so they are searchable, survive every export and need no
// font or CSS, unlike a <sup> run or a KaTeX formula.
const PICKER_SYMBOL_GROUPS = [
  { labelKey: 'symbols_math', labelFallback: 'Maths', chars: [
    '\u00B1', '\u00D7', '\u00F7', '\u2260', '\u2248', '\u2261', '\u2264', '\u2265',
    '\u221E', '\u221A', '\u221B', '\u2211', '\u220F', '\u222B', '\u2202', '\u2207',
    '\u2206', '\u2205', '\u2208', '\u2209', '\u2282', '\u2286', '\u2283', '\u222A',
    '\u2229', '\u2200', '\u2203', '\u00AC', '\u2227', '\u2228', '\u21D2', '\u21D4',
    '\u221D', '\u2300', '\u00B7', '\u2030'
  ] },
  // Mu lives here as the Greek letter U+03BC; the units group below carries the
  // micro sign U+00B5, the one that belongs in "µm". Same shape, two codepoints.
  { labelKey: 'symbols_greek', labelFallback: 'Greek', chars: [
    '\u03B1', '\u03B2', '\u03B3', '\u03B4', '\u03B5', '\u03B6', '\u03B7', '\u03B8',
    '\u03B9', '\u03BA', '\u03BB', '\u03BC', '\u03BD', '\u03BE', '\u03C0', '\u03C1',
    '\u03C3', '\u03C4', '\u03C5', '\u03C6', '\u03C7', '\u03C8', '\u03C9',
    '\u0393', '\u0394', '\u0398', '\u039B', '\u039E', '\u03A0', '\u03A3', '\u03A6',
    '\u03A8', '\u03A9'
  ] },
  { labelKey: 'symbols_superscript', labelFallback: 'Superscript', chars: [
    '\u2070', '\u00B9', '\u00B2', '\u00B3', '\u2074', '\u2075', '\u2076', '\u2077',
    '\u2078', '\u2079', '\u207A', '\u207B', '\u207C', '\u207D', '\u207E', '\u207F',
    '\u2071', '\u02E3', '\u1D43', '\u1D47', '\u1D9C', '\u1D48', '\u1D4F', '\u1D50',
    '\u1D52', '\u1D56', '\u02B3', '\u02E2', '\u1D57', '\u1D58', '\u1D5B', '\u02B8'
  ] },
  { labelKey: 'symbols_subscript', labelFallback: 'Subscript', chars: [
    '\u2080', '\u2081', '\u2082', '\u2083', '\u2084', '\u2085', '\u2086', '\u2087',
    '\u2088', '\u2089', '\u208A', '\u208B', '\u208C', '\u208D', '\u208E', '\u2090',
    '\u2091', '\u2095', '\u1D62', '\u2C7C', '\u2096', '\u2097', '\u2098', '\u2099',
    '\u2092', '\u209A', '\u1D63', '\u209B', '\u209C', '\u1D64', '\u1D65', '\u2093'
  ] },
  { labelKey: 'symbols_units', labelFallback: 'Units', chars: [
    '\u00B0', '\u2103', '\u2109', '\u00B5', '\u03A9', '\u212B', '\u2113', '\u2116',
    '\u00A7', '\u00B6', '\u2020', '\u2021', '\u2032', '\u2033', '\u00BC', '\u00BD',
    '\u00BE', '\u2153', '\u2154', '\u215B', '\u20AC', '\u00A3', '\u00A5', '\u00A2',
    '\u00A4', '\u2122', '\u00A9', '\u00AE'
  ] },
  { labelKey: 'symbols_arrows', labelFallback: 'Arrows', chars: [
    '\u2190', '\u2192', '\u2191', '\u2193', '\u2194', '\u2195', '\u2196', '\u2197',
    '\u2198', '\u2199', '\u21D0', '\u21D2', '\u21D1', '\u21D3', '\u21D4', '\u21C4',
    '\u21C6', '\u21A6', '\u27F5', '\u27F6', '\u27F7'
  ] }
];

// The symbols picked last, newest first, one row's worth: the point of the
// row is that the characters this account actually uses are reachable without
// reading the whole grid.
const SYMBOL_RECENT_KEY = 'symbol_picker_recent';
const SYMBOL_RECENT_MAX = 14;
let _knownSymbols = null;

// Every character the grid offers. A stored recent list is only allowed to
// hold these: it comes from localStorage, which the person at the browser can
// edit, and it is written straight into innerHTML below.
function knownSymbols() {
  if (!_knownSymbols) {
    _knownSymbols = new Set();
    PICKER_SYMBOL_GROUPS.forEach(function (group) {
      group.chars.forEach(function (char) { _knownSymbols.add(char); });
    });
  }
  return _knownSymbols;
}

// Kept in this browser rather than in a setting on the server: the picker
// works in the offline app, where no write would reach anything, and a symbol
// click should not cost an HTTP round trip. The cost is that the row does not
// follow the account to another device.
function readRecentSymbols() {
  const store = window.__poznoteUserStorage;
  if (!store) return [];
  let list;
  try {
    const raw = store.getItem(SYMBOL_RECENT_KEY);
    if (!raw) return [];
    list = JSON.parse(raw);
  } catch (e) {
    return [];
  }
  if (!Array.isArray(list)) return [];

  const known = knownSymbols();
  const seen = new Set();
  const out = [];
  list.forEach(function (char) {
    if (typeof char === 'string' && known.has(char) && !seen.has(char)) {
      seen.add(char);
      out.push(char);
    }
  });
  return out.slice(0, SYMBOL_RECENT_MAX);
}

function rememberRecentSymbol(char) {
  const store = window.__poznoteUserStorage;
  if (!store || !knownSymbols().has(char)) return;
  const next = [char].concat(readRecentSymbols().filter(function (c) { return c !== char; }))
    .slice(0, SYMBOL_RECENT_MAX);
  try {
    store.setItem(SYMBOL_RECENT_KEY, JSON.stringify(next));
  } catch (e) {
    console.debug('toolbar-emoji: rememberRecentSymbol() failed:', e);
  }
}

// What each kind of picker puts in the shared popup. A kind without a trigger
// button opens at the caret, which is where the slash menu left it.
const PICKER_KINDS = {
  emoji: { variantClass: '', trigger: '.btn-emoji', desktopWidth: 360, desktopHeight: 550 },
  // Wider and taller than the emoji grid on purpose: six groups of about
  // thirty characters plus the recent row, and the point of the thing is to
  // find one by eye. 740 is what the seven groups measure, so nothing
  // scrolls on a screen tall enough to show them.
  symbols: { variantClass: 'symbol-picker', trigger: null, desktopWidth: 620, desktopHeight: 740 }
};

function toggleEmojiPicker() {
  return openCharacterPicker('emoji');
}

function toggleSymbolPicker() {
  return openCharacterPicker('symbols');
}

function openCharacterPicker(kind) {
  const config = PICKER_KINDS[kind] || PICKER_KINDS.emoji;
  const existingPicker = document.querySelector('.emoji-picker');

  if (existingPicker) {
    existingPicker.remove();
    if (window.savedActiveInput && window.savedActiveInput.classList && (window.savedActiveInput.classList.contains('task-edit-input') || window.savedActiveInput.classList.contains('task-subitem-input') || window.savedActiveInput.classList.contains('task-input')) && typeof window.resumeTaskEditBlurSave === 'function') {
      window.resumeTaskEditBlurSave(window.savedActiveInput);
    }
    window.savedRanges.emoji = null;
    window.savedActiveInput = null;
    window.savedActiveInputSelection = null;
    return;
  }

  // If the cursor is not in an editable note, warn immediately
  // instead of waiting until an emoji is selected.
  if (!isCursorInEditableNote() && !window.savedActiveInput) {
    window.showCursorWarning();
    return;
  }

  // Save current selection so clicking inside the picker doesn't lose the caret.
  try {
    const sel = window.getSelection();
    window.savedRanges.emoji = sel && sel.rangeCount ? sel.getRangeAt(0).cloneRange() : null;
  } catch (e) {
    window.savedRanges.emoji = null;
  }

  // Save active input for title support
  // Don't overwrite if already set (e.g., by slash command)
  if (document.activeElement && document.activeElement.classList.contains('css-title')) {
    window.savedActiveInput = document.activeElement;
    // Only save selection if not already saved
    if (!window.savedActiveInputSelection) {
      window.savedActiveInputSelection = {
        start: document.activeElement.selectionStart,
        end: document.activeElement.selectionEnd
      };
    }
  } else if (!window.savedActiveInput) {
    window.savedActiveInput = null;
  }

  // CodeMirror keeps its own caret, the DOM range above does not survive a blur
  window.savedEmojiCodeMirror = getEmojiCodeMirrorCaret();

  // On a phone the keyboard would cover the picker: the caret is saved above,
  // so the field can lose focus until an emoji is picked.
  if (isMobileDevice() && document.activeElement && document.activeElement !== document.body
    && typeof document.activeElement.blur === 'function') {
    document.activeElement.blur();
  }

  // Create emoji popup
  const picker = document.createElement('div');
  picker.className = config.variantClass ? ('emoji-picker ' + config.variantClass) : 'emoji-picker';


  picker.innerHTML = buildCharacterPickerContent(kind);

  // Position picker near emoji button
  document.body.appendChild(picker);

  // Position picker with overflow management
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;
  const isMobile = isMobileDevice();

  let anchorRect = null;
  const emojiBtn = config.trigger ? document.querySelector(config.trigger) : null;
  if (emojiBtn) {
    const rect = emojiBtn.getBoundingClientRect();
    let isVisible = rect.width > 0 && rect.height > 0;
    try {
      const style = window.getComputedStyle(emojiBtn);
      if (style && (style.display === 'none' || style.visibility === 'hidden')) isVisible = false;
    } catch (e) {
        console.debug('toolbar-emoji: toggleEmojiPicker() failed:', e);
    }

    if (isVisible) {
      anchorRect = rect;
    }
  }

  if (!anchorRect) {
    try {
      const range = window.savedRanges.emoji;
      if (range) {
        const rect = range.getBoundingClientRect();
        if (rect && (rect.top || rect.left || rect.bottom || rect.right)) {
          anchorRect = rect;
        } else {
          const rects = range.getClientRects();
          if (rects && rects.length) anchorRect = rects[0];
        }
      }
    } catch (e) {
        console.debug('toolbar-emoji: toggleEmojiPicker() failed:', e);
    }
  }

  // Picker dimensions according to screen. The desktop size is a ceiling, not
  // a promise: a narrow window or a short one gets what fits, so the popup
  // never has to be dragged back into view by clampToViewport() below.
  const pickerWidth = isMobile
    ? Math.min(300, windowWidth - 40)
    : Math.min(config.desktopWidth, windowWidth - 40);
  const pickerHeight = isMobile
    ? 450
    : Math.min(config.desktopHeight, windowHeight - 120);
  picker.style.position = 'fixed';
  picker.style.width = pickerWidth + 'px';
  picker.style.maxHeight = pickerHeight + 'px';

  if (anchorRect) {
    const rect = anchorRect;
    let top = rect.bottom + 10;
    if (top + pickerHeight > windowHeight - 20) {
      top = rect.top - pickerHeight - 10;
    }
    let left = isMobile ? (windowWidth - pickerWidth) / 2 : rect.left - (pickerWidth / 2) + (rect.width / 2);
    picker.style.top = top + 'px';
    picker.style.left = left + 'px';
  } else {
    picker.style.top = ((windowHeight - pickerHeight) / 2) + 'px';
    picker.style.left = ((windowWidth - pickerWidth) / 2) + 'px';
  }
  clampToViewport(picker, 20);

  // Handle emoji clicks. Close through setupPopupDismiss's close function so
  // its document-level listeners are removed; a bare picker.remove() leaves
  // them active and the next click anywhere would wipe the saved input state.
  let closePicker = null;
  picker.addEventListener('click', function (e) {
    if (e.target.classList.contains('emoji-item')) {
      const emoji = e.target.getAttribute('data-char');
      if (kind === 'symbols') rememberRecentSymbol(emoji);
      insertEmoji(emoji);
      if (closePicker) closePicker(); else picker.remove();
    }
  });

  closePicker = setupPopupDismiss(picker, config.trigger, function () {
    if (window.savedActiveInput && window.savedActiveInput.classList && (window.savedActiveInput.classList.contains('task-edit-input') || window.savedActiveInput.classList.contains('task-subitem-input') || window.savedActiveInput.classList.contains('task-input')) && typeof window.resumeTaskEditBlurSave === 'function') {
      window.resumeTaskEditBlurSave(window.savedActiveInput);
    }
    window.savedRanges.emoji = null;
    window.savedActiveInput = null;
    window.savedActiveInputSelection = null;
  });
}

// The grid of the open picker: emoji in one block, symbols in labelled groups.
function buildCharacterPickerContent(kind) {
  const t = window.t || ((key, params, fallback) => fallback);
  const cell = function (char) {
    return '<span class="emoji-item" data-char="' + char + '">' + char + '</span>';
  };

  if (kind !== 'symbols') {
    return '<div class="emoji-category"><div class="emoji-grid">'
      + PICKER_EMOJIS.map(cell).join('') + '</div></div>';
  }

  const groupHtml = function (label, chars) {
    return '<div class="emoji-category">'
      + '<div class="char-group-label">' + label + '</div>'
      + '<div class="emoji-grid">' + chars.map(cell).join('') + '</div>'
      + '</div>';
  };

  // No row until something has been picked: an empty heading would only take
  // the space the grid needs to fit without scrolling.
  const recent = readRecentSymbols();
  const blocks = recent.length
    ? [groupHtml(t('slash_menu.symbols_recent', null, 'Recent'), recent)]
    : [];

  PICKER_SYMBOL_GROUPS.forEach(function (group) {
    blocks.push(groupHtml(t('slash_menu.' + group.labelKey, null, group.labelFallback), group.chars));
  });
  return blocks.join('');
}

// Caret of the markdown editor holding the selection, or null outside one
function getEmojiCodeMirrorCaret() {
  const api = window.PoznoteMarkdownCodeMirror;
  const sel = window.getSelection();
  if (!api || typeof api.isCodeMirrorEditor !== 'function' || typeof api.getSelectionOffsets !== 'function'
    || typeof api.replaceRange !== 'function' || !sel || !sel.rangeCount) return null;

  let node = sel.getRangeAt(0).commonAncestorContainer;
  while (node && !(node.nodeType === 1 && api.isCodeMirrorEditor(node))) node = node.parentNode;
  if (!node) return null;

  const offsets = api.getSelectionOffsets(node);
  return offsets ? { host: node, start: offsets.start, end: offsets.end } : null;
}

function insertEmoji(emoji) {
  // Restore selection saved when opening the picker.
  const sel = window.getSelection();
  try {
    if (window.savedRanges.emoji) {
      sel.removeAllRanges();
      sel.addRange(window.savedRanges.emoji);
    }
  } catch (e) {
      console.debug('toolbar-emoji: insertEmoji() failed:', e);
  }

  // Ensure focus is back on the editor before inserting.
  try {
    if (sel && sel.rangeCount) {
      const rangeForFocus = sel.getRangeAt(0);
      let focusContainer = rangeForFocus.commonAncestorContainer;
      if (focusContainer && focusContainer.nodeType === 3) focusContainer = focusContainer.parentNode;
      const focusTarget = (focusContainer && focusContainer.closest && (focusContainer.closest('.markdown-editor') || focusContainer.closest('[contenteditable="true"]')));
      if (focusTarget && typeof focusTarget.focus === 'function') {
        try {
          focusTarget.focus({ preventScroll: true });
        } catch (e) {
          focusTarget.focus();
        }
      }
    }
  } catch (e) {
      console.debug('toolbar-emoji: focusTarget() failed:', e);
  }

  // Markdown editor: insert at the caret saved when the picker opened
  const cmCaret = window.savedEmojiCodeMirror;
  window.savedEmojiCodeMirror = null;
  if (cmCaret && !window.savedActiveInput && window.PoznoteMarkdownCodeMirror
    && window.PoznoteMarkdownCodeMirror.isCodeMirrorEditor(cmCaret.host)) {
    window.PoznoteMarkdownCodeMirror.replaceRange(cmCaret.host, cmCaret.start, cmCaret.end, emoji);
    window.savedRanges.emoji = null;
    return;
  }

  // Handle input insertion (title and task fields)
  if (window.savedActiveInput) {
    const input = window.savedActiveInput;
    input.focus();

    if (window.savedActiveInputSelection) {
      // Validate selection positions to avoid errors
      const maxLength = input.value.length;
      const safeStart = Math.max(0, Math.min(window.savedActiveInputSelection.start, maxLength));
      const safeEnd = Math.max(safeStart, Math.min(window.savedActiveInputSelection.end, maxLength));
      input.setSelectionRange(safeStart, safeEnd);
    } else {
      // Restore to saved position or end
    }

    const start = input.selectionStart;
    const end = input.selectionEnd;
    const text = input.value;

    input.setRangeText(emoji, start, end, 'end');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    if (input.classList && (input.classList.contains('task-edit-input') || input.classList.contains('task-subitem-input') || input.classList.contains('task-input')) && typeof window.resumeTaskEditBlurSave === 'function') {
      window.resumeTaskEditBlurSave(input);
    }

    window.savedRanges.emoji = null;
    window.savedActiveInput = null;
    window.savedActiveInputSelection = null;
    return;
  }

  // Vérifier si le curseur est dans une zone éditable
  if (!isCursorInEditableNote()) {
    window.showCursorWarning();
    window.savedRanges.emoji = null;
    return;
  }

  if (!sel.rangeCount) return;

  const range = sel.getRangeAt(0);
  let container = range.commonAncestorContainer;
  if (container.nodeType === 3) container = container.parentNode;
  const noteentry = container.closest && container.closest('.noteentry');

  if (!noteentry) return;

  // Insert emoji
  document.execCommand('insertText', false, emoji);

  window.savedRanges.emoji = null;

  // Trigger input event
  if (noteentry) {
    noteentry.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

// Ensure functions are available in global scope
window.toggleSymbolPicker = toggleSymbolPicker;
window.insertSeparator = insertSeparator;
