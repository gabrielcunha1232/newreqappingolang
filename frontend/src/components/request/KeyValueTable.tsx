import { newKeyValue } from '../../lib/factories';
import type { KeyValue } from '../../types';

interface KeyValueTableProps {
  rows: KeyValue[];
  onChange: (rows: KeyValue[]) => void;
  addLabel: string;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  showDescription?: boolean;
}

export function KeyValueTable({
  rows,
  onChange,
  addLabel,
  keyPlaceholder = 'Nome',
  valuePlaceholder = 'Valor',
  showDescription = true,
}: KeyValueTableProps) {
  const update = (id: string, changes: Partial<KeyValue>) =>
    onChange(rows.map((row) => (row.id === id ? { ...row, ...changes } : row)));

  return (
    <>
      <table className="gridtable">
        <thead>
          <tr>
            <th style={{ width: 35 }} />
            <th>Nome</th>
            <th>Valor</th>
            {showDescription && <th>Descrição</th>}
            <th style={{ width: 32 }} />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
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
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={showDescription ? 5 : 4} className="table-empty">
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
