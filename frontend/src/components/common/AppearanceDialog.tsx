import { useEffect, useState, type ChangeEvent } from 'react';
import { paintAppearance } from '../../hooks/useAppearance';
import { downloadText } from '../../lib/download';
import { generateId } from '../../lib/id';
import {
  allThemes,
  parseThemeFile,
  resolveTheme,
  serializeTheme,
  themeFileName,
  type AppearanceSettings,
  type ThemePalette,
} from '../../lib/themes';
import { Modal } from './Modal';

type Filter = 'all' | 'dark' | 'light' | 'imported';

interface AppearanceDialogProps {
  settings: AppearanceSettings;
  onSave: (settings: AppearanceSettings) => void;
  onClose: () => void;
}

function ThemeThumb({ colors }: { colors: ThemePalette }) {
  const line = (first: string, firstWidth: number, second: string, secondWidth: number) => (
    <span className="theme-thumb-line">
      <i style={{ background: first, width: `${firstWidth}%` }} />
      <i style={{ background: second, width: `${secondWidth}%` }} />
    </span>
  );

  return (
    <span className="theme-thumb" style={{ background: colors.surface, borderColor: colors.line }} aria-hidden="true">
      <span className="theme-thumb-side" style={{ background: colors.bg, borderColor: colors.line }}>
        <i style={{ background: colors.muted, width: '70%' }} />
        <i style={{ background: colors.accent, width: '85%' }} />
        <i style={{ background: colors.muted, width: '55%' }} />
        <i style={{ background: colors.muted, width: '75%' }} />
      </span>
      <span className="theme-thumb-main">
        <span className="theme-thumb-bar">
          <i style={{ background: colors.input, borderColor: colors.line }} />
          <b style={{ background: colors.accent }} />
        </span>
        {line(colors.key, 28, colors.str, 44)}
        {line(colors.key, 38, colors.num, 18)}
        {line(colors.key, 22, colors.bool, 30)}
      </span>
    </span>
  );
}

export function AppearanceDialog({ settings, onSave, onClose }: AppearanceDialogProps) {
  const [draft, setDraft] = useState(settings);
  const [filter, setFilter] = useState<Filter>('all');
  const [error, setError] = useState('');
  const active = resolveTheme(draft);
  const themes = allThemes(draft);
  const hasImported = draft.custom.length > 0;
  const current = filter === 'imported' && !hasImported ? 'all' : filter;

  const tabs: Array<{ id: Filter; label: string }> = [
    { id: 'all', label: 'Todos' },
    { id: 'dark', label: 'Escuros' },
    { id: 'light', label: 'Claros' },
    ...(hasImported ? [{ id: 'imported' as const, label: 'Importados' }] : []),
  ];

  const visible = themes.filter((item) => {
    if (current === 'imported') return item.group === 'Importados';
    return current === 'all' || item.kind === current;
  });

  useEffect(() => paintAppearance(draft), [draft]);

  const cancel = () => {
    paintAppearance(settings);
    onClose();
  };

  const importTheme = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const file = input.files?.[0];
    if (!file) return;
    setError('');
    try {
      const imported = parseThemeFile(await file.text(), `custom:${generateId()}`);
      setDraft((value) => ({
        ...value,
        themeId: imported.id,
        custom: [...value.custom.filter((item) => item.name !== imported.name), imported],
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
    input.value = '';
  };

  const removeTheme = (id: string) =>
    setDraft((value) => ({
      ...value,
      themeId: value.themeId === id ? themes[0].id : value.themeId,
      custom: value.custom.filter((item) => item.id !== id),
    }));

  return (
    <Modal title="Tema" width={880} onClose={cancel}>
      <div className="modal-form">
        <div className="theme-toolbar">
          <div className="theme-tabs" role="group" aria-label="Filtrar temas">
            {tabs.map((tab) => (
              <button key={tab.id} type="button" className={current === tab.id ? 'active' : ''} aria-pressed={current === tab.id} onClick={() => setFilter(tab.id)}>
                {tab.label}
              </button>
            ))}
          </div>
          <div className="theme-accent">
            {draft.accent && (
              <button type="button" className="link" onClick={() => setDraft({ ...draft, accent: null })}>
                Usar a do tema
              </button>
            )}
            <label>
              Destaque
              <input
                type="color"
                aria-label="Cor de destaque"
                value={draft.accent ?? active.colors.accent}
                onChange={(event) => setDraft({ ...draft, accent: event.target.value })}
              />
            </label>
          </div>
        </div>

        <div className="theme-gallery">
          {visible.map((item) => (
            <div key={item.id} className="theme-card-wrap">
              <button
                type="button"
                className={'theme-card' + (item.id === active.id ? ' active' : '')}
                aria-pressed={item.id === active.id}
                onClick={() => setDraft({ ...draft, themeId: item.id })}
              >
                <ThemeThumb colors={item.colors} />
                <span className="theme-name">{item.name}</span>
              </button>
              {item.group === 'Importados' && (
                <button type="button" className="row-remove" aria-label={`Remover tema ${item.name}`} onClick={() => removeTheme(item.id)}>
                  ×
                </button>
              )}
            </div>
          ))}
        </div>

        {error && (
          <div className="inline-error theme-error" role="alert">
            ⚠ {error}
          </div>
        )}

        <footer className="modal-foot theme-foot">
          <label className="link theme-import">
            <input type="file" accept=".json,application/json" onChange={importTheme} />
            Importar
          </label>
          <button type="button" className="link" onClick={() => downloadText(themeFileName(active.name), serializeTheme(active))}>
            Exportar
          </button>
          <span className="theme-foot-gap" />
          <button type="button" onClick={cancel}>
            Cancelar
          </button>
          <button
            type="button"
            className="primary"
            onClick={() => {
              onSave(draft);
              onClose();
            }}
          >
            Aplicar
          </button>
        </footer>
      </div>
    </Modal>
  );
}
