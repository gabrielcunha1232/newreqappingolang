import type { ReactNode } from 'react';

export type IconName = 'folder' | 'folder-open' | 'chevron' | 'tray';

/* Ícones de traço (24×24) que herdam a cor do texto (currentColor). */
const PATHS: Record<IconName, ReactNode> = {
  folder: (
    <path
      d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4.3l2 2.2h8.7A1.5 1.5 0 0 1 21 8.7v9.8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z"
      fill="currentColor"
      fillOpacity={0.12}
    />
  ),
  'folder-open': (
    <>
      <path d="M3 18V6.5A1.5 1.5 0 0 1 4.5 5h4.3l2 2.2h7.7A1.5 1.5 0 0 1 20 8.7V10" />
      <path
        d="M3 18l2.4-6.9A1.6 1.6 0 0 1 6.9 10h13.6a1 1 0 0 1 .95 1.3l-2.1 6.6A1.5 1.5 0 0 1 17.9 19H4a1 1 0 0 1-1-1z"
        fill="currentColor"
        fillOpacity={0.12}
      />
    </>
  ),
  chevron: <path d="M9 6l6 6-6 6" />,
  tray: (
    <>
      <path
        d="M5.5 5h13l2.5 8v5.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5V13z"
        fill="currentColor"
        fillOpacity={0.12}
      />
      <path d="M3 13h5l1.5 2.5h5L16 13h5" />
    </>
  ),
};

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
}

export function Icon({ name, size = 16, className = '' }: IconProps) {
  return (
    <svg
      className={'icon ' + className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}
