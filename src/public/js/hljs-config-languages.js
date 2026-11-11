/**
 * highlight.js grammars for two configuration languages of code blocks
 * (discussion #1763): TOML, and Terraform / HCL. Loaded right after
 * highlight.min.js on every page that colours code (index, offline, public
 * note, HTML export). The vendored files stay the pristine upstream ones
 * (vendor.json), so these grammars live here.
 *
 * TOML: the common bundle answers "toml" with its INI grammar, which leaves
 * every key of an inline table in the text colour (most of a mise or Cargo
 * file) and breaks a date into numbers and minus signs. Registering "toml"
 * by name wins over that alias, "ini" keeps the stock grammar.
 *
 * Terraform: highlight.js has no HCL grammar at all.
 *
 * Both are kept out of auto-detection (disableAutodetect): an untagged block
 * is detected exactly as it was before they existed.
 *
 * build/markdown-editor/src/config-languages.js holds the CodeMirror version
 * of both, for the Live preview and Rich text views; keep them in step.
 */
(function () {
    'use strict';

    if (typeof hljs === 'undefined' || !hljs || typeof hljs.registerLanguage !== 'function') return;

    var QUOTED_BASIC = /"(?:[^"\\\n]|\\.)*"/;
    var QUOTED_LITERAL = /'[^'\n]*'/;

    function toml(hljs) {
        var regex = hljs.regex;
        var KEY_PART = regex.either(/[A-Za-z0-9_-]+/, QUOTED_BASIC, QUOTED_LITERAL);
        var DOTTED_KEY = regex.concat(KEY_PART, '(?:\\s*\\.\\s*', KEY_PART, ')*');

        return {
            name: 'TOML',
            disableAutodetect: true,
            contains: [
                hljs.COMMENT(/#/, /$/),
                {
                    // [table] and [[array.of.tables]], on their own line
                    scope: 'section',
                    match: /(?<=^[ \t]*)\[\[?(?:"(?:[^"\\\n]|\\.)*"|'[^'\n]*'|[^\]\n"'#])*\]\]?/
                },
                {
                    // A key is whatever stands before "=", inline tables included.
                    // Listed before strings and numbers: "1234" and "a.b" are keys there.
                    scope: 'attr',
                    match: regex.concat(DOTTED_KEY, regex.lookahead(/\s*=/)),
                    relevance: 0
                },
                { scope: 'string', begin: /"""/, end: /"""(?!")|""""{1,2}/, contains: [hljs.BACKSLASH_ESCAPE] },
                { scope: 'string', begin: /'''/, end: /'''(?!')|''''{1,2}/ },
                { scope: 'string', begin: /"/, end: /"|$/, contains: [hljs.BACKSLASH_ESCAPE] },
                { scope: 'string', begin: /'/, end: /'|$/ },
                {
                    // Offset or local date-time, local date, local time
                    scope: 'number',
                    match: /\b\d{4}-\d{2}-\d{2}(?:[Tt ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:[Zz]|[+-]\d{2}:\d{2})?)?(?![\w:-])|\b\d{2}:\d{2}:\d{2}(?:\.\d+)?\b/
                },
                { scope: 'literal', match: /\b(?:true|false)\b/ },
                {
                    scope: 'number',
                    match: /(?<![\w.-])[+-]?(?:0x[0-9A-Fa-f_]+|0o[0-7_]+|0b[01_]+|inf|nan|\d[\d_]*(?:\.\d[\d_]*)?(?:[eE][+-]?\d[\d_]*)?)(?![\w.:-])/,
                    relevance: 0
                }
            ]
        };
    }

    function hcl(hljs) {
        var regex = hljs.regex;
        var IDENT = /[A-Za-z_][\w-]*/;
        var KEYWORDS = {
            // Not after a dot: var.list is an attribute named list, not a type
            $pattern: /(?<![.\w-])[A-Za-z_][\w-]*/,
            keyword: ['for', 'in', 'if', 'else', 'endif', 'endfor'],
            literal: ['true', 'false', 'null'],
            type: ['string', 'number', 'bool', 'list', 'map', 'set', 'object', 'tuple', 'any']
        };

        var NUMBER = {
            scope: 'number',
            match: /\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?(?![\w.])/,
            relevance: 0
        };
        // var.region, local.tags, each.value...: the root of a reference
        var REFERENCE_ROOT = {
            scope: 'variable.language',
            match: /\b(?:var|local|module|data|each|count|path|self|terraform)(?=\.)/
        };
        var FUNCTION_CALL = {
            scope: 'built_in',
            match: regex.concat(IDENT, regex.lookahead(/\(/)),
            relevance: 0
        };
        var INTERPOLATION = {
            scope: 'subst',
            begin: /[$%]\{~?/,
            end: /~?\}/,
            keywords: KEYWORDS,
            contains: []
        };
        var STRING = {
            scope: 'string',
            begin: /"/,
            end: /"|$/,
            contains: [hljs.BACKSLASH_ESCAPE, { match: /(?:\$\$|%%)\{/ }, INTERPOLATION]
        };
        // <<EOF ... EOF and the indented <<-EOF: the end is a line holding
        // only the same tag (END_SAME_AS_BEGIN compares the two captures)
        var HEREDOC = hljs.END_SAME_AS_BEGIN({
            scope: 'string',
            begin: /<<-?([A-Za-z_][\w-]*)[ \t]*$/,
            end: /^[ \t]*([A-Za-z_][\w-]*)[ \t]*$/,
            contains: [{ match: /(?:\$\$|%%)\{/ }, INTERPOLATION]
        });
        INTERPOLATION.contains = [STRING, NUMBER, REFERENCE_ROOT, FUNCTION_CALL];

        return {
            name: 'Terraform',
            aliases: ['hcl', 'tf', 'tfvars', 'hcl2'],
            disableAutodetect: true,
            keywords: KEYWORDS,
            contains: [
                hljs.HASH_COMMENT_MODE,
                hljs.C_LINE_COMMENT_MODE,
                hljs.C_BLOCK_COMMENT_MODE,
                HEREDOC,
                STRING,
                {
                    // resource "aws_instance" "web" {: the first word of a block header
                    scope: 'keyword',
                    match: regex.concat(/(?<=^[ \t]*)/, IDENT, regex.lookahead(/(?:[ \t]+(?:"[^"\n]*"|[A-Za-z_][\w-]*))*[ \t]*\{/))
                },
                {
                    scope: 'attr',
                    match: regex.concat(IDENT, regex.lookahead(/\s*=(?!=)/)),
                    relevance: 0
                },
                FUNCTION_CALL,
                REFERENCE_ROOT,
                NUMBER
            ]
        };
    }

    hljs.registerLanguage('toml', toml);
    // The INI grammar's "toml" alias stays in the alias table, and
    // highlightElement() names a block after it (class "language-ini" next
    // to "language-toml"): point the alias at the grammar that now answers
    if (typeof hljs.registerAliases === 'function') {
        hljs.registerAliases('toml', { languageName: 'toml' });
    }
    hljs.registerLanguage('terraform', hcl);
})();
