import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

export const colors = { ink: '#173D36', muted: '#52665F', green: '#176B51', paper: '#F4F6F0', line: '#D7E0D7' };
export const ui = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.paper },
  container: { width: '100%', maxWidth: 1100, alignSelf: 'center', padding: 24, gap: 24 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24, gap: 16, borderWidth: 1, borderColor: colors.line },
  title: { fontSize: 32, fontWeight: '700', color: colors.ink },
  heading: { fontSize: 22, fontWeight: '700', color: colors.ink },
  body: { fontSize: 16, lineHeight: 25, color: colors.muted },
  eyebrow: { color: colors.green, fontSize: 13, fontWeight: '700', letterSpacing: 2 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center' },
  error: { color: '#9A291C', fontSize: 16, lineHeight: 23 },
});

export function Button({ label, onPress, disabled = false, secondary = false, selected = false }:
  { label: string; onPress: () => void; disabled?: boolean; secondary?: boolean; selected?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled, selected }}
    disabled={disabled} onPress={onPress} style={({ pressed }) => ({
      minHeight: 48, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12,
      backgroundColor: secondary && !selected ? '#EDF2EB' : colors.green,
      opacity: disabled ? 0.5 : pressed ? 0.75 : 1,
    })}><Text style={{ fontSize: 15, fontWeight: '600', color: secondary && !selected ? colors.ink : '#FFFFFF' }}>{label}</Text></Pressable>;
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return <View style={{ gap: 7 }}><Text style={{ fontSize: 14, fontWeight: '600', color: colors.ink }}>{label}</Text>
    <TextInput {...props} accessibilityLabel={label} placeholderTextColor="#64756D" style={{
      borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 13, minHeight: 48,
      fontSize: 16, color: colors.ink, backgroundColor: '#FFFFFF',
      ...(props.multiline ? { minHeight: 100, textAlignVertical: 'top' as const } : {}),
    }} /></View>;
}
export function Notice({ message, error = false }: { message: string; error?: boolean }) {
  return message ? <Text accessibilityRole={error ? 'alert' : undefined} accessibilityLiveRegion="polite"
    style={error ? ui.error : ui.body}>{message}</Text> : null;
}
