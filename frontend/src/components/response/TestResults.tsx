import type { TestResult } from '../../lib/scripts/types';
import { EmptyState } from '../common/EmptyState';

interface TestResultsProps {
  tests: TestResult[];
  /** Erro que interrompeu o script de pós-processamento. */
  scriptError: string;
}

/** Resultado do pm.test de cada teste do pós-processamento. */
export function TestResults({ tests, scriptError }: TestResultsProps) {
  const passed = tests.filter((t) => t.passed).length;

  return (
    <div className="test-results">
      {scriptError && (
        <div className="inline-error" role="alert">
          ⚠ {scriptError}
        </div>
      )}

      {tests.length === 0 ? (
        !scriptError && (
          <EmptyState icon="✓" title="Nenhum teste">
            O script de pós-processamento rodou, mas não chamou pm.test.
          </EmptyState>
        )
      ) : (
        <>
          <p className={'test-summary ' + (passed === tests.length ? 'all-passed' : 'has-failures')}>
            {passed} de {tests.length} teste{tests.length === 1 ? '' : 's'} passaram
          </p>
          <ul className="test-list">
            {tests.map((test, index) => (
              <li key={index} className={test.passed ? 'passed' : 'failed'}>
                <span className="test-icon" aria-label={test.passed ? 'passou' : 'falhou'}>
                  {test.passed ? '✓' : '✗'}
                </span>
                <span className="test-name">{test.name}</span>
                {test.error && <span className="test-error">{test.error}</span>}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
