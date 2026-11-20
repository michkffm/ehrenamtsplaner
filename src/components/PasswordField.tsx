import { useRef, useState, type ComponentRef } from 'react';
import { Pressable, TextInput, View, type TextInputProps } from 'react-native';
import { useUI } from '../lib/preferences';
import { Field } from './ui';

export function PasswordField(props: Omit<TextInputProps, 'secureTextEntry'> & { label: string }) {
  const { colors, t } = useUI();
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState(false);
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  const disabled = props.editable === false;
  return <Field {...props} inputRef={input} secureTextEntry={!visible} autoCapitalize="none" autoCorrect={false}
    trailingAction={<Pressable accessibilityRole="button" accessibilityLabel={t(visible ? 'hidePassword' : 'showPassword')}
      accessibilityState={{ disabled }} disabled={disabled}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      onPress={() => { setVisible(current => !current); input.current?.focus(); }}
      style={({ pressed }) => ({ width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 8,
        borderWidth: 2, borderColor: focused ? colors.focus : 'transparent', opacity: disabled ? 0.5 : pressed ? 0.65 : 1 })}>
      <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
        style={{ width: 22, height: 14, borderWidth: 2, borderColor: colors.ink, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.ink }} />
        {visible ? <View style={{ position: 'absolute', width: 27, height: 2, backgroundColor: colors.ink, transform: [{ rotate: '-40deg' }] }} /> : null}
      </View>
    </Pressable>} />;
}
