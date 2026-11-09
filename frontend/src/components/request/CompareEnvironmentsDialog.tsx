import { useState } from 'react';
import type { CompareSide } from '../../hooks/useEnvironmentCompare';
import { statusLabel } from '../../lib/format';
import type { Environment, SavedRequest } from '../../types';
import { MethodBadge } from '../common/MethodBadge';
import { Modal } from '../common/Modal';
import { ResponseDiff } from '../response/ResponseDiff';

interface CompareEnvironmentsDialogProps {
  request: SavedRequest;
  environments: Environment[];
  activeId: string | null;
  onRun: (request: SavedRequest, left: Environment, right: Environment) => Promise<[CompareSide, CompareSide]>;
  onClose: () => void;
}

function SideSummary({ name, side }: { name: string; side: CompareSide }) {
  return (
    <div className="compare-side">
      <strong>{name}</strong>
      <span>{side.response ? `${statusLabel(side.response.status_code)} · ${side.response.time_spent} ms` : 'Falhou'}</span>
      {side.error && <span className="inline-error">{side.error}</span>}
      {side.warnings.map((warning) => (
        <span key={warning} className="hint">
          {warning}
        </span>
      ))}
    </div>
  );
}

export function CompareEnvironmentsDialog({ request, environments, activeId, onRun, onClose }: CompareEnvironmentsDialogProps) {
  const initialLeft = environments.find((e) => e.id === activeId) ?? environments[0];
  const [leftId, setLeftId] = useState(initialLeft?.id ?? '');
  const [rightId, setRightId] = useState(environments.find((e) => e.id !== initialLeft?.id)?.id ?? '');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ left: string; right: string; sides: [CompareSide, CompareSide] } | null>(null);

  const left = environments.find((e) => e.id === leftId);
  const right = environments.find((e) => e.id === rightId);
  const unsafe = !['GET', 'HEAD', 'OPTIONS'].includes(request.method.toUpperCase());

  const run = async () => {
    if (!left || !right) return;
    setBusy(true);
    const sides = await onRun(request, left, right);
    setResult({ left: left.name, right: right.name, sides });
    setBusy(false);
  };

  const selector = (label: string, value: string, onChange: (id: string) => void) => (
    <label>
      {label}
      <select value={value} disabled={busy} onChange={(event) => onChange(event.target.value)}>
        {environments.map((environment) => (
          <option key={environment.id} value={environment.id}>
            {environment.name}
          </option>
        ))}
      </select>
    </label>
  );

  const [first, second] = result?.sides ?? [];

  return (
    <Modal title="Comparar ambientes" width={760} onClose={onClose}>
      <div className="modal-form">
        <div className="modal-body">
          <p className="compare-request">
            <MethodBadge method={request.method} /> <span>{request.title}</span>
          </p>

          {environments.length < 2 ? (
            <p className="hint">Crie pelo menos dois ambientes para comparar.</p>
          ) : (
            <div className="runner-options">
              {selector('De', leftId, setLeftId)}
              {selector('Para', rightId, setRightId)}
            </div>
          )}

          {unsafe && (
            <div className="inline-error" role="alert">
              ⚠ Este {request.method.toUpperCase()} será executado de verdade nos dois ambientes.
            </div>
          )}

          {result && first && second && (
            <>
              <div className="compare-sides">
                <SideSummary name={result.left} side={first} />
                <SideSummary name={result.right} side={second} />
              </div>
              {first.response && second.response && <ResponseDiff previous={first.response} current={second.response} />}
            </>
          )}

          <p className="hint">Scripts não são executados nesta comparação, e nada é gravado no histórico nem nos ambientes.</p>
        </div>

        <footer className="modal-foot">
          <button type="button" onClick={onClose}>
            Fechar
          </button>
          <button type="button" className="primary" disabled={busy || !left || !right || leftId === rightId} onClick={() => void run()}>
            {busy ? 'Enviando…' : result ? 'Comparar de novo' : 'Comparar'}
          </button>
        </footer>
      </div>
    </Modal>
  );
}
