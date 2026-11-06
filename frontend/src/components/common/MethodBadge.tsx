import { methodClass, methodShort } from '../../lib/format';

interface MethodBadgeProps {
  method: string;
  /** Mostra o nome completo ("DELETE") em vez do abreviado ("DEL"). */
  full?: boolean;
  className?: string;
}

/** Selo colorido do método HTTP. */
export function MethodBadge({ method, full = false, className = '' }: MethodBadgeProps) {
  return (
    <span className={`${methodClass(method)} ${className}`.trim()}>
      {full ? method.toUpperCase() : methodShort(method)}
    </span>
  );
}
