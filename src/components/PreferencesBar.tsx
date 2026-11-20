import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useUI } from '../lib/preferences';

function PreferenceOption({ label, accessibleLabel = label, selected, onPress }: {
  label: string; accessibleLabel?: string; selected: boolean; onPress: () => void;
}) {
  const { colors } = useUI();
  const [focused, setFocused] = useState(false);
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibleLabel} accessibilityState={{ selected }}
    onPress={onPress} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    style={({ pressed }) => [styles.option, {
      backgroundColor: selected ? colors.surface : 'transparent',
      borderColor: focused ? colors.focus : selected ? colors.line : 'transparent',
      opacity: pressed ? 0.7 : 1,
    }]}>
    <Text style={{ color: selected ? colors.ink : colors.muted, fontSize: 13, fontWeight: selected ? '700' : '500' }}>{label}</Text>
  </Pressable>;
}

export function PreferencesBar({ style }: { style?: StyleProp<ViewStyle> }) {
  const { ui, colors, t, language, setLanguage, dark, setThemeMode, storageError } = useUI();
  return <View style={[styles.wrapper, style]}>
    <View style={styles.controls}>
      <View style={[styles.segment, { backgroundColor: colors.secondary }]}>
        <PreferenceOption label="DE" accessibleLabel="Deutsch" selected={language === 'de'} onPress={() => setLanguage('de')} />
        <PreferenceOption label="EN" accessibleLabel="English" selected={language === 'en'} onPress={() => setLanguage('en')} />
      </View>
      <View style={[styles.segment, { backgroundColor: colors.secondary }]}>
        <PreferenceOption label={t(dark ? 'light' : 'dark')} selected={false}
          onPress={() => setThemeMode(dark ? 'light' : 'dark')} />
      </View>
    </View>
    {storageError ? <Text accessibilityRole="alert" style={ui.error}>{t('preferencesStorageError')}</Text> : null}
  </View>;
}

const styles = StyleSheet.create({
  wrapper: { gap: 8, maxWidth: '100%' },
  controls: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', gap: 14 },
  segment: { flexDirection: 'row', flexWrap: 'wrap', borderRadius: 13, padding: 3, gap: 2 },
  option: { minHeight: 44, minWidth: 44, paddingHorizontal: 12, paddingVertical: 8,
    alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderWidth: 1, flexShrink: 1 },
});
