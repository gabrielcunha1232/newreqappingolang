import { useMemo } from 'react';
import type { Response } from '../../../bindings/changeme/internal/models/models';
import { diffLines } from '../../lib/diff';
import { statusLabel } from '../../lib/format';
import { tryParseJson } from '../../lib/json';
import { EmptyState } from '../common/EmptyState';

function normalized(body: string): string {
  const parsed = tryParseJson(body);
  return parsed.ok ? JSON.stringify(parsed.value, null, 2) : body;
}

const PREFIX = { same: '  ', added: '+ ', removed: '- ' } as const;

export function ResponseDiff({ previous, current }: { previous: Response; current: Response }) {
  const lines = useMemo(() => diffLines(normalized(previous.body), normalized(current.body)), [previous, current]);
  const added = lines?.filter((l) => l.kind === 'added').length ?? 0;
  const removed = lines?.filter((l) => l.kind === 'removed').length ?? 0;

  return (
    <div className="response-diff">
      <div className="diff-summary">
        <span>
          Status: {statusLabel(previous.status_code)} → {statusLabel(current.status_code)}
        </span>
        <span>
          Tempo: {previous.time_spent} ms → {current.time_spent} ms
        </span>
        {lines && <span>+{added} / −{removed} linhas</span>}
      </div>
      {!lines ? (
        <EmptyState icon="≠" title="Respostas grandes demais para comparar" />
      ) : added === 0 && removed === 0 ? (
        <EmptyState icon="=" title="Os corpos são idênticos" />
      ) : (
        <pre className="diff-lines">
          {lines.map((line, index) => (
            <span key={index} className={`diff-line ${line.kind}`}>
              {PREFIX[line.kind]}
              {line.text}
            </span>
          ))}
        </pre>
      )}
    </div>
  );
}
