import { useState } from 'react';
import { newKeyValue } from '../../lib/factories';
import type { KeyValue } from '../../types';
import { Icon } from '../common/Icon';

interface KeyValueTableProps {
  rows: KeyValue[];
  onChange: (rows: KeyValue[]) => void;
  addLabel: string;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  showDescription?: boolean;
  allowSecret?: boolean;
}

export function KeyValueTable({
  rows,
  onChange,
  addLabel,
  keyPlaceholder = 'Nome',
  valuePlaceholder = 'Valor',
  showDescription = true,
  allowSecret = false,
}: KeyValueTableProps) {
  const [revealed, setRevealed] = useState<ReadonlySet<string>>(new Set());

  const update = (id: string, changes: Partial<KeyValue>) =>
    onChange(rows.map((row) => (row.id === id ? { ...row, ...changes } : row)));

  const setReveal = (id: string, visible: boolean) =>
    setRevealed((current) => {
      const next = new Set(current);
      if (visible) next.add(id);
      else next.delete(id);
      return next;
    });

  const columns = 4 + Number(showDescription) + Number(allowSecret);

  return (
    <>
      <table className="gridtable">
        <thead>
          <tr>
            <th style={{ width: 35 }} />
            <th>Nome</th>
            <th>Valor</th>
            {showDescription && <th>Descrição</th>}
            {allowSecret && <th style={{ width: 64 }} />}
            <th style={{ width: 32 }} />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const masked = Boolean(allowSecret && row.secret && !revealed.has(row.id));
            return (
              <tr key={row.id} className={row.enabled ? '' : 'disabled'}>
                <td className="center">
                  <input
                    type="checkbox"
                    checked={row.enabled}
                    onChange={(event) => update(row.id, { enabled: event.target.checked })}
                    aria-label="Habilitar linha"
                  />
                </td>
                <td>
                  <input
                    value={row.key}
                    placeholder={keyPlaceholder}
                    onChange={(event) => update(row.id, { key: event.target.value })}
                  />
                </td>
                <td>
                  <input
                    type={masked ? 'password' : 'text'}
                    autoComplete="off"
                    value={row.value}
                    placeholder={valuePlaceholder}
                    onChange={(event) => update(row.id, { value: event.target.value })}
                  />
                </td>
                {showDescription && (
                  <td>
                    <input
                      value={row.description}
                      placeholder="Descrição"
                      onChange={(event) => update(row.id, { description: event.target.value })}
                    />
                  </td>
                )}
                {allowSecret && (
                  <td className="center secret-tools">
                    <button
                      type="button"
                      className={'row-tool' + (row.secret ? ' on' : '')}
                      aria-pressed={Boolean(row.secret)}
                      aria-label="Marcar como secreta"
                      title={row.secret ? 'Secreta: clique para deixar visível' : 'Marcar como secreta'}
                      onClick={() => {
                        setReveal(row.id, false);
                        update(row.id, { secret: !row.secret });
                      }}
                    >
                      <Icon name={row.secret ? 'lock' : 'lock-open'} size={14} />
                    </button>
                    {row.secret && (
                      <button
                        type="button"
                        className="row-tool"
                        aria-pressed={!masked}
                        aria-label="Mostrar valor"
                        title={masked ? 'Mostrar valor' : 'Ocultar valor'}
                        onClick={() => setReveal(row.id, masked)}
                      >
                        <Icon name={masked ? 'eye' : 'eye-off'} size={14} />
                      </button>
                    )}
                  </td>
                )}
                <td className="center">
                  <button
                    type="button"
                    className="row-remove"
                    onClick={() => onChange(rows.filter((r) => r.id !== row.id))}
                    aria-label="Remover linha"
                  >
                    ×
                  </button>
                </td>
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns} className="table-empty">
                Nenhum item.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <button type="button" className="addrow" onClick={() => onChange([...rows, newKeyValue()])}>
        ＋ {addLabel}
      </button>
    </>
  );
}
