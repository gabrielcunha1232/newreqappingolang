import { useState } from 'react';
import type { EnvironmentActions } from '../../hooks/useEnvironments';
import type { Environment } from '../../types';
import { InlineInput } from '../common/InlineInput';
import { KeyValueTable } from '../request/KeyValueTable';

const NONE = '';

interface EnvironmentEditorProps {
  environments: Environment[];
  active: Environment | null;
  actions: EnvironmentActions;
}

export function EnvironmentEditor({ environments, active, actions }: EnvironmentEditorProps) {
  const [mode, setMode] = useState<'view' | 'manage' | 'create' | 'rename'>('view');

  return (
    <div className="env-editor">
      {mode === 'create' || mode === 'rename' ? (
        <InlineInput
          className="env-select"
          initialValue={mode === 'rename' ? active?.name : ''}
          placeholder="Nome do ambiente"
          ariaLabel="Nome do ambiente"
          onCommit={(value) => {
            if (mode === 'create') actions.create(value);
            else if (active) actions.rename(active.id, value);
            setMode('view');
          }}
          onCancel={() => setMode('view')}
        />
      ) : (
        <select
          className="env-select"
          aria-label="Ambiente ativo"
          value={active?.id ?? NONE}
          onChange={(event) => actions.select(event.target.value || null)}
        >
          <option value={NONE}>⚪ Nenhum ambiente</option>
          {environments.map((env) => (
            <option key={env.id} value={env.id}>
              🟢 {env.name}
            </option>
          ))}
        </select>
      )}

      <div className="env-heading">
        Variáveis
        <button className="link" onClick={() => setMode(mode === 'manage' ? 'view' : 'manage')}>
          {mode === 'manage' ? 'Concluir' : 'Gerenciar ›'}
        </button>
      </div>

      {mode === 'manage' && (
        <div className="env-manage">
          <button onClick={() => setMode('create')}>＋ Novo</button>
          <button onClick={() => setMode('rename')} disabled={!active}>
            Renomear
          </button>
          <button className="danger" onClick={() => active && actions.remove(active.id)} disabled={!active}>
            Excluir
          </button>
        </div>
      )}

      {active ? (
        <KeyValueTable
          rows={active.variables}
          onChange={(variables) => actions.setVariables(active.id, variables)}
          addLabel="Nova variável"
          keyPlaceholder="nova variável"
          valuePlaceholder="valor"
          showDescription={false}
          allowSecret
        />
      ) : (
        <p className="hint">Selecione ou crie um ambiente para definir variáveis usadas como {'{{nome}}'}.</p>
      )}
    </div>
  );
}
