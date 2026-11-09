import { assert, test } from 'vitest';
import {
  BUILTIN_THEMES,
  DEFAULT_APPEARANCE,
  THEME_COLOR_KEYS,
  appearanceTokens,
  contrast,
  ensureContrast,
  isHexColor,
  mix,
  parseThemeFile,
  sanitizeAppearance,
  serializeTheme,
  themeFileName,
  themeTokens,
} from '../lib/themes';

test('todos os temas têm paleta válida e id único', () => {
  assert.strictEqual(new Set(BUILTIN_THEMES.map((item) => item.id)).size, BUILTIN_THEMES.length);
  for (const item of BUILTIN_THEMES) {
    for (const key of THEME_COLOR_KEYS) assert.ok(isHexColor(item.colors[key]), `${item.name}.${key}`);
  }
});

test('todos os temas têm contraste legível', () => {
  for (const item of BUILTIN_THEMES) {
    const t = themeTokens(item);
    const pairs: Array<[string, string, number]> = [
      ['--gray-lighter', '--gray-1', 4.5],
      ['--text-soft', '--gray-1', 4.5],
      ['--muted', '--gray-1', 4],
      ['--danger-text', '--danger-bg', 4.5],
      ['--m-get-fg', '--m-get-bg', 4.5],
      ['--m-post-fg', '--m-post-bg', 4.5],
      ['--m-put-fg', '--m-put-bg', 4.5],
      ['--m-del-fg', '--m-del-bg', 4.5],
      ['--code-key', '--gray-05', 3.5],
      ['--code-str', '--gray-05', 3.5],
      ['--on-accent', '--accent', 3],
    ];
    for (const [fg, bg, minimum] of pairs) {
      assert.ok(contrast(t[fg], t[bg]) >= minimum, `${item.name}: ${fg} em ${bg} = ${contrast(t[fg], t[bg]).toFixed(2)}`);
    }
  }
});

test('calcula mistura e contraste', () => {
  assert.strictEqual(mix('#000000', '#ffffff', 0.5), '#808080');
  assert.strictEqual(Math.round(contrast('#000000', '#ffffff')), 21);
  assert.ok(contrast(ensureContrast('#777777', '#808080', 4.5), '#808080') >= 4.5);
});

test('tema nativo não sobrescreve o CSS e aceita cor de destaque', () => {
  assert.deepEqual(appearanceTokens(DEFAULT_APPEARANCE), {});
  const tokens = appearanceTokens({ ...DEFAULT_APPEARANCE, accent: '#ff0000' });
  assert.strictEqual(tokens['--accent'], '#ff0000');
  assert.strictEqual(tokens['--gray-1'], undefined);
  assert.strictEqual(appearanceTokens({ ...DEFAULT_APPEARANCE, themeId: 'monokai' })['--gray-1'], '#272822');
});

test('exporta e importa tema', () => {
  const source = BUILTIN_THEMES.find((item) => item.id === 'dark-plus')!;
  const parsed = parseThemeFile(serializeTheme(source), 'custom:1');
  assert.deepEqual(parsed, { id: 'custom:1', name: 'Dark+', kind: 'dark', group: 'Importados', colors: source.colors });
  assert.strictEqual(themeFileName('Meu Tema é Ótimo!'), 'meu-tema-e-otimo.theme.json');
});

test('recusa arquivos e cores inválidos', () => {
  assert.throws(() => parseThemeFile('x', 'custom:1'), /JSON válido/);
  assert.throws(() => parseThemeFile('{}', 'custom:1'), /não é um tema/);
  const data = JSON.parse(serializeTheme(BUILTIN_THEMES[1]));
  assert.throws(() => parseThemeFile(JSON.stringify({ ...data, colors: { ...data.colors, bg: 'red; background: url(x)' } }), 'custom:1'), /#rrggbb/);
  assert.throws(() => parseThemeFile(JSON.stringify({ ...data, kind: 'neon' }), 'custom:1'), /tipo/);
});

test('sanitiza configurações salvas', () => {
  assert.strictEqual(sanitizeAppearance('x'), undefined);
  assert.deepEqual(sanitizeAppearance({ themeId: 'inexistente', accent: 'url(x)' }), DEFAULT_APPEARANCE);
  const custom = { id: 'custom:a', name: 'A', kind: 'dark', group: 'Importados', colors: BUILTIN_THEMES[1].colors };
  const settings = sanitizeAppearance({ themeId: 'custom:a', accent: '#112233', custom: [custom, { id: 'monokai', name: 'x' }] })!;
  assert.strictEqual(settings.themeId, 'custom:a');
  assert.strictEqual(settings.accent, '#112233');
  assert.strictEqual(settings.custom.length, 1);
});
