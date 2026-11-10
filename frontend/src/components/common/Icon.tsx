import type { ReactNode } from 'react';

export type IconName = 'folder' | 'folder-open' | 'chevron' | 'tray' | 'tag' | 'lock' | 'lock-open' | 'eye' | 'eye-off';

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
  tag: (
    <>
      <path
        d="M3.5 4.5v6.3a1.5 1.5 0 0 0 .44 1.06l8.2 8.2a1.5 1.5 0 0 0 2.12 0l5.8-5.8a1.5 1.5 0 0 0 0-2.12l-8.2-8.2A1.5 1.5 0 0 0 10.8 3.5H4.5a1 1 0 0 0-1 1z"
        fill="currentColor"
        fillOpacity={0.12}
      />
      <circle cx={8} cy={8} r={1.4} />
    </>
  ),
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
  lock: (
    <>
      <rect x={5} y={11} width={14} height={9.5} rx={1.5} fill="currentColor" fillOpacity={0.12} />
      <path d="M8 11V7.5a4 4 0 0 1 8 0V11" />
    </>
  ),
  'lock-open': (
    <>
      <rect x={5} y={11} width={14} height={9.5} rx={1.5} fill="currentColor" fillOpacity={0.12} />
      <path d="M8 11V7.5a4 4 0 0 1 7.6-1.7" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" fill="currentColor" fillOpacity={0.12} />
      <circle cx={12} cy={12} r={2.8} />
    </>
  ),
  'eye-off': (
    <>
      <path d="M9.9 5.8a9 9 0 0 1 2.1-.3c6 0 9.5 6.5 9.5 6.5a16 16 0 0 1-2.7 3.5" />
      <path d="M6.3 7.4A15.5 15.5 0 0 0 2.5 12s3.5 6.5 9.5 6.5a9.2 9.2 0 0 0 4.6-1.3" />
      <path d="M10 10a2.8 2.8 0 0 0 4 4" />
      <path d="M4 4l16 16" />
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
