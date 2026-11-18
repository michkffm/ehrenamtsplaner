export type ThemeMode = 'system' | 'light' | 'dark';
export type SavedPreferences = { language: 'de' | 'en'; themeMode: ThemeMode };
export const defaultPreferences: SavedPreferences = { language: 'de', themeMode: 'system' };

export function parsePreferences(raw: string | null): SavedPreferences {
  if (raw === null) return { ...defaultPreferences };
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== 'object' || !('language' in value) || !('themeMode' in value)
    || (value.language !== 'de' && value.language !== 'en')
    || !['system', 'light', 'dark'].some(mode => mode === value.themeMode)) {
    throw new Error('Invalid preferences');
  }
  const themeMode = value.themeMode;
  if (themeMode !== 'system' && themeMode !== 'light' && themeMode !== 'dark') throw new Error('Invalid theme');
  return { language: value.language, themeMode };
}
