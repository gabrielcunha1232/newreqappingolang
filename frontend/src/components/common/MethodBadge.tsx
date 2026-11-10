import { methodClass, methodShort } from '../../lib/format';

interface MethodBadgeProps {
  method: string;
  full?: boolean;
  className?: string;
}

export function MethodBadge({ method, full = false, className = '' }: MethodBadgeProps) {
  return (
    <span className={`${methodClass(method)} ${className}`.trim()}>
      {full ? method.toUpperCase() : methodShort(method)}
    </span>
  );
}
