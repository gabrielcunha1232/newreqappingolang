import { useEffect, useRef } from 'react';
import { Compartment, EditorState, Prec } from '@codemirror/state';
import { EditorView, keymap, placeholder as placeholderExt } from '@codemirror/view';
import { baseExtensions, jsonExtensions, variableExtensions } from './editorExtensions';

export type EditorLanguage = 'json' | 'text';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: EditorLanguage;
  /** Nomes das variáveis do ambiente ativo (destaque e autocompletar). */
  variableNames?: string[];
  placeholder?: string;
  ariaLabel?: string;
  /** Atalho Shift+Alt+F. */
  onFormat?: () => void;
}

/** Editor CodeMirror controlado pelo React (value/onChange). */
export function CodeEditor({
  value,
  onChange,
  language,
  variableNames = [],
  placeholder = '',
  ariaLabel,
  onFormat,
}: CodeEditorProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const callbacks = useRef({ onChange, onFormat });
  callbacks.current = { onChange, onFormat };
  const compartments = useRef({ language: new Compartment(), variables: new Compartment(), placeholder: new Compartment() });

  // Cria o editor uma única vez; as partes que mudam são reconfiguradas abaixo.
  useEffect(() => {
    const c = compartments.current;
    const view = new EditorView({
      parent: hostRef.current!,
      state: EditorState.create({
        doc: value,
        extensions: [
          baseExtensions(),
          c.language.of(language === 'json' ? jsonExtensions() : []),
          c.variables.of(variableExtensions(variableNames)),
          c.placeholder.of(placeholderExt(placeholder)),
          Prec.highest(
            keymap.of([
              {
                key: 'Shift-Alt-f',
                run: () => {
                  callbacks.current.onFormat?.();
                  return true;
                },
              },
              // Ctrl+Enter envia a requisição (tratado pelo painel); não insere linha.
              { key: 'Mod-Enter', run: () => true },
            ])
          ),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) callbacks.current.onChange(update.state.doc.toString());
          }),
          EditorView.contentAttributes.of(ariaLabel ? { 'aria-label': ariaLabel } : {}),
        ],
      }),
    });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  // Valor alterado por fora (formatar, trocar de requisição).
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== value) {
      view.dispatch({ changes: { from: 0, to: current.length, insert: value } });
    }
  }, [value]);

  useEffect(() => {
    viewRef.current?.dispatch({
      effects: compartments.current.language.reconfigure(language === 'json' ? jsonExtensions() : []),
    });
  }, [language]);

  const variableKey = variableNames.join('\n');
  useEffect(() => {
    viewRef.current?.dispatch({
      effects: compartments.current.variables.reconfigure(variableExtensions(variableNames)),
    });
  }, [variableKey]);

  useEffect(() => {
    viewRef.current?.dispatch({ effects: compartments.current.placeholder.reconfigure(placeholderExt(placeholder)) });
  }, [placeholder]);

  return <div className="code-editor" ref={hostRef} />;
}
