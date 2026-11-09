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
  type ThemeDefinition,
} from '../../lib/themes';
import { Modal } from './Modal';

const GROUPS: Array<ThemeDefinition['group']> = ['Forkarsenet', 'VS Code', 'Importados'];

interface AppearanceDialogProps {
  settings: AppearanceSettings;
  onSave: (settings: AppearanceSettings) => void;
  onClose: () => void;
}

function Swatches({ colors }: Pick<ThemeDefinition, 'colors'>) {
  return (
    <span className="theme-preview" style={{ background: colors.surface, borderColor: colors.line }} aria-hidden="true">
      <span style={{ background: colors.accent }} />
      <span style={{ background: colors.key }} />
      <span style={{ background: colors.str }} />
      <span style={{ background: colors.text }} />
    </span>
  );
}

export function AppearanceDialog({ settings, onSave, onClose }: AppearanceDialogProps) {
  const [draft, setDraft] = useState(settings);
  const [error, setError] = useState('');
  const active = resolveTheme(draft);
  const themes = allThemes(draft);

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
      setDraft((current) => ({
        ...current,
        themeId: imported.id,
        custom: [...current.custom.filter((item) => item.name !== imported.name), imported],
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
    input.value = '';
  };

  const removeTheme = (id: string) =>
    setDraft((current) => ({
      ...current,
      themeId: current.themeId === id ? themes[0].id : current.themeId,
      custom: current.custom.filter((item) => item.id !== id),
    }));

  return (
    <Modal title="Aparência" width={720} onClose={cancel}>
      <div className="modal-form">
        <div className="modal-body">
          <div className="theme-groups">
            {GROUPS.map((group) => {
              const items = themes.filter((item) => item.group === group);
              if (items.length === 0) return null;
              return (
                <section key={group}>
                  <h4 className="part-heading">{group}</h4>
                  <div className="theme-grid">
                    {items.map((item) => (
                      <div key={item.id} className="theme-card-wrap">
                        <button
                          type="button"
                          className={'theme-card' + (item.id === active.id ? ' active' : '')}
                          aria-pressed={item.id === active.id}
                          onClick={() => setDraft({ ...draft, themeId: item.id })}
                        >
                          <Swatches colors={item.colors} />
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
                </section>
              );
            })}
          </div>

          <div className="runner-options">
            <label>
              Cor de destaque
              <input
                type="color"
                aria-label="Cor de destaque"
                value={draft.accent ?? active.colors.accent}
                onChange={(event) => setDraft({ ...draft, accent: event.target.value })}
              />
            </label>
            <button type="button" disabled={!draft.accent} onClick={() => setDraft({ ...draft, accent: null })}>
              Usar a do tema
            </button>
            <span className="spacer" />
            <label className="theme-import">
              <input type="file" accept=".json,application/json" onChange={importTheme} />
              <span>Importar tema…</span>
            </label>
            <button type="button" onClick={() => downloadText(themeFileName(active.name), serializeTheme(active))}>
              Exportar tema
            </button>
          </div>

          {error && (
            <div className="inline-error" role="alert">
              ⚠ {error}
            </div>
          )}
        </div>

        <footer className="modal-foot">
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
