import { useMemo, useState } from 'react';
import type { Response } from '../../../bindings/changeme/internal/models/models';
import { formatBytes, statusClass, statusLabel } from '../../lib/format';
import { findTabularData, tryParseJson } from '../../lib/json';
import { MAX_EXAMPLE_BYTES, findExample, withExample, withoutExample } from '../../lib/responseExamples';
import { findResponseSchema, validateAgainstSchema, withEditedSchema, withInferredSchema, type SchemaIssue } from '../../lib/schemaValidation';
import type { TestResult } from '../../lib/scripts/types';
import type { ApiDocMetadata } from '../../types';
import { EmptyState } from '../common/EmptyState';
import { DataTable } from './DataTable';
import { JsonCode } from './JsonCode';
import { ResponseDiff } from './ResponseDiff';
import { ResponseExtract, type ExtractControls } from './ResponseExtract';
import { SchemaEditorDialog } from './SchemaEditorDialog';
import { SchemaValidation } from './SchemaValidation';
import { TestResults } from './TestResults';

type Mode = 'pretty' | 'raw' | 'preview' | 'table' | 'tests' | 'diff' | 'schema' | 'extract';

const MODES: Array<{ id: Mode; label: string }> = [
  { id: 'pretty', label: 'Pretty' },
  { id: 'raw', label: 'Raw' },
  { id: 'preview', label: 'Preview' },
  { id: 'table', label: 'Visualização' },
];

interface ResponseMetaProps {
  response: Response | null;
  loading: boolean;
  onCopy: () => void;
}

/** Status, tempo e tamanho exibidos no cabeçalho do painel. */
export function ResponseMeta({ response, loading, onCopy }: ResponseMetaProps) {
  if (loading) return <span className="hint">Aguardando resposta…</span>;
  if (!response) return null;
  return (
    <>
      <span className={'status ' + statusClass(response.status_code)}>● {statusLabel(response.status_code)}</span>
      <span>{response.time_spent} ms</span>
      <span>{formatBytes(response.size)}</span>
      <button className="icon" onClick={onCopy} title="Copiar corpo da resposta">
        ⧉
      </button>
    </>
  );
}

interface ResponseViewerProps {
  response: Response | null;
  /** Resposta da execução anterior; habilita a comparação. */
  previous: Response | null;
  error: string;
  loading: boolean;
  /** Resultados do pós-processamento; null = a requisição não tem script. */
  tests: TestResult[] | null;
  scriptError: string;
  doc?: ApiDocMetadata;
  onDocChange?: (doc: ApiDocMetadata) => void;
  extract?: ExtractControls;
  restoredAt?: string;
}

interface ExampleButtonProps {
  status: number;
  body: string;
  doc?: ApiDocMetadata;
  onDocChange: (doc: ApiDocMetadata) => void;
}

function ExampleButton({ status, body, doc, onDocChange }: ExampleButtonProps) {
  const current = findExample(doc, status)?.example;
  if (current === body) {
    return (
      <button className="example-saved" title="Remover este exemplo da documentação" onClick={() => onDocChange(withoutExample(doc, status))}>
        ✓ Exemplo {status}
      </button>
    );
  }
  const tooLarge = new Blob([body]).size > MAX_EXAMPLE_BYTES;
  return (
    <button
      disabled={tooLarge}
      title={tooLarge ? 'Respostas acima de 1 MB não podem ser salvas como exemplo' : 'Usar esta resposta como exemplo na documentação'}
      onClick={() => onDocChange(withExample(doc, status, body))}
    >
      {current === undefined ? 'Salvar como exemplo' : `Atualizar exemplo ${status}`}
    </button>
  );
}

export function ResponseViewer({ response, previous, error, loading, tests, scriptError, doc, onDocChange, extract, restoredAt }: ResponseViewerProps) {
  const [selected, setSelected] = useState<Mode>('pretty');
  const [editingSchema, setEditingSchema] = useState(false);
  const failed = tests?.filter((t) => !t.passed).length ?? 0;

  const body = response?.body ?? '';
  const parsed = useMemo(() => tryParseJson(body), [body]);
  const isJson = parsed.ok;
  const pretty = parsed.ok ? JSON.stringify(parsed.value, null, 2) : body;
  const table = parsed.ok ? findTabularData(parsed.value) : null;

  const declared = response ? findResponseSchema(doc, response.status_code) : undefined;
  const issues = useMemo<SchemaIssue[]>(() => {
    if (!declared?.schema) return [];
    if (!parsed.ok) return [{ path: '$', message: 'a resposta não é JSON válido' }];
    return validateAgainstSchema(parsed.value, declared.schema);
  }, [declared, parsed]);
  const hasSchemaTab = Boolean(declared) || (isJson && Boolean(onDocChange));
  const hasExtractTab = isJson && Boolean(extract);

  // Sem script de pós-processamento a aba Testes some; volta para o modo padrão.
  const mode =
    (selected === 'tests' && tests === null) || (selected === 'diff' && !previous) || (selected === 'schema' && !hasSchemaTab) || (selected === 'extract' && !hasExtractTab)
      ? 'pretty'
      : selected;

  const generateSchema = () => {
    if (response && parsed.ok && onDocChange) onDocChange(withInferredSchema(doc, response.status_code, parsed.value));
  };

  if (loading) {
    return <EmptyState icon="⏳" title="Enviando requisição…" />;
  }

  if (!response) {
    return error ? (
      <EmptyState icon="⚠" title="A requisição falhou">
        {error}
      </EmptyState>
    ) : (
      <EmptyState icon="▣" title="Sem resposta ainda">
        Envie uma requisição para ver a resposta aqui.
      </EmptyState>
    );
  }

  const renderContent = () => {
    if (!body && mode !== 'tests' && mode !== 'diff' && mode !== 'schema') return <EmptyState icon="∅" title="Corpo vazio" />;

    switch (mode) {
      case 'schema':
        return (
          <SchemaValidation
            declared={declared}
            issues={issues}
            canGenerate={isJson && Boolean(onDocChange)}
            onGenerate={generateSchema}
            onEdit={onDocChange && declared ? () => setEditingSchema(true) : undefined}
          />
        );
      case 'extract':
        return parsed.ok && extract ? <ResponseExtract value={parsed.value} controls={extract} /> : null;
      case 'tests':
        return <TestResults tests={tests ?? []} scriptError={scriptError} />;
      case 'diff':
        return previous && <ResponseDiff previous={previous} current={response} />;
      case 'raw':
        return <JsonCode text={body} highlight={false} />;
      case 'preview':
        return (
          <iframe
            className="html-preview"
            title="Preview da resposta"
            sandbox=""
            srcDoc={isJson ? `<pre>${pretty.replace(/[&<>]/g, (c) => `&#${c.charCodeAt(0)};`)}</pre>` : body}
          />
        );
      case 'table':
        return table ? (
          <DataTable rows={table} />
        ) : (
          <EmptyState icon="▦" title="Sem dados tabulares">
            A visualização em tabela funciona para respostas JSON com listas de objetos.
          </EmptyState>
        );
      default:
        return (
          <div className={'response-content' + (table ? ' split' : '')}>
            <JsonCode text={pretty} highlight={isJson} />
            {table && <DataTable rows={table} />}
          </div>
        );
    }
  };

  return (
    <div className="response-viewer">
      <div className="response-toolbar">
        {MODES.map((m) => (
          <button key={m.id} className={mode === m.id ? 'active' : ''} onClick={() => setSelected(m.id)}>
            {m.label}
          </button>
        ))}
        {hasExtractTab && (
          <button className={mode === 'extract' ? 'active' : ''} onClick={() => setSelected('extract')}>
            Extrair{extract?.rules.length ? ` (${extract.rules.length})` : ''}
          </button>
        )}
        {previous && (
          <button className={mode === 'diff' ? 'active' : ''} onClick={() => setSelected('diff')}>
            Comparar
          </button>
        )}
        {tests !== null && (
          <button
            className={'tests-tab' + (mode === 'tests' ? ' active' : '') + (failed > 0 || scriptError ? ' failing' : ' passing')}
            onClick={() => setSelected('tests')}
          >
            Testes ({tests.length - failed}/{tests.length})
          </button>
        )}
        {hasSchemaTab && (
          <button
            className={'tests-tab' + (mode === 'schema' ? ' active' : '') + (declared ? (issues.length > 0 ? ' failing' : ' passing') : '')}
            onClick={() => setSelected('schema')}
          >
            {declared ? (issues.length > 0 ? `Schema (${issues.length})` : 'Schema ✓') : 'Schema'}
          </button>
        )}
        <span className="spacer" />
        {restoredAt && <span className="hint">Salva em {new Date(restoredAt).toLocaleString('pt-BR')}</span>}
        {onDocChange && body && <ExampleButton status={response.status_code} body={body} doc={doc} onDocChange={onDocChange} />}
        <span className="hint">{isJson ? 'JSON' : 'Texto'} ▾</span>
      </div>
      {renderContent()}
      {editingSchema && declared?.schema && onDocChange && (
        <SchemaEditorDialog
          status={declared.status}
          schema={declared.schema}
          onSave={(schema) => onDocChange(withEditedSchema(doc, declared.status, schema))}
          onClose={() => setEditingSchema(false)}
        />
      )}
    </div>
  );
}
