export type ThemeKind = 'dark' | 'light';

export const THEME_COLOR_KEYS = ['bg', 'surface', 'surface2', 'input', 'line', 'text', 'muted', 'accent', 'key', 'str', 'num', 'bool'] as const;

export type ThemeColorKey = (typeof THEME_COLOR_KEYS)[number];
export type ThemePalette = Record<ThemeColorKey, string>;

export interface ThemeDefinition {
  id: string;
  name: string;
  kind: ThemeKind;
  group: 'Padrão' | 'Importados';
  colors: ThemePalette;
  native?: boolean;
}

export interface AppearanceSettings {
  themeId: string;
  accent: string | null;
  custom: ThemeDefinition[];
}

export const DEFAULT_THEME_ID = 'forkarsenet';
export const DEFAULT_APPEARANCE: AppearanceSettings = { themeId: DEFAULT_THEME_ID, accent: null, custom: [] };

const HEX = /^#[0-9a-f]{6}$/i;
const WHITE = '#ffffff';
const BLACK = '#000000';
const MAX_THEME_NAME = 60;
const MAX_CUSTOM_THEMES = 50;

const FEEDBACK: Record<ThemeKind, { green: string; red: string; blue: string; amber: string }> = {
  dark: { green: '#4ade80', red: '#f87171', blue: '#60a5fa', amber: '#e3b66b' },
  light: { green: '#16825d', red: '#c72e2e', blue: '#0066bf', amber: '#a86400' },
};

function theme(id: string, name: string, kind: ThemeKind, group: ThemeDefinition['group'], values: string): ThemeDefinition {
  const parts = values.trim().split(/\s+/);
  const colors = Object.fromEntries(THEME_COLOR_KEYS.map((key, index) => [key, parts[index]])) as ThemePalette;
  return { id, name, kind, group, colors };
}

const DARK_PLUS_CODE = '#9cdcfe #ce9178 #b5cea8 #569cd6';
const LIGHT_PLUS_CODE = '#0451a5 #a31515 #098658 #0000ff';
const SOLARIZED_CODE = '#268bd2 #2aa198 #d33682 #b58900';

export const BUILTIN_THEMES: ThemeDefinition[] = [
  { ...theme(DEFAULT_THEME_ID, 'Monocromático', 'dark', 'Padrão','#000000 #131416 #26282c #0a0b0c #393c41 #e6e8eb #8b9199 #d4d7dc #8bc6dd #e7a16b #e4c46e #c99be0'), native: true },
  theme('midnight', 'Azul noturno', 'dark', 'Padrão','#0b1220 #111a2c #1c2840 #0d1526 #2a3a57 #dbe4f3 #8796b0 #6ea8fe #7dd3fc #fbbf77 #fcd34d #c4a7f5'),
  theme('ember', 'Brasa', 'dark', 'Padrão','#14100c #1c1712 #2c241c #16120d #40352a #eee3d6 #a39483 #f0883e #e5c07b #d7a06b #e6b450 #d19a9a'),
  theme('paper', 'Papel', 'light', 'Padrão','#e9ebee #ffffff #f1f3f5 #ffffff #d3d7dd #24292f #656d76 #3b5bdb #0550ae #953800 #116329 #8250df'),

  theme('dark-modern', 'Dark Modern', 'dark', 'Padrão',`#181818 #1f1f1f #2b2b2b #313131 #2b2b2b #cccccc #9d9d9d #0078d4 ${DARK_PLUS_CODE}`),
  theme('dark-plus', 'Dark+', 'dark', 'Padrão',`#252526 #1e1e1e #333333 #3c3c3c #3c3c3c #d4d4d4 #9d9d9d #007acc ${DARK_PLUS_CODE}`),
  theme('light-modern', 'Light Modern', 'light', 'Padrão',`#f8f8f8 #ffffff #f2f2f2 #ffffff #e5e5e5 #3b3b3b #767676 #005fb8 ${LIGHT_PLUS_CODE}`),
  theme('light-plus', 'Light+', 'light', 'Padrão',`#f3f3f3 #ffffff #e8e8e8 #ffffff #d4d4d4 #333333 #717171 #007acc ${LIGHT_PLUS_CODE}`),
  theme('hc-dark', 'Dark High Contrast', 'dark', 'Padrão','#000000 #000000 #0c0c0c #000000 #6fc3df #ffffff #d0d0d0 #f38518 #9cdcfe #ce9178 #b5cea8 #569cd6'),
  theme('hc-light', 'Light High Contrast', 'light', 'Padrão','#ffffff #ffffff #f2f2f2 #ffffff #0f4a85 #292929 #4a4a4a #0f4a85 #0451a5 #a31515 #096d48 #0000ff'),
  theme('monokai', 'Monokai', 'dark', 'Padrão','#1e1f1c #272822 #34352f #414339 #414339 #f8f8f2 #90908a #a6e22e #f92672 #e6db74 #ae81ff #ae81ff'),
  theme('monokai-dimmed', 'Monokai Dimmed', 'dark', 'Padrão','#272727 #1e1e1e #303030 #353535 #303030 #c5c8c6 #8f8f8f #707070 #9872a2 #9aa83a #6089b4 #6089b4'),
  theme('solarized-dark', 'Solarized Dark', 'dark', 'Padrão',`#00212b #002b36 #073642 #003847 #073642 #93a1a1 #6c8087 #2aa198 ${SOLARIZED_CODE}`),
  theme('solarized-light', 'Solarized Light', 'light', 'Padrão',`#eee8d5 #fdf6e3 #e8e1cc #fdf6e3 #ddd6c1 #586e75 #6c7a7d #268bd2 ${SOLARIZED_CODE}`),
  theme('quiet-light', 'Quiet Light', 'light', 'Padrão','#f2f2f2 #f5f5f5 #e7e7e7 #ffffff #c9c9c9 #333333 #6d6d6d #705697 #aa3731 #448c27 #ab6526 #4b69c6'),
  theme('abyss', 'Abyss', 'dark', 'Padrão','#060621 #000c18 #10192c #181f2f #2b2b4a #6688cc #5a6f99 #596f99 #ddbb88 #22aa44 #f280d0 #f280d0'),
  theme('kimbie-dark', 'Kimbie Dark', 'dark', 'Padrão','#131510 #221a0f #362712 #51412c #51412c #d3af86 #a57a4c #7c5021 #dc3958 #889b4a #f79a32 #98676a'),
  theme('red', 'Red', 'dark', 'Padrão','#330000 #390000 #4c0000 #580000 #5c1a1a #f8f8f8 #d0a0a0 #cc3333 #fb9a4b #cd8d8d #fb9a4b #f12727'),
  theme('tomorrow-night-blue', 'Tomorrow Night Blue', 'dark', 'Padrão','#001c40 #002451 #001c40 #001733 #404f7d #ffffff #9fb4d0 #bbdaff #ff9da4 #d1f1a9 #ffc58f #ebbbff'),
];

function channels(hex: string): [number, number, number] {
  return [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16)) as [number, number, number];
}

export function mix(from: string, to: string, amount: number): string {
  const target = channels(to);
  const parts = channels(from).map((value, index) => Math.round(value + (target[index] - value) * amount));
  return `#${parts.map((value) => value.toString(16).padStart(2, '0')).join('')}`;
}

function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map((value) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

function readableOn(background: string): string {
  return contrast(WHITE, background) >= contrast(BLACK, background) ? WHITE : BLACK;
}

export function ensureContrast(color: string, background: string, minimum: number): string {
  const target = readableOn(background);
  for (let amount = 0; amount <= 1; amount += 0.05) {
    const candidate = mix(color, target, amount);
    if (contrast(candidate, background) >= minimum) return candidate;
  }
  return target;
}

function accentTokens(accent: string, kind: ThemeKind, surface: string): Record<string, string> {
  const [r, g, b] = channels(accent);
  return {
    '--accent': accent,
    '--accent-strong': ensureContrast(accent, surface, 4.5),
    '--accent-deep': mix(accent, surface, kind === 'dark' ? 0.2 : 0.15),
    '--on-accent': readableOn(accent),
    '--accent-alpha': `rgba(${r}, ${g}, ${b}, 0.18)`,
  };
}

function methodTokens(name: string, color: string, surface: string, kind: ThemeKind): Record<string, string> {
  const background = mix(surface, color, kind === 'dark' ? 0.3 : 0.16);
  return { [`--m-${name}-bg`]: background, [`--m-${name}-fg`]: ensureContrast(color, background, 4.5) };
}

export function themeTokens({ colors, kind }: ThemeDefinition): Record<string, string> {
  const { bg, surface, surface2, input, line, text, muted, accent, key, str, num, bool } = colors;
  const feedback = FEEDBACK[kind];
  const hover = mix(surface, text, kind === 'dark' ? 0.06 : 0.05);
  const surface3 = mix(surface2, text, 0.07);
  const lineStrong = mix(line, text, 0.18);
  const body = ensureContrast(text, surface, 4.5);
  const soft = ensureContrast(mix(text, muted, 0.25), surface, 4.5);
  const dangerBg = mix(surface, feedback.red, 0.16);

  return {
    '--gray-0': bg,
    '--gray-1': surface,
    '--gray-2': surface2,
    '--gray-3': line,
    '--gray-4': lineStrong,
    '--gray-05': input,
    '--gray-15': hover,
    '--gray-25': surface3,
    '--gray-light': accent,
    '--gray-lighter': body,
    '--text-strong': ensureContrast(mix(text, readableOn(surface), 0.6), surface, 7),
    '--text-soft': soft,
    '--muted': ensureContrast(muted, surface, 4),
    '--muted-2': ensureContrast(mix(muted, surface, 0.3), surface, 2.8),
    '--green': ensureContrast(feedback.green, surface, 3.5),
    '--red': ensureContrast(feedback.red, surface, 3.5),
    '--blue': ensureContrast(feedback.blue, surface, 3.5),
    '--amber': ensureContrast(feedback.amber, surface, 3.5),
    '--danger-bg': dangerBg,
    '--danger-line': mix(surface, feedback.red, 0.5),
    '--danger-text': ensureContrast(feedback.red, dangerBg, 4.5),
    ...methodTokens('get', feedback.green, surface, kind),
    ...methodTokens('post', feedback.amber, surface, kind),
    ...methodTokens('put', feedback.blue, surface, kind),
    ...methodTokens('del', feedback.red, surface, kind),
    '--code-key': ensureContrast(key, input, 3.5),
    '--code-str': ensureContrast(str, input, 3.5),
    '--code-num': ensureContrast(num, input, 3.5),
    '--code-bool': ensureContrast(bool, input, 3.5),
    ...accentTokens(accent, kind, surface),
  };
}

export const THEME_TOKEN_NAMES = Object.keys(themeTokens(BUILTIN_THEMES[0]));

export function allThemes(settings: AppearanceSettings): ThemeDefinition[] {
  return [...BUILTIN_THEMES, ...settings.custom];
}

export function resolveTheme(settings: AppearanceSettings): ThemeDefinition {
  return allThemes(settings).find((item) => item.id === settings.themeId) ?? BUILTIN_THEMES[0];
}

export function appearanceTokens(settings: AppearanceSettings): Record<string, string> {
  const active = resolveTheme(settings);
  const base = active.native ? {} : themeTokens(active);
  return settings.accent ? { ...base, ...accentTokens(settings.accent, active.kind, active.colors.surface) } : base;
}

export function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && HEX.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validPalette(colors: unknown): ThemePalette | null {
  if (!isRecord(colors) || !THEME_COLOR_KEYS.every((key) => isHexColor(colors[key]))) return null;
  return Object.fromEntries(THEME_COLOR_KEYS.map((key) => [key, (colors[key] as string).toLowerCase()])) as ThemePalette;
}

function customTheme(id: string, value: unknown): ThemeDefinition | null {
  if (!isRecord(value) || typeof value.name !== 'string' || !value.name.trim()) return null;
  if (value.kind !== 'dark' && value.kind !== 'light') return null;
  const colors = validPalette(value.colors);
  return colors && { id, name: value.name.trim().slice(0, MAX_THEME_NAME), kind: value.kind, group: 'Importados', colors };
}

export function sanitizeAppearance(value: unknown): AppearanceSettings | undefined {
  if (!isRecord(value)) return undefined;
  const custom = (Array.isArray(value.custom) ? value.custom : [])
    .slice(0, MAX_CUSTOM_THEMES)
    .flatMap((item) => {
      const parsed = isRecord(item) && typeof item.id === 'string' && item.id.startsWith('custom:') ? customTheme(item.id, item) : null;
      return parsed ? [parsed] : [];
    });
  const settings: AppearanceSettings = {
    themeId: typeof value.themeId === 'string' ? value.themeId : DEFAULT_THEME_ID,
    accent: isHexColor(value.accent) ? value.accent : null,
    custom,
  };
  return allThemes(settings).some((item) => item.id === settings.themeId) ? settings : { ...settings, themeId: DEFAULT_THEME_ID };
}

export function serializeTheme(item: ThemeDefinition): string {
  return JSON.stringify({ format: 'forkarsenet-theme', version: 1, name: item.name, kind: item.kind, colors: item.colors }, null, 2);
}

export function parseThemeFile(text: string, id: string): ThemeDefinition {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('O arquivo não é um JSON válido.');
  }
  if (!isRecord(data) || data.format !== 'forkarsenet-theme') throw new Error('Este arquivo não é um tema do Forkarsenet.');
  const parsed = customTheme(id, data);
  if (!parsed) throw new Error(`O tema precisa de nome, tipo (dark ou light) e estas cores em #rrggbb: ${THEME_COLOR_KEYS.join(', ')}.`);
  return parsed;
}

export function themeFileName(name: string): string {
  const slug = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${slug || 'tema'}.theme.json`;
}
