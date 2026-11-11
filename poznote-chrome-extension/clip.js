/**
 * Reads the text of the page for "Save as Markdown" (discussion #1760).
 *
 * Injected into the active tab by the popup, after vendor/Readability.js,
 * vendor/turndown.js and vendor/turndown-plugin-gfm.js, in the extension's
 * isolated world: the page's own scripts never see it, it only reads the DOM.
 * Defines globalThis.poznoteClipPage(), which the popup calls next.
 *
 * What is read: the selection when there is one, otherwise the main content
 * of the page as Readability finds it (the whole body when it finds none).
 * The result is returned twice, as Markdown for a Markdown note and as
 * cleaned HTML for an HTML note, each written in the note's own format.
 */
/* global Readability, TurndownService, turndownPluginGfm */
(() => {
  // Elements that carry no text worth keeping, or that would run in a note
  const DROP = 'script, style, noscript, template, iframe, frame, object, embed, canvas, svg, '
    + 'form, button, input, select, textarea, dialog, link, meta, base';

  // Attributes that survive, everything else (classes, styles, handlers) goes
  const KEEP_ATTRIBUTES = new Set(['href', 'src', 'alt', 'title', 'colspan', 'rowspan', 'start', 'datetime', 'class']);

  // Lazy-loading scripts keep the real address here until the image scrolls into view
  const LAZY_SRC = ['data-src', 'data-original', 'data-lazy-src', 'data-url'];

  function absolute(value) {
    try {
      return new URL(value, document.baseURI).href;
    } catch (e) {
      return '';
    }
  }

  /**
   * The selected part of the page, or null when nothing is selected.
   * A selection made inside a code block keeps its <pre>, otherwise its
   * line breaks would be lost; one inside a list keeps its list.
   */
  function selectionRoot() {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !String(selection).trim()) {
      return null;
    }
    const root = document.createElement('div');
    for (let i = 0; i < selection.rangeCount; i++) {
      const range = selection.getRangeAt(i);
      let fragment = range.cloneContents();
      const ancestor = range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
        ? range.commonAncestorContainer
        : range.commonAncestorContainer.parentElement;
      const pre = ancestor && ancestor.closest('pre');
      if (pre && !fragment.querySelector('pre')) {
        const wrapper = document.createElement('pre');
        const code = document.createElement('code');
        const source = pre.querySelector('code') || pre;
        code.className = source.className || pre.className || '';
        code.append(fragment);
        wrapper.append(code);
        fragment = wrapper;
      } else if (ancestor && ancestor.closest('ul, ol') && fragment.firstElementChild && fragment.firstElementChild.tagName === 'LI') {
        const list = document.createElement(ancestor.closest('ul, ol').tagName);
        list.append(fragment);
        fragment = list;
      }
      root.append(fragment);
    }
    return root;
  }

  /**
   * The main content of the page, without menus, sidebars and footers
   */
  function articleRoot() {
    let article = null;
    try {
      article = new Readability(document.cloneNode(true), { keepClasses: true }).parse();
    } catch (e) {
      article = null;
    }
    if (article && article.content && article.textContent && article.textContent.trim()) {
      const parsed = new DOMParser().parseFromString(article.content, 'text/html');
      const root = document.createElement('div');
      root.append(...parsed.body.childNodes);
      return { root, title: article.title || '' };
    }
    const root = document.body ? document.body.cloneNode(true) : document.createElement('div');
    root.querySelectorAll('nav, header, footer, aside, [role="navigation"], [role="banner"], [role="contentinfo"], [aria-hidden="true"]').forEach(el => el.remove());
    return { root, title: '' };
  }

  /**
   * Strip what a note should not receive, and make every address absolute
   * so links and images still work once they are out of the page.
   */
  function clean(root) {
    root.querySelectorAll(DROP).forEach(el => el.remove());
    // Hidden by the page, so not what the reader saw
    root.querySelectorAll('[hidden]').forEach(el => el.remove());

    root.querySelectorAll('img').forEach(img => {
      const lazy = LAZY_SRC.map(name => img.getAttribute(name)).find(Boolean);
      let src = img.getAttribute('src') || '';
      if (lazy && (!src || src.startsWith('data:'))) {
        src = lazy;
      }
      // A data: image is usually a placeholder or a tracking pixel, and a real
      // one would put megabytes of base64 in the note
      if (!src || src.startsWith('data:')) {
        img.remove();
        return;
      }
      img.setAttribute('src', absolute(src));
    });

    root.querySelectorAll('*').forEach(el => {
      for (const { name } of Array.from(el.attributes)) {
        // A class only matters for the language of a code block
        if (name === 'class' && !el.matches('pre, code')) {
          el.removeAttribute(name);
        } else if (!KEEP_ATTRIBUTES.has(name)) {
          el.removeAttribute(name);
        }
      }
    });

    root.querySelectorAll('a[href]').forEach(a => {
      const href = a.getAttribute('href');
      if (href.startsWith('#')) {
        // An anchor of the page leads nowhere from a note: keep the words
        a.replaceWith(...a.childNodes);
        return;
      }
      const url = absolute(href);
      if (/^(https?|mailto|tel):/i.test(url)) {
        a.setAttribute('href', url);
      } else {
        a.replaceWith(...a.childNodes); // javascript: and the like
      }
    });
    return root;
  }

  /**
   * The language of a code block, from the class names sites commonly use
   */
  function codeLanguage(pre) {
    const classes = [pre, pre.querySelector('code')].filter(Boolean).map(el => el.className || '').join(' ');
    const match = classes.match(/(?:^|\s)(?:language|lang|highlight-source)-([a-z0-9_+#-]+)/i);
    return match ? match[1].toLowerCase() : '';
  }

  function markdownOf(root) {
    const service = new TurndownService({
      headingStyle: 'atx',
      hr: '---',
      bulletListMarker: '-',
      codeBlockStyle: 'fenced',
      emDelimiter: '*'
    });
    service.use(turndownPluginGfm.gfm);

    // Every <pre> becomes a fence, with or without a <code> inside, and keeps
    // the language its class names; the text is read as the reader sees it
    service.addRule('poznoteCodeBlock', {
      filter: node => node.nodeName === 'PRE',
      replacement: (content, node) => {
        const text = node.textContent.replace(/\n+$/, '');
        const longest = Math.max(2, ...(text.match(/`+/g) || []).map(run => run.length));
        const fence = '`'.repeat(longest + 1);
        return `\n\n${fence}${codeLanguage(node)}\n${text}\n${fence}\n\n`;
      }
    });

    // Poznote reads $...$ as a formula, so a dollar sign in the text is escaped
    const escape = service.escape.bind(service);
    service.escape = text => escape(text).replace(/\$/g, '\\$');

    return service.turndown(root).replace(/\n{3,}/g, '\n\n').trim();
  }

  const BLOCK = 'p, h1, h2, h3, h4, h5, h6, ul, ol, pre, blockquote, table, figure, hr, div, article, section, main, header, footer, aside, dl';
  const WRAPPER = 'div, article, section, main, header, footer, aside';
  // Containers whose text between children is only the page's indentation
  const NO_LOOSE_TEXT = 'ul, ol, table, thead, tbody, tfoot, tr, blockquote, figure, dl';

  /**
   * The page's layout boxes mean nothing in a note: a wrapper that holds
   * blocks is unwrapped, one that holds text becomes a paragraph, and the
   * indentation between blocks goes, so the note gets a flat run of blocks.
   */
  function flattenForHtml(root) {
    Array.from(root.querySelectorAll(WRAPPER)).reverse().forEach(el => {
      const hasBlock = Array.from(el.children).some(child => child.matches(BLOCK));
      if (hasBlock) {
        el.replaceWith(...el.childNodes);
      } else if (el.textContent.trim() || el.querySelector('img')) {
        const p = document.createElement('p');
        p.append(...el.childNodes);
        el.replaceWith(p);
      } else {
        el.remove();
      }
    });
    const loose = [root, ...root.querySelectorAll(NO_LOOSE_TEXT)];
    loose.forEach(parent => {
      Array.from(parent.childNodes).forEach(node => {
        if (node.nodeType === Node.TEXT_NODE && !node.textContent.trim()) {
          node.remove();
        }
      });
    });
    // Inline content left at the top level (a selection inside one paragraph) gets its own paragraph
    let run = null;
    Array.from(root.childNodes).forEach(node => {
      const inline = node.nodeType === Node.TEXT_NODE || (node.nodeType === Node.ELEMENT_NODE && !node.matches(BLOCK));
      if (inline) {
        if (!run) {
          run = document.createElement('p');
          node.before(run);
        }
        run.append(node);
      } else {
        run = null;
      }
    });
    return root;
  }

  /**
   * HTML notes give a paragraph no margin and write an empty line as an empty
   * paragraph, so one is put between two paragraphs, as the app does when it
   * converts Markdown to rich text. Headings, lists and quotes carry their own.
   */
  function spaceParagraphs(root) {
    root.querySelectorAll('p, pre, table, figure').forEach(el => {
      const next = el.nextElementSibling;
      if (next && next.matches('p, pre, table, figure')) {
        const blank = document.createElement('p');
        blank.append(document.createElement('br'));
        el.after(blank);
      }
    });
    return root;
  }

  globalThis.poznoteClipPage = () => {
    const selected = selectionRoot();
    const source = selected ? { root: selected, title: '' } : articleRoot();
    const root = clean(source.root);
    const markdown = markdownOf(root);
    const html = spaceParagraphs(flattenForHtml(root.cloneNode(true))).innerHTML.trim();
    return {
      selection: Boolean(selected),
      title: source.title || document.title || '',
      markdown,
      html
    };
  };

})();
