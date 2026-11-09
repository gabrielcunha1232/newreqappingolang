import { defaultAuth } from '../../lib/factories';
import type { RequestAuth } from '../../types';
import { Modal } from '../common/Modal';
import { AuthEditor } from '../request/AuthEditor';

export type AuthTarget = { kind: 'folder' | 'collection'; id: string };

interface AuthSettingsDialogProps {
  kind: AuthTarget['kind'];
  name: string;
  auth: RequestAuth | undefined;
  variables: Record<string, string>;
  onChange: (auth: RequestAuth | undefined) => void;
  onClose: () => void;
}

export function AuthSettingsDialog({ kind, name, auth, variables, onChange, onClose }: AuthSettingsDialogProps) {
  const isFolder = kind === 'folder';
  const value = auth ?? { ...defaultAuth(), type: isFolder ? ('inherit' as const) : ('none' as const) };

  return (
    <Modal title={`Autorização: ${name}`} onClose={onClose}>
      <div className="modal-form">
        <div className="modal-body">
          <p className="hint">Vale para as requisições daqui configuradas com "Herdar".</p>
          <AuthEditor
            auth={value}
            variables={variables}
            allowInherit={isFolder}
            onChange={(next) => onChange(next.type === 'inherit' ? undefined : next)}
          />
        </div>
        <footer className="modal-foot">
          <button type="button" className="primary" onClick={onClose}>
            Concluir
          </button>
        </footer>
      </div>
    </Modal>
  );
}
