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

function outcome({ state, result }: RunItem): string {
  if (!result) return STATE_LABEL[state];
  const passed = result.tests.filter((test) => test.passed).length;
  const parts = [
    STATE_LABEL[state],
    result.status ?? 'erro',
    result.timeSpent === null ? '' : `${result.timeSpent} ms`,
    result.tests.length > 0 ? `testes ${passed}/${result.tests.length}` : '',
  ];
  return parts.filter(Boolean).join(' · ');
}

function failureDetails({ result }: RunItem): string[] {
  if (!result) return [];
  return [
    result.error,
    result.scriptError,
    ...result.tests.filter((t) => !t.passed).map((t) => `${t.name}${t.error ? `: ${t.error}` : ''}`),
  ].filter(Boolean);
}

export function CollectionRunnerDialog({ session, controls, onSaveReport }: CollectionRunnerDialogProps) {
  const { items, running, finished, delayMs, stopOnFailure, title } = session;
  const selected = items.filter((item) => item.selected).length;
  const passed = items.filter((item) => item.state === 'passed').length;
  const failed = items.filter((item) => item.state === 'failed').length;

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
          </div>

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
                    <span className={`runner-outcome ${item.state}`}>{outcome(item)}</span>
                  </div>
                  {failureDetails(item).map((detail, index) => (
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
              {finished ? 'Executar de novo' : `Executar ${selected}`}
            </button>
          )}
        </footer>
      </div>
    </Modal>
  );
}
