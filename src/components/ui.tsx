import { Pressable, Text, TextInput, View, type TextInputProps } from 'react-native';
import { useState, type ComponentPropsWithRef, type ReactNode } from 'react';
import { useUI } from '../lib/preferences';

export function Button({ label, onPress, buttonRef, disabled = false, secondary = false, selected = false }:
  { label: string; onPress: () => void; buttonRef?: ComponentPropsWithRef<typeof Pressable>['ref']; disabled?: boolean; secondary?: boolean; selected?: boolean }) {
  const { colors } = useUI();
  const [focused, setFocused] = useState(false);
  return <Pressable ref={buttonRef} accessibilityRole="button" accessibilityState={{ disabled, selected }}
    onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    disabled={disabled} onPress={onPress} style={({ pressed }) => ({
      minHeight: 48, maxWidth: '100%', flexShrink: 1, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12,
      borderWidth: 2, borderColor: focused ? colors.focus : 'transparent',
      backgroundColor: secondary && !selected ? colors.secondary : colors.green,
      opacity: disabled ? 0.5 : pressed ? 0.75 : 1,
    })}><Text style={{ fontSize: 15, fontWeight: '600', color: secondary && !selected ? colors.ink : colors.onGreen }}>{label}</Text></Pressable>;
}
export function Field({ label, inputRef, trailingAction, style, onFocus, onBlur, ...props }: TextInputProps & { label: string; trailingAction?: ReactNode; inputRef?: ComponentPropsWithRef<typeof TextInput>['ref'] }) {
  const { colors } = useUI();
  const [focused, setFocused] = useState(false);
  return <View style={{ gap: 7 }}><Text style={{ fontSize: 14, fontWeight: '600', color: colors.ink }}>{label}</Text>
    <View style={{ position: 'relative' }}><TextInput {...props} ref={inputRef} accessibilityLabel={label} placeholderTextColor={colors.muted}
      onFocus={(event) => { setFocused(true); onFocus?.(event); }}
      onBlur={(event) => { setFocused(false); onBlur?.(event); }} style={[{
      borderWidth: 2, borderColor: focused ? colors.green : colors.line, borderRadius: 10, padding: 12, minHeight: 48,
      fontSize: 16, color: colors.ink, backgroundColor: colors.surface,
      ...(trailingAction ? { paddingRight: 60 } : {}),
      ...(props.multiline ? { minHeight: 100, textAlignVertical: 'top' as const } : {}),
    }, style]} />{trailingAction ? <View style={{ position: 'absolute', right: 4, top: 0, bottom: 0, justifyContent: 'center' }}>{trailingAction}</View> : null}</View></View>;
}
export function Notice({ message, error = false }: { message: string; error?: boolean }) {
  const { ui } = useUI();
  return message ? <Text accessibilityRole={error ? 'alert' : undefined} accessibilityLiveRegion="polite"
    style={error ? ui.error : ui.body}>{message}</Text> : null;
}
