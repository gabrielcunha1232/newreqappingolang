import { cellText } from '../../lib/json';

const MAX_ROWS = 200;

interface DataTableProps {
  rows: Record<string, unknown>[];
}

export function DataTable({ rows }: DataTableProps) {
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];

  return (
    <div className="preview">
      <h4>Visualização　▦</h4>
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <td key={column} className="th">
                {column}
              </td>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, MAX_ROWS).map((row, index) => (
            <tr key={index}>
              {columns.map((column) => (
                <td key={column} title={cellText(row[column])}>
                  {cellText(row[column])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > MAX_ROWS && <p className="hint pad">Mostrando {MAX_ROWS} de {rows.length} linhas.</p>}
    </div>
  );
}
