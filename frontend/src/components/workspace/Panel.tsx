import { useRef, useState, type CSSProperties, type ReactNode, type PointerEvent } from 'react';
import type { PanelId } from '../../types';

const MIN_HEIGHT = 110;
const DRAG_MIME = 'application/x-newpostman-panel';

interface PanelProps {
  id: PanelId;
  title: ReactNode;
  actions?: ReactNode;
  className?: string;
  style?: CSSProperties;
  onSwap: (from: PanelId, to: PanelId) => void;
  onResize: (height: number) => void;
  children: ReactNode;
}

/**
 * Painel do workspace: arrastar pelo cabeçalho e soltar sobre outro painel
 * troca as posições; a alça no canto inferior direito ajusta a altura.
 */
export function Panel({ id, title, actions, className = '', style, onSwap, onResize, children }: PanelProps) {
  const ref = useRef<HTMLElement>(null);
  const [dragging, setDragging] = useState(false);
  const [over, setOver] = useState(false);

  const startResize = (event: PointerEvent<HTMLElement>) => {
    event.preventDefault();
    const panel = ref.current;
    if (!panel) return;
    const grip = event.currentTarget;
    const startY = event.clientY;
    const startHeight = panel.getBoundingClientRect().height;
    grip.setPointerCapture(event.pointerId);

    const move = (ev: globalThis.PointerEvent) => onResize(Math.max(MIN_HEIGHT, startHeight + ev.clientY - startY));
    const up = () => {
      grip.removeEventListener('pointermove', move);
      grip.removeEventListener('pointerup', up);
    };
    grip.addEventListener('pointermove', move);
    grip.addEventListener('pointerup', up);
  };

  return (
    <section
      ref={ref}
      className={`panel ${className}` + (dragging ? ' dragging' : '') + (over ? ' over' : '')}
      style={style}
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes(DRAG_MIME) || dragging) return;
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setOver(false);
        const from = event.dataTransfer.getData(DRAG_MIME) as PanelId;
        if (from && from !== id) onSwap(from, id);
      }}
    >
      <div
        className="panel-head"
        draggable
        onDragStart={(event) => {
          event.dataTransfer.setData(DRAG_MIME, id);
          event.dataTransfer.effectAllowed = 'move';
          setDragging(true);
        }}
        onDragEnd={() => setDragging(false)}
      >
        <span className="panel-title">{title}</span>
        {actions && (
          <span className="actions" draggable={false} onDragStart={(e) => e.preventDefault()}>
            {actions}
          </span>
        )}
      </div>
      <div className="panel-body">{children}</div>
      <i className="resize-grip" onPointerDown={startResize} aria-hidden="true" />
    </section>
  );
}
