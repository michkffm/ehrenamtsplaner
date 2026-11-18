import { Text, View } from 'react-native';
import { useUI } from '../lib/preferences';
import { Button } from './ui';

export function PreferencesBar() {
  const { ui, t, language, setLanguage, themeMode, setThemeMode } = useUI();
  return <View style={ui.card}>
    <View style={ui.row}><Text style={ui.body}>{t('language')}</Text>
      <Button label="Deutsch" secondary selected={language === 'de'} onPress={() => setLanguage('de')} />
      <Button label="English" secondary selected={language === 'en'} onPress={() => setLanguage('en')} />
    </View>
    <View style={ui.row}><Text style={ui.body}>{t('appearance')}</Text>
      {(['system', 'light', 'dark'] as const).map((mode) => <Button key={mode} label={t(mode)} secondary selected={themeMode === mode} onPress={() => setThemeMode(mode)} />)}
    </View>
  </View>;
}
