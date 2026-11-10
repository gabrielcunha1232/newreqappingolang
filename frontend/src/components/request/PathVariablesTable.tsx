import type { PathParamInfo } from '../../lib/pathTemplate';

interface PathVariablesTableProps {
  params: PathParamInfo[];
  values: Record<string, string>;
  descriptions: Record<string, string | undefined>;
  onChange: (values: Record<string, string>) => void;
}

export function PathVariablesTable({ params, values, descriptions, onChange }: PathVariablesTableProps) {
  return (
    <table className="gridtable path-variables">
      <thead>
        <tr>
          <th style={{ width: '28%' }}>Variável</th>
          <th>Valor</th>
          <th style={{ width: '34%' }}>Descrição</th>
        </tr>
      </thead>
      <tbody>
        {params.map((param) => {
          const value = values[param.name] ?? '';
          const missing = !value.trim() && !param.optional;
          return (
            <tr key={param.name}>
              <td className="path-variable-name">
                <code>{param.name}</code>
                {param.optional && <span className="muted"> (opcional)</span>}
              </td>
              <td>
                <input
                  value={value}
                  placeholder={param.wildcard ? 'resto/do/caminho' : 'Valor ou {{variavel}}'}
                  aria-label={`Valor de ${param.name}`}
                  aria-invalid={missing}
                  onChange={(event) => onChange({ ...values, [param.name]: event.target.value })}
                />
              </td>
              <td className={descriptions[param.name] ? 'path-variable-desc' : 'path-variable-desc muted'}>
                {descriptions[param.name] ?? (param.wildcard ? 'Curinga: casa com o restante do caminho.' : '—')}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
