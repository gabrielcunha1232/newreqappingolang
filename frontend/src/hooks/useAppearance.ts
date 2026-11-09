import { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import {
  BUILTIN_THEMES,
  DEFAULT_APPEARANCE,
  THEME_TOKEN_NAMES,
  appearanceTokens,
  resolveTheme,
  sanitizeAppearance,
  type AppearanceSettings,
} from '../lib/themes';

const STORAGE_KEY = 'forkarsenet.appearance';

function readCached(): AppearanceSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return (raw && sanitizeAppearance(JSON.parse(raw))) || DEFAULT_APPEARANCE;
  } catch {
    return DEFAULT_APPEARANCE;
  }
}

function writeCached(settings: AppearanceSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    return;
  }
}

export function paintAppearance(settings: AppearanceSettings) {
  const { style } = document.documentElement;
  [...THEME_TOKEN_NAMES, '--on-accent'].forEach((name) => style.removeProperty(name));
  Object.entries(appearanceTokens(settings)).forEach(([name, value]) => style.setProperty(name, value));
  style.colorScheme = (resolveTheme(settings) ?? BUILTIN_THEMES[0]).kind;
}

export function useAppearance() {
  const [settings, setSettings] = useState(readCached);
  const [dialogOpen, setDialogOpen] = useState(false);

  useLayoutEffect(() => {
    paintAppearance(settings);
    writeCached(settings);
  }, [settings]);

  const openDialog = useCallback(() => setDialogOpen(true), []);
  const closeDialog = useCallback(() => setDialogOpen(false), []);

  return useMemo(
    () => ({ settings, setSettings, dialogOpen, openDialog, closeDialog }),
    [settings, dialogOpen, openDialog, closeDialog]
  );
}
