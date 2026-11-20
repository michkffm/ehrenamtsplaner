import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { StyleSheet, useColorScheme } from 'react-native';
import { readPreferences, writePreferences } from './preferenceStorage';
import { defaultPreferences, parsePreferences, type SavedPreferences, type ThemeMode } from './preferenceValues';
import { translate, type Language, type MessageKey } from './i18n';

const palettes = {
  light: { ink: '#123D39', muted: '#4C6B65', green: '#007D73', paper: '#EDF8F4', surface: '#FFFFFF', line: '#A8CEC1', secondary: '#D1EEE3', onGreen: '#FFFFFF', error: '#BA2349', focus: '#00665D' },
  dark: { ink: '#EBFFF6', muted: '#B1D1C5', green: '#43DAB5', paper: '#081D19', surface: '#10372E', line: '#609D88', secondary: '#1B5140', onGreen: '#06352B', error: '#FF9CB8', focus: '#FFCB61' },
};

function styles(colors: typeof palettes.light) {
  return StyleSheet.create({
    page: { flex: 1, backgroundColor: colors.paper },
    container: { width: '100%', maxWidth: 1440, alignSelf: 'center', padding: 20, gap: 20 },
    card: { backgroundColor: colors.surface, borderRadius: 18, padding: 20, gap: 14, borderWidth: 1, borderColor: colors.line },
    title: { fontSize: 30, fontWeight: '700', color: colors.ink },
    heading: { fontSize: 21, fontWeight: '700', color: colors.ink },
    body: { fontSize: 16, lineHeight: 25, color: colors.muted },
    eyebrow: { color: colors.green, fontSize: 13, fontWeight: '700', letterSpacing: 1.5 },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center' },
    rowHeading: { flexGrow: 1, flexBasis: 240, minWidth: 0 },
    error: { color: colors.error, fontSize: 16, lineHeight: 24 },
  });
}

type Preferences = {
  storageError: boolean;
  language: Language; setLanguage: (language: Language) => void;
  themeMode: ThemeMode; setThemeMode: (theme: ThemeMode) => void; dark: boolean;
  colors: typeof palettes.light; ui: ReturnType<typeof styles>;
  t: (key: MessageKey, values?: Record<string, string | number>) => string;
};
const Context = createContext<Preferences | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(() => {
    try { return { saved: parsePreferences(readPreferences()), storageError: false }; }
    catch { return { saved: { ...defaultPreferences }, storageError: true }; }
  });
  const { language, themeMode } = state.saved;
  function update(change: Partial<SavedPreferences>) {
    const saved = { ...state.saved, ...change };
    let storageError = false;
    try { writePreferences(JSON.stringify(saved)); }
    catch { storageError = true; }
    setState({ saved, storageError });
  }
  const setLanguage = (language: Language) => update({ language });
  const setThemeMode = (themeMode: ThemeMode) => update({ themeMode });
  const system = useColorScheme();
  const dark = themeMode === 'dark' || (themeMode === 'system' && system === 'dark');
  const colors = palettes[dark ? 'dark' : 'light'];
  const ui = useMemo(() => styles(colors), [colors]);
  const value = { storageError: state.storageError, language, setLanguage, themeMode, setThemeMode, dark, colors, ui,
    t: (key: MessageKey, values?: Record<string, string | number>) => translate(language, key, values),
  };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useUI() {
  const context = useContext(Context);
  if (!context) throw new Error('PreferencesProvider is missing');
  return context;
}
