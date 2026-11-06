import { useRef } from 'react';
import { SCRIPT_SNIPPETS } from '../../lib/scripts/snippets';
import type { ScriptPhase } from '../../lib/scripts/types';
import { SCRIPT_TIMEOUT_MS } from '../../services/scriptService';

const HINTS: Record<ScriptPhase, string> = {
  pre: 'Roda antes do envio. Pode alterar pm.request e definir variáveis usadas em {{...}}.',
  post: 'Roda depois da resposta. Use pm.test e pm.expect; os resultados aparecem na aba Testes da resposta.',
};

const PLACEHOLDERS: Record<ScriptPhase, string> = {
  pre: '// Ex.: pm.variables.set("timestamp", Date.now());',
  post: '// Ex.:\n// pm.test("Status é 200", () => {\n//   pm.response.to.have.status(200);\n// });',
};

interface ScriptEditorProps {
  phase: ScriptPhase;
  value: string;
  onChange: (value: string) => void;
}

/** Editor de script pre/post com trechos prontos à direita. */
export function ScriptEditor({ phase, value, onChange }: ScriptEditorProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  /** Insere na posição do cursor; trechos (`block`) ficam em linha própria. */
  const insert = (code: string, block = true) => {
    const textarea = ref.current;
    const at = textarea ? textarea.selectionStart : value.length;
    const before = value.slice(0, at);
    const after = value.slice(at);
    const prefix = block && before && !before.endsWith('\n') ? '\n' : '';
    const suffix = block && after && !after.startsWith('\n') ? '\n' : '';
    const next = `${before}${prefix}${code}${suffix}${after}`;
    onChange(next);

    const cursor = before.length + prefix.length + code.length;
    requestAnimationFrame(() => {
      textarea?.focus();
      textarea?.setSelectionRange(cursor, cursor);
    });
  };

  return (
    <div className="script-editor">
      <div className="script-main">
        <textarea
          ref={ref}
          className="code-input"
          value={value}
          spellCheck={false}
          placeholder={PLACEHOLDERS[phase]}
          aria-label={phase === 'pre' ? 'Script de pré-processamento' : 'Script de pós-processamento'}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            // Tab indenta em vez de sair do campo.
            if (event.key !== 'Tab' || event.shiftKey) return;
            event.preventDefault();
            insert('  ', false);
          }}
        />
        <p className="hint">
          {HINTS[phase]} Roda isolado, sem acesso à rede, com limite de {SCRIPT_TIMEOUT_MS / 1000} s.
        </p>
      </div>

      <aside className="script-snippets" aria-label="Trechos prontos">
        <h4 className="part-heading">Trechos</h4>
        {SCRIPT_SNIPPETS[phase].map((snippet) => (
          <button key={snippet.label} type="button" className="link" onClick={() => insert(snippet.code)}>
            {snippet.label}
          </button>
        ))}
      </aside>
    </div>
  );
}
