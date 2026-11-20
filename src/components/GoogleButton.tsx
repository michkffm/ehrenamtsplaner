import { useState } from 'react';
import { Image, Platform, Pressable, Text, View } from 'react-native';
import { useUI } from '../lib/preferences';

export function GoogleButton({ label, disabled, onPress }: { label: string; disabled: boolean; onPress: () => void }) {
  const { dark, colors } = useUI();
  const [focused, setFocused] = useState(false);
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }}
    disabled={disabled} onPress={onPress} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    style={({ pressed }) => ({
      minHeight: 48, borderRadius: 12, borderWidth: 1,
      borderColor: focused ? colors.focus : dark ? '#8E918F' : '#747775',
      backgroundColor: dark ? '#131314' : '#FFFFFF',
      paddingHorizontal: Platform.OS === 'ios' ? 16 : 12, paddingVertical: 10,
      flexDirection: 'row', alignItems: 'center', gap: Platform.OS === 'ios' ? 12 : 10,
      opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
      ...(focused ? { outlineColor: colors.focus, outlineWidth: 2, outlineStyle: 'solid' as const } : {}),
    })}>
    <View style={{ width: 24, height: 24, borderRadius: 4, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
      <Image source={require('../../assets/google-g.png')} style={{ width: 20, height: 20 }} resizeMode="contain" accessible={false} />
    </View>
    <Text style={{ color: dark ? '#E3E3E3' : '#1F1F1F', fontSize: 14, lineHeight: 20, fontWeight: '500', flexShrink: 1 }}>{label}</Text>
  </Pressable>;
}
