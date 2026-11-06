import { useMemo, useState } from 'react';
import type { Response } from '../../../bindings/changeme/internal/models/models';
import { formatBytes, statusClass, statusLabel } from '../../lib/format';
import { findTabularData, tryParseJson } from '../../lib/json';
import type { TestResult } from '../../lib/scripts/types';
import { EmptyState } from '../common/EmptyState';
import { DataTable } from './DataTable';
import { JsonCode } from './JsonCode';
import { TestResults } from './TestResults';

type Mode = 'pretty' | 'raw' | 'preview' | 'table' | 'tests';

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
  error: string;
  loading: boolean;
  /** Resultados do pós-processamento; null = a requisição não tem script. */
  tests: TestResult[] | null;
  scriptError: string;
}

export function ResponseViewer({ response, error, loading, tests, scriptError }: ResponseViewerProps) {
  const [selected, setSelected] = useState<Mode>('pretty');
  // Sem script de pós-processamento a aba Testes some; volta para o modo padrão.
  const mode = selected === 'tests' && tests === null ? 'pretty' : selected;
  const failed = tests?.filter((t) => !t.passed).length ?? 0;

  const body = response?.body ?? '';
  const parsed = useMemo(() => tryParseJson(body), [body]);
  const isJson = parsed.ok;
  const pretty = parsed.ok ? JSON.stringify(parsed.value, null, 2) : body;
  const table = parsed.ok ? findTabularData(parsed.value) : null;

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
    if (!body && mode !== 'tests') return <EmptyState icon="∅" title="Corpo vazio" />;

    switch (mode) {
      case 'tests':
        return <TestResults tests={tests ?? []} scriptError={scriptError} />;
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
        {tests !== null && (
          <button
            className={'tests-tab' + (mode === 'tests' ? ' active' : '') + (failed > 0 || scriptError ? ' failing' : ' passing')}
            onClick={() => setSelected('tests')}
          >
            Testes ({tests.length - failed}/{tests.length})
          </button>
        )}
        <span className="spacer" />
        <span className="hint">{isJson ? 'JSON' : 'Texto'} ▾</span>
      </div>
      {renderContent()}
    </div>
  );
}
