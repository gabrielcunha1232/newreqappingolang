import { MAX_SCHEMA_ISSUES, type SchemaIssue } from '../../lib/schemaValidation';
import type { ApiResponseDoc } from '../../types';
import { EmptyState } from '../common/EmptyState';

interface SchemaValidationProps {
  declared: ApiResponseDoc | undefined;
  issues: SchemaIssue[];
  canGenerate: boolean;
  onGenerate: () => void;
  onEdit?: () => void;
}

export function SchemaValidation({ declared, issues, canGenerate, onGenerate, onEdit }: SchemaValidationProps) {
  if (!declared) {
    return (
      <EmptyState icon="{ }" title="Sem schema para este status">
        Gere um schema a partir desta resposta para detectar mudanças de tipo nas próximas execuções.{' '}
        {canGenerate && (
          <button className="link" onClick={onGenerate}>
            Gerar schema
          </button>
        )}
      </EmptyState>
    );
  }

  const visible = issues.slice(0, MAX_SCHEMA_ISSUES);

  return (
    <div className="test-results">
      <p className={'test-summary ' + (issues.length === 0 ? 'all-passed' : 'has-failures')}>
        {issues.length === 0
          ? 'A resposta está de acordo com o schema'
          : `${issues.length} divergência${issues.length === 1 ? '' : 's'} em relação ao schema`}
      </p>
      <p className="hint">
        Schema {declared.schemaInferred ? 'gerado de uma resposta anterior' : 'declarado na documentação'} para o status{' '}
        {declared.status}.{' '}
        {declared.schemaInferred && canGenerate && (
          <button className="link" onClick={onGenerate}>
            Gerar novamente desta resposta
          </button>
        )}{' '}
        {onEdit && (
          <button className="link" onClick={onEdit}>
            Editar schema
          </button>
        )}
      </p>
      {visible.length > 0 && (
        <ul className="test-list">
          {visible.map((issue, index) => (
            <li key={index} className="failed">
              <span className="test-icon" aria-label="divergência">
                ✗
              </span>
              <code className="test-name">{issue.path}</code>
              <span className="test-error">{issue.message}</span>
            </li>
          ))}
        </ul>
      )}
      {issues.length > visible.length && <p className="hint">Mostrando as primeiras {visible.length}.</p>}
    </div>
  );
}
