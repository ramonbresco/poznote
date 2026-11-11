// Stream grammars for two configuration languages of fenced code blocks
// (discussion #1763): TOML, and Terraform / HCL. They colour the same things
// as the highlight.js grammars of js/hljs-config-languages.js, which paint
// the same blocks in the preview, an HTML note and a public page, so a block
// keeps its colours from one view to the other.
//
// @codemirror/legacy-modes has a TOML mode, but it stops colouring keys after
// the first "=" of a line, so every key of an inline table stayed in the text
// colour, and that is most of a mise or Cargo file. It has no HCL at all.

const BARE_KEY = /^[A-Za-z0-9_-]+/
const TOML_DATE = /^\d{4}-\d{2}-\d{2}(?:[Tt ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:[Zz]|[+-]\d{2}:\d{2})?)?/
const TOML_TIME = /^\d{2}:\d{2}:\d{2}(?:\.\d+)?/
const TOML_NUMBER = /^[+-]?(?:0x[0-9A-Fa-f_]+|0o[0-7_]+|0b[01_]+|inf|nan|\d[\d_]*(?:\.\d[\d_]*)?(?:[eE][+-]?\d[\d_]*)?)(?![\w.:-])/

// The rest of the line from the stream position, to look ahead without
// consuming: does a key end at "=", does a block header end at "{".
function rest(stream) {
  return stream.string.slice(stream.pos)
}

function tomlString(stream, state) {
  const quote = state.string
  const multiline = quote.length === 3
  while (!stream.eol()) {
    if (quote[0] === '"' && stream.peek() === '\\') {
      stream.next()
      stream.next()
      continue
    }
    if (stream.match(quote)) {
      // """a"""" is a string ending in a quote: the closing run takes the extras
      if (multiline) while (stream.peek() === quote[0]) stream.next()
      state.string = null
      return 'string'
    }
    stream.next()
  }
  // A single-line string that reaches the end of its line is unterminated
  if (!multiline) state.string = null
  return 'string'
}

export const tomlMode = {
  name: 'toml',
  startState() {
    return { string: null }
  },
  token(stream, state) {
    if (state.string) return tomlString(stream, state)
    if (stream.eatSpace()) return null
    const next = stream.peek()

    if (next === '#') {
      stream.skipToEnd()
      return 'comment'
    }

    // [table] and [[array.of.tables]] at the start of a line
    if (next === '[' && /^\s*$/.test(stream.string.slice(0, stream.pos))) {
      const header = stream.match(/^\[\[?(?:"(?:[^"\\\n]|\\.)*"|'[^'\n]*'|[^\]\n"'#])*\]\]?/)
      if (header) return 'keyword'
    }

    // A key, bare or quoted, dotted or not, is whatever stands before "=".
    // Checked before strings and numbers: "1234" and "a.b" are keys there.
    const key = rest(stream).match(/^(?:[A-Za-z0-9_-]+|"(?:[^"\\\n]|\\.)*"|'[^'\n]*')(?:\s*\.\s*(?:[A-Za-z0-9_-]+|"(?:[^"\\\n]|\\.)*"|'[^'\n]*'))*(?=\s*=)/)
    if (key) {
      stream.pos += key[0].length
      return 'propertyName'
    }

    const quote = stream.match(/^("""|'''|"|')/)
    if (quote) {
      state.string = quote[0]
      return tomlString(stream, state)
    }

    if (stream.match(TOML_DATE) || stream.match(TOML_TIME)) return 'number'
    if (stream.match(/^(?:true|false)(?![\w-])/)) return 'bool'
    if (stream.match(TOML_NUMBER)) return 'number'
    if (stream.match(BARE_KEY)) return null

    stream.next()
    return /[[\]{},=.]/.test(next) ? 'punctuation' : null
  },
  languageData: {
    commentTokens: { line: '#' }
  }
}

const HCL_KEYWORDS = new Set(['for', 'in', 'if', 'else', 'endif', 'endfor'])
const HCL_TYPES = new Set(['string', 'number', 'bool', 'list', 'map', 'set', 'object', 'tuple', 'any'])
const HCL_ROOTS = /^(?:var|local|module|data|each|count|path|self|terraform)(?=\.)/
const HCL_IDENT = /^[A-Za-z_][\w-]*/

// The context stack: a quoted string or a heredoc can hold ${...} and %{...},
// and the expression inside can hold strings again. Each "interp" counts its
// own braces so a map written in an interpolation does not close it.
function top(state) {
  return state.stack[state.stack.length - 1]
}

function hclTemplate(stream, state, context) {
  // A heredoc ends on a line holding only its tag
  if (context.type === 'heredoc' && stream.sol()) {
    const end = stream.string.match(/^\s*([A-Za-z_][\w-]*)\s*$/)
    if (end && end[1] === context.tag) {
      stream.skipToEnd()
      state.stack.pop()
      return 'string'
    }
  }
  while (!stream.eol()) {
    if (stream.match(/^(?:\$\$|%%)\{/)) continue
    if (stream.match(/^[$%]\{~?/, false)) {
      // The template marker is its own token, so the string ends right before
      if (stream.pos > stream.start) return 'string'
      stream.match(/^[$%]\{~?/)
      state.stack.push({ type: 'interp', depth: 0 })
      return 'meta'
    }
    if (context.type === 'string') {
      if (stream.peek() === '\\') {
        stream.next()
        stream.next()
        continue
      }
      if (stream.peek() === '"') {
        stream.next()
        state.stack.pop()
        return 'string'
      }
    }
    stream.next()
  }
  // A quoted string does not run over its line
  if (context.type === 'string') state.stack.pop()
  return 'string'
}

export const hclMode = {
  name: 'hcl',
  startState() {
    return { stack: [], comment: false }
  },
  copyState(state) {
    return { stack: state.stack.map(context => Object.assign({}, context)), comment: state.comment }
  },
  token(stream, state) {
    if (state.comment) {
      if (stream.skipTo('*/')) {
        stream.pos += 2
        state.comment = false
      } else {
        stream.skipToEnd()
      }
      return 'comment'
    }

    const context = top(state)
    if (context && context.type !== 'interp') return hclTemplate(stream, state, context)

    if (stream.eatSpace()) return null
    const next = stream.peek()

    if (next === '#' || stream.match('//', false)) {
      stream.skipToEnd()
      return 'comment'
    }
    if (stream.match('/*')) {
      state.comment = true
      if (stream.skipTo('*/')) {
        stream.pos += 2
        state.comment = false
      } else {
        stream.skipToEnd()
      }
      return 'comment'
    }

    if (context) {
      if (next === '{') context.depth++
      if (next === '}' || (next === '~' && stream.match('~}', false))) {
        if (context.depth === 0) {
          stream.match(/^~?\}/)
          state.stack.pop()
          return 'meta'
        }
        context.depth--
      }
    }

    const heredoc = stream.match(/^<<-?([A-Za-z_][\w-]*)\s*$/)
    if (heredoc) {
      state.stack.push({ type: 'heredoc', tag: heredoc[1] })
      return 'string'
    }

    if (next === '"') {
      stream.next()
      state.stack.push({ type: 'string' })
      return hclTemplate(stream, state, top(state))
    }

    if (stream.match(/^\d+(?:\.\d+)?(?:[eE][+-]?\d+)?(?![\w.])/)) return 'number'

    if (stream.match(HCL_ROOTS)) return 'keyword'

    const word = stream.match(HCL_IDENT)
    if (word) {
      const name = word[0]
      const after = rest(stream)
      // resource "aws_instance" "web" {: the first word of a block header
      if (!context && /^\s*$/.test(stream.string.slice(0, stream.start)) &&
        /^(?:[ \t]+(?:"[^"\n]*"|[A-Za-z_][\w-]*))*[ \t]*\{/.test(after)) return 'keyword'
      if (/^\s*=(?!=)/.test(after)) return 'propertyName'
      if (/^\(/.test(after)) return 'variableName.function'
      // var.list is an attribute named list, not a type
      if (stream.string.charAt(stream.start - 1) === '.') return null
      if (name === 'true' || name === 'false') return 'bool'
      if (name === 'null') return 'null'
      if (HCL_KEYWORDS.has(name)) return 'keyword'
      if (HCL_TYPES.has(name)) return 'typeName'
      return null
    }

    stream.next()
    return /[[\](){},.:?=!<>+\-*/%&|]/.test(next) ? 'punctuation' : null
  },
  languageData: {
    commentTokens: { line: '#', block: { open: '/*', close: '*/' } }
  }
}
