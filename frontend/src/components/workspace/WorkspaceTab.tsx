import type { ReactNode } from 'react';

interface WorkspaceTabProps {
  label: string;
  active: boolean;
  /** Selo à esquerda do título (método HTTP, "DOCS"...). */
  leading?: ReactNode;
  tooltip?: string;
  className?: string;
  onActivate: () => void;
  onClose: () => void;
}

/** Aba da barra superior: ativa com clique ou Enter, fecha com × ou clique do meio. */
export function WorkspaceTab({ label, active, leading, tooltip, className = '', onActivate, onClose }: WorkspaceTabProps) {
  return (
    <div
      role="tab"
      tabIndex={0}
      aria-selected={active}
      className={`request-tab ${className}` + (active ? ' active' : '')}
      title={tooltip ?? label}
      onClick={onActivate}
      onKeyDown={(event) => event.key === 'Enter' && onActivate()}
      onAuxClick={(event) => event.button === 1 && onClose()}
    >
      {leading}
      <span className="tab-title">{label}</span>
      <button
        onClick={(event) => {
          event.stopPropagation();
          onClose();
        }}
        aria-label={`Fechar ${label}`}
      >
        ×
      </button>
    </div>
  );
}
