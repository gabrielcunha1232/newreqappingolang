import { useState } from 'react';
import { CODE_TARGETS, generateCode, type CodeTarget } from '../../lib/codegen';
import type { CurlSource } from '../../lib/curl/toCurl';
import { Modal } from '../common/Modal';

interface GenerateCodeDialogProps {
  source: CurlSource;
  onClose: () => void;
  onCopy: (code: string) => void;
}

export function GenerateCodeDialog({ source, onClose, onCopy }: GenerateCodeDialogProps) {
  const [target, setTarget] = useState<CodeTarget>('fetch');
  const code = generateCode(target, source);

  return (
    <Modal title="Gerar código" width={720} onClose={onClose}>
      <div className="modal-form">
        <div className="modal-body">
          <div className="segmented" role="radiogroup" aria-label="Linguagem">
            {CODE_TARGETS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={target === item.id}
                className={target === item.id ? 'active' : ''}
                onClick={() => setTarget(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <textarea className="code-input codegen-output" aria-label="Código gerado" readOnly spellCheck={false} value={code} />
          <p className="hint">O código inclui os valores reais das variáveis e credenciais. Cuidado ao compartilhar.</p>
        </div>
        <footer className="modal-foot">
          <button type="button" onClick={onClose}>
            Fechar
          </button>
          <button type="button" className="primary" onClick={() => onCopy(code)}>
            Copiar
          </button>
        </footer>
      </div>
    </Modal>
  );
}
