import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap, type CompletionContext } from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { json } from '@codemirror/lang-json';
import {
  bracketMatching,
  foldGutter,
  foldKeymap,
  HighlightStyle,
  indentOnInput,
  syntaxHighlighting,
} from '@codemirror/language';
import { linter, lintGutter, lintKeymap, type Diagnostic } from '@codemirror/lint';
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search';
import type { Extension } from '@codemirror/state';
import {
  Decoration,
  drawSelection,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
  MatchDecorator,
  ViewPlugin,
  type DecorationSet,
  type ViewUpdate,
} from '@codemirror/view';
import { tags as t } from '@lezer/highlight';
import { findJsonError } from '../../lib/jsonBody';

/** Tema ligado às variáveis CSS do app (muda junto com a paleta). */
const theme = EditorView.theme(
  {
    '&': {
      height: '100%',
      backgroundColor: 'var(--input)',
      color: 'var(--code-text)',
      border: '1px solid var(--line)',
      borderRadius: '4px',
      fontSize: '12px',
    },
    '&.cm-focused': { outline: 'none', borderColor: 'var(--accent)' },
    '.cm-scroller': { fontFamily: 'var(--mono)', lineHeight: '1.6' },
    '.cm-content': { caretColor: 'var(--text-strong)' },
    '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--text-strong)' },
    '.cm-gutters': {
      backgroundColor: 'var(--surface)',
      color: 'var(--muted-2)',
      border: 'none',
      borderRight: '1px solid var(--line)',
    },
    '.cm-activeLine': { backgroundColor: 'color-mix(in srgb, var(--text) 4%, transparent)' },
    '.cm-activeLineGutter': { backgroundColor: 'color-mix(in srgb, var(--text) 6%, transparent)', color: 'var(--text-soft)' },
    '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground':
      { backgroundColor: 'var(--accent-alpha)' },
    '.cm-matchingBracket': { backgroundColor: 'var(--surface-3)', outline: '1px solid var(--line-strong)' },
    '.cm-placeholder': { color: 'var(--muted-2)' },
    '.cm-tooltip': {
      backgroundColor: 'var(--surface-2)',
      border: '1px solid var(--line-strong)',
      color: 'var(--text)',
    },
    '.cm-tooltip-autocomplete ul li[aria-selected]': {
      backgroundColor: 'var(--selected)',
      color: 'var(--text-strong)',
    },
    '.cm-diagnostic-error': { borderLeftColor: 'var(--red)' },
    '.cm-lintRange-error': {
      backgroundImage: 'none',
      textDecoration: 'underline wavy var(--red)',
      textUnderlineOffset: '3px',
    },
    '.cm-panels': { backgroundColor: 'var(--surface-2)', color: 'var(--text)' },
    '.cm-panels input, .cm-panels button': { fontSize: '12px' },
    '.cm-foldPlaceholder': { backgroundColor: 'var(--surface-3)', border: 'none', color: 'var(--muted)' },
    '.cm-var': { color: 'var(--blue)', backgroundColor: 'color-mix(in srgb, var(--blue) 12%, transparent)', borderRadius: '3px' },
    '.cm-var-missing': {
      color: 'var(--red)',
      textDecoration: 'underline dotted var(--red)',
      textUnderlineOffset: '3px',
    },
  },
  { dark: true }
);

const highlight = HighlightStyle.define([
  { tag: t.propertyName, color: 'var(--code-key)' },
  { tag: t.string, color: 'var(--code-str)' },
  { tag: t.number, color: 'var(--code-num)' },
  { tag: [t.bool, t.null], color: 'var(--code-bool)' },
  { tag: [t.brace, t.squareBracket, t.separator, t.punctuation], color: 'var(--muted)' },
]);

/** Recursos comuns a qualquer editor de código do app. */
export function baseExtensions(): Extension[] {
  return [
    lineNumbers(),
    highlightActiveLineGutter(),
    foldGutter({ markerDOM: (open) => Object.assign(document.createElement('span'), { textContent: open ? '▾' : '▸' }) }),
    history(),
    drawSelection(),
    indentOnInput(),
    bracketMatching(),
    closeBrackets(),
    highlightActiveLine(),
    highlightSelectionMatches(),
    syntaxHighlighting(highlight),
    theme,
    keymap.of([
      ...closeBracketsKeymap,
      ...defaultKeymap,
      ...searchKeymap,
      ...historyKeymap,
      ...foldKeymap,
      ...completionKeymap,
      ...lintKeymap,
      indentWithTab,
    ]),
  ];
}

/** JSON com validação que entende {{variáveis}} (mesma regra do envio). */
export function jsonExtensions(): Extension[] {
  const jsonLinter = linter(
    (view): Diagnostic[] => {
      const text = view.state.doc.toString();
      const error = findJsonError(text);
      if (!error) return [];
      const from = Math.min(error.position, text.length);
      return [{ from, to: Math.min(from + 1, text.length), severity: 'error', message: error.message }];
    },
    { delay: 250 }
  );
  return [json(), jsonLinter, lintGutter()];
}

const VARIABLE = /\{\{\s*([\w.-]+)\s*\}\}/g;

/** Destaca {{variáveis}} (vermelho se não existir no ambiente) e sugere nomes ao digitar "{{". */
export function variableExtensions(names: string[]): Extension[] {
  const known = new Set(names);

  const decorator = new MatchDecorator({
    regexp: VARIABLE,
    decoration: (match) =>
      Decoration.mark({
        class: known.has(match[1]) ? 'cm-var' : 'cm-var-missing',
        attributes: { title: known.has(match[1]) ? 'Variável do ambiente' : 'Variável não definida no ambiente ativo' },
      }),
  });

  const highlighter = ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      constructor(view: EditorView) {
        this.decorations = decorator.createDeco(view);
      }
      update(update: ViewUpdate) {
        this.decorations = decorator.updateDeco(update, this.decorations);
      }
    },
    { decorations: (plugin) => plugin.decorations }
  );

  const completeVariables = (context: CompletionContext) => {
    const before = context.matchBefore(/\{\{[\w.-]*/);
    if (!before || names.length === 0) return null;
    return {
      from: before.from + 2,
      validFor: /^[\w.-]*$/,
      options: names.map((name) => ({
        label: name,
        type: 'variable',
        detail: 'ambiente',
        apply: (view: EditorView, _completion: unknown, from: number, to: number) => {
          // closeBrackets pode já ter inserido "}}" depois do cursor.
          const closed = view.state.sliceDoc(to, to + 2) === '}}';
          const insert = closed ? name : `${name}}}`;
          view.dispatch({
            changes: { from, to, insert },
            selection: { anchor: from + insert.length + (closed ? 2 : 0) },
          });
        },
      })),
    };
  };

  return [highlighter, autocompletion({ override: [completeVariables], icons: false })];
}
