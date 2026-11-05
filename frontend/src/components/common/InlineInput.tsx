import { useState } from 'react';

interface InlineInputProps {
  initialValue?: string;
  placeholder?: string;
  ariaLabel: string;
  className?: string;
  /** Chamado com o valor digitado ao pressionar Enter ou sair do campo. */
  onCommit: (value: string) => void;
  onCancel: () => void;
  /** Se falso, sair do campo cancela em vez de confirmar. */
  commitOnBlur?: boolean;
}

/** Campo de edição rápida: Enter confirma, Esc cancela. */
export function InlineInput({
  initialValue = '',
  placeholder,
  ariaLabel,
  className = '',
  onCommit,
  onCancel,
  commitOnBlur = true,
}: InlineInputProps) {
  const [value, setValue] = useState(initialValue);

  return (
    <input
      className={'inline-input ' + className}
      value={value}
      placeholder={placeholder}
      autoFocus
      aria-label={ariaLabel}
      onFocus={(event) => event.target.select()}
      onChange={(event) => setValue(event.target.value)}
      onClick={(event) => event.stopPropagation()}
      onBlur={() => (commitOnBlur ? onCommit(value) : onCancel())}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          onCommit(value);
        } else if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          onCancel();
        }
      }}
    />
  );
}
