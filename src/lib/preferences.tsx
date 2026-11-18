import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { StyleSheet, useColorScheme } from 'react-native';
import { translate, type Language, type MessageKey } from './i18n';

const palettes = {
  light: { ink: '#173D36', muted: '#52665F', green: '#176B51', paper: '#F4F6F0', surface: '#FFFFFF', line: '#BBC9BF', secondary: '#E8EFE8', onGreen: '#FFFFFF', error: '#9A291C', focus: '#000000' },
  dark: { ink: '#E9F2EC', muted: '#B6C9BE', green: '#82DCB4', paper: '#101A16', surface: '#1B2B23', line: '#658071', secondary: '#30483B', onGreen: '#10271D', error: '#FFADA3', focus: '#FFFFFF' },
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

type ThemeMode = 'system' | 'light' | 'dark';
type Preferences = {
  language: Language; setLanguage: (language: Language) => void;
  themeMode: ThemeMode; setThemeMode: (theme: ThemeMode) => void; dark: boolean;
  colors: typeof palettes.light; ui: ReturnType<typeof styles>;
  t: (key: MessageKey, values?: Record<string, string | number>) => string;
};
const Context = createContext<Preferences | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('de');
  const [themeMode, setThemeMode] = useState<ThemeMode>('system');
  const system = useColorScheme();
  const dark = themeMode === 'dark' || (themeMode === 'system' && system === 'dark');
  const colors = palettes[dark ? 'dark' : 'light'];
  const ui = useMemo(() => styles(colors), [colors]);
  const value = useMemo(() => ({ language, setLanguage, themeMode, setThemeMode, dark, colors, ui,
    t: (key: MessageKey, values?: Record<string, string | number>) => translate(language, key, values),
  }), [language, themeMode, dark, colors, ui]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useUI() {
  const context = useContext(Context);
  if (!context) throw new Error('PreferencesProvider is missing');
  return context;
}
