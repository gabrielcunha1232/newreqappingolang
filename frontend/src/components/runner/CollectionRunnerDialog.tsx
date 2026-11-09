import { useState, type ChangeEvent } from 'react';
import { parseRunnerData } from '../../lib/runnerData';
import {
  runnerReport,
  type CollectionRunnerControls,
  type RunItem,
  type RunnerSession,
} from '../../hooks/useCollectionRunner';
import { MethodBadge } from '../common/MethodBadge';
import { Modal } from '../common/Modal';

interface CollectionRunnerDialogProps {
  session: RunnerSession;
  controls: CollectionRunnerControls;
  onSaveReport: (report: string) => void;
}

const STATE_LABEL: Record<RunItem['state'], string> = {
  pending: '',
  running: 'Executando…',
  passed: '✓',
  failed: '✗',
  skipped: 'Ignorada',
};

const MAX_DATA_BYTES = 20 * 1024 * 1024;

function outcome({ state, result, runs }: RunItem, multiple: boolean): string {
  if (!result) return STATE_LABEL[state];
  if (multiple) return [STATE_LABEL[state], `${runs.filter((run) => run.passed).length}/${runs.length} linhas`].filter(Boolean).join(' · ');
  const passed = result.tests.filter((test) => test.passed).length;
  const parts = [
    STATE_LABEL[state],
    result.status ?? 'erro',
    result.timeSpent === null ? '' : `${result.timeSpent} ms`,
    result.tests.length > 0 ? `testes ${passed}/${result.tests.length}` : '',
  ];
  return parts.filter(Boolean).join(' · ');
}

function failureDetails({ runs }: RunItem, multiple: boolean): string[] {
  return runs.flatMap(({ iteration, passed, result }) => {
    if (passed) return [];
    const details = [
      result.error,
      result.scriptError,
      ...result.tests.filter((t) => !t.passed).map((t) => `${t.name}${t.error ? `: ${t.error}` : ''}`),
      ...(result.tests.length === 0 && !result.error && !result.scriptError && multiple ? [`Status ${result.status}`] : []),
    ].filter(Boolean);
    return multiple ? details.map((detail) => `Linha ${iteration + 1}: ${detail}`) : details;
  });
}

export function CollectionRunnerDialog({ session, controls, onSaveReport }: CollectionRunnerDialogProps) {
  const { items, running, finished, delayMs, stopOnFailure, title, data } = session;
  const [dataError, setDataError] = useState('');
  const selected = items.filter((item) => item.selected).length;
  const runs = items.flatMap((item) => item.runs);
  const passed = runs.filter((run) => run.passed).length;
  const failed = runs.length - passed;
  const multiple = Boolean(data);

  const chooseData = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const file = input.files?.[0];
    if (!file) return;
    setDataError('');
    try {
      if (file.size > MAX_DATA_BYTES) throw new Error('Arquivo maior que 20 MB.');
      controls.setOptions({ data: parseRunnerData(await file.text(), file.name) });
    } catch (err) {
      controls.setOptions({ data: null });
      setDataError(err instanceof Error ? err.message : String(err));
    }
    input.value = '';
  };

  return (
    <Modal title={`Executar: ${title}`} width={680} onClose={controls.close}>
      <div className="modal-form">
        <div className="modal-body">
          <div className="runner-options">
            <label>
              Intervalo (ms)
              <input
                type="number"
                min={0}
                step={100}
                value={delayMs}
                disabled={running}
                onChange={(event) => controls.setOptions({ delayMs: Math.max(0, Number(event.target.value) || 0) })}
              />
            </label>
            <label>
              <input
                type="checkbox"
                checked={stopOnFailure}
                disabled={running}
                onChange={(event) => controls.setOptions({ stopOnFailure: event.target.checked })}
              />
              Parar na primeira falha
            </label>
            <label>
              Dados (CSV/JSON)
              <input type="file" accept=".csv,.tsv,.txt,.json,text/csv,application/json" disabled={running} onChange={chooseData} />
            </label>
          </div>

          {data && (
            <p className="runner-data">
              <span>
                <strong>{data.fileName}</strong>: {data.rows.length} linha(s). Use como {'{{variável}}'}:{' '}
                <code>{data.columns.join(', ')}</code>
              </span>
              <button type="button" className="link" disabled={running} onClick={() => controls.setOptions({ data: null })}>
                Remover
              </button>
            </p>
          )}

          {dataError && (
            <div className="inline-error" role="alert">
              ⚠ {dataError}
            </div>
          )}

          {finished && (
            <p className="runner-summary" role="status">
              {passed} aprovada(s), {failed} com falha
            </p>
          )}

          {items.length === 0 ? (
            <p className="hint">Não há requisições para executar aqui.</p>
          ) : (
            <ul className="runner-list">
              {items.map((item) => (
                <li key={item.request.id} className="runner-item">
                  <div className="runner-row">
                    <input
                      type="checkbox"
                      aria-label={`Incluir ${item.request.title}`}
                      checked={item.selected}
                      disabled={running}
                      onChange={() => controls.toggle(item.request.id)}
                    />
                    <MethodBadge method={item.request.method} />
                    <span className="runner-title" title={item.request.title}>
                      {item.request.title}
                    </span>
                    <span className={`runner-outcome ${item.state}`}>{outcome(item, multiple)}</span>
                  </div>
                  {failureDetails(item, multiple).map((detail, index) => (
                    <p key={index} className="runner-detail">
                      {detail}
                    </p>
                  ))}
                </li>
              ))}
            </ul>
          )}

          <p className="hint">
            As variáveis alteradas por scripts passam para a próxima requisição. "Parar" espera terminar a requisição em
            andamento.
          </p>
        </div>

        <footer className="modal-foot">
          {finished && (
            <button type="button" onClick={() => onSaveReport(runnerReport(session))}>
              Salvar relatório
            </button>
          )}
          <button type="button" onClick={controls.close}>
            Fechar
          </button>
          {running ? (
            <button type="button" className="primary" onClick={controls.stop}>
              Parar
            </button>
          ) : (
            <button type="button" className="primary" disabled={selected === 0} onClick={() => void controls.start()}>
              {finished ? 'Executar de novo' : data ? `Executar ${selected} × ${data.rows.length} linhas` : `Executar ${selected}`}
            </button>
          )}
        </footer>
      </div>
    </Modal>
  );
}
