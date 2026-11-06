import type { ApiParam, ApiParamLocation } from '../../types';

const LOCATION_LABELS: Record<ApiParamLocation, string> = {
  path: 'caminho',
  query: 'query',
  header: 'cabeçalho',
};

interface ParamsTableProps {
  params: ApiParam[];
}

/** Tabela somente leitura de parâmetros, no formato do Swagger UI. */
export function ParamsTable({ params }: ParamsTableProps) {
  return (
    <table className="gridtable docs-params">
      <thead>
        <tr>
          <th>Nome</th>
          <th>Local</th>
          <th>Descrição</th>
          <th>Exemplo</th>
        </tr>
      </thead>
      <tbody>
        {params.map((param) => (
          <tr key={`${param.in}:${param.name}`}>
            <td>
              <code className="docs-param-name">{param.name}</code>
              {param.required && (
                <span className="docs-required" title="Obrigatório">
                  *
                </span>
              )}
              {param.type && <div className="docs-param-type">{param.type}</div>}
            </td>
            <td className="docs-param-in">{LOCATION_LABELS[param.in]}</td>
            <td className={param.description ? '' : 'muted'}>{param.description ?? '—'}</td>
            <td>{param.example ? <code>{param.example}</code> : <span className="muted">—</span>}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
