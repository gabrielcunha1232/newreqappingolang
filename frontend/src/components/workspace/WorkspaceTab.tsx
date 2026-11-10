import type { DragEvent, MouseEvent, ReactNode } from 'react';

export type DropSide = 'before' | 'after';

interface WorkspaceTabProps {
  tabKey: string;
  label: string;
  active: boolean;
  leading?: ReactNode;
  tooltip?: string;
  className?: string;
  dragging?: boolean;
  dropSide?: DropSide | null;
  onActivate: () => void;
  onClose: () => void;
  onContextMenu?: (event: MouseEvent<HTMLDivElement>) => void;
  onDragStart?: (event: DragEvent<HTMLDivElement>) => void;
  onDragOver?: (event: DragEvent<HTMLDivElement>) => void;
  onDrop?: (event: DragEvent<HTMLDivElement>) => void;
  onDragEnd?: () => void;
}

export function WorkspaceTab({
  tabKey,
  label,
  active,
  leading,
  tooltip,
  className = '',
  dragging = false,
  dropSide = null,
  onActivate,
  onClose,
  onContextMenu,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: WorkspaceTabProps) {
  const classes = ['request-tab', className];
  if (active) classes.push('active');
  if (dragging) classes.push('dragging');
  if (dropSide) classes.push(`drop-${dropSide}`);

  return (
    <div
      role="tab"
      tabIndex={active ? 0 : -1}
      aria-selected={active}
      data-tab-key={tabKey}
      className={classes.filter(Boolean).join(' ')}
      title={tooltip ?? label}
      draggable={Boolean(onDragStart)}
      onClick={onActivate}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onActivate();
        } else if (event.key === 'Delete') {
          event.preventDefault();
          onClose();
        }
      }}
      onMouseDown={(event) => event.button === 1 && event.preventDefault()}
      onAuxClick={(event) => event.button === 1 && onClose()}
      onContextMenu={onContextMenu}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      {leading}
      <span className="tab-title">{label}</span>
      <button
        className="tab-close"
        tabIndex={-1}
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
