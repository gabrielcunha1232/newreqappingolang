import { useMemo, useState } from 'react';
import { flattenJson } from '../../lib/extractions';
import type { ResponseExtraction } from '../../types';
import { InlineInput } from '../common/InlineInput';

export interface ExtractControls {
  rules: ResponseExtraction[];
  hasEnvironment: boolean;
  onAdd: (path: string, variable: string, value: string) => void;
  onRemove: (id: string) => void;
}

export function ResponseExtract({ value, controls }: { value: unknown; controls: ExtractControls }) {
  const { rules, hasEnvironment, onAdd, onRemove } = controls;
  const [term, setTerm] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const leaves = useMemo(() => flattenJson(value), [value]);
  const needle = term.trim().toLowerCase();
  const visible = needle ? leaves.filter((leaf) => leaf.path.toLowerCase().includes(needle)) : leaves;

  return (
    <div className="response-extract">
      {!hasEnvironment && <p className="inline-error">Ative um ambiente para guardar as variáveis extraídas.</p>}

      {rules.length > 0 && (
        <ul className="extract-rules" aria-label="Extrações ativas">
          {rules.map((rule) => (
            <li key={rule.id}>
              <code>{rule.path}</code>
              <span className="muted">→</span>
              <code>{`{{${rule.variable}}}`}</code>
              <button type="button" className="row-remove" aria-label={`Remover extração de ${rule.path}`} onClick={() => onRemove(rule.id)}>
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <input placeholder="Filtrar campos" aria-label="Filtrar campos da resposta" value={term} onChange={(event) => setTerm(event.target.value)} />

      <ul className="extract-list">
        {visible.map((leaf) => (
          <li key={leaf.path}>
            <code className="extract-path" title={leaf.path}>
              {leaf.path}
            </code>
            <span className="extract-value" title={leaf.value}>
              {leaf.value}
            </span>
            {editing === leaf.path ? (
              <InlineInput
                className="extract-name"
                initialValue={leaf.variable}
                placeholder="variável"
                ariaLabel={`Nome da variável para ${leaf.path}`}
                onCommit={(name) => {
                  if (name.trim()) onAdd(leaf.path, name.trim(), leaf.value);
                  setEditing(null);
                }}
                onCancel={() => setEditing(null)}
              />
            ) : (
              <button type="button" disabled={!hasEnvironment} onClick={() => setEditing(leaf.path)}>
                Extrair
              </button>
            )}
          </li>
        ))}
        {visible.length === 0 && <li className="muted">Nenhum campo encontrado.</li>}
      </ul>
    </div>
  );
}
