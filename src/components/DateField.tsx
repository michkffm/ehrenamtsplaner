import { useRef, useState, type ComponentRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Button, Field } from './ui';
import { useUI } from '../lib/preferences';
import { adjacentCalendarMonth, calendarDays, calendarUTCDate, calendarValue, parseCalendarValue } from '../lib/calendar';

export function DateField({ value, onChange, disabled = false }: { value: string; onChange: (value: string) => void; disabled?: boolean }) {
  const { colors, ui, t, language } = useUI();
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const trigger = useRef<ComponentRef<typeof Pressable>>(null);
  const now = new Date();
  const today = { year: now.getFullYear(), month: now.getMonth(), day: now.getDate() };
  const [month, setMonth] = useState<{ year: number; month: number }>(() => parseCalendarValue(value) ?? today);
  const locale = language === 'de' ? 'de-DE' : 'en-GB';
  const selected = parseCalendarValue(value);
  const todayValue = calendarValue(today.year, today.month, today.day);
  const dayFormatter = new Intl.DateTimeFormat(locale, { dateStyle: 'full', timeZone: 'UTC' });
  const monthLabel = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(calendarUTCDate(month.year, month.month, 1));

  function showCalendar() {
    if (disabled) return;
    setMonth(parseCalendarValue(value) ?? today);
    setOpen(true);
  }
  function choose(next: string) {
    onChange(next);
    setOpen(false);
    requestAnimationFrame(() => trigger.current?.focus());
  }

  return <View style={{ gap: 8 }}>
    <Field label={t('dueField')} value={value} autoCapitalize="none" autoCorrect={false} maxLength={10} editable={!disabled}
      onFocus={showCalendar} onChangeText={next => {
        onChange(next);
        const parsed = parseCalendarValue(next);
        if (parsed) setMonth(parsed);
      }} trailingAction={<Pressable ref={trigger} accessibilityRole="button" accessibilityLabel={t(open ? 'calendarClose' : 'calendarOpen')}
        accessibilityState={{ expanded: open, disabled }} disabled={disabled}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} onPress={() => { if (open) setOpen(false); else showCalendar(); }}
        style={{ width: 44, height: 44, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 2,
          borderColor: focused ? colors.focus : 'transparent' }}>
        <View accessible={false} style={{ width: 22, height: 21, borderWidth: 2, borderRadius: 4, borderColor: colors.ink }}>
          <View style={{ height: 5, borderBottomWidth: 2, borderColor: colors.ink }} />
          <Text style={{ textAlign: 'center', color: colors.ink, fontSize: 10, fontWeight: '700' }}>{selected?.day ?? today.day}</Text>
        </View>
      </Pressable>} />
    {open ? <View style={{ padding: 8, borderWidth: 1, borderRadius: 12, borderColor: colors.line, backgroundColor: colors.surface, gap: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 4 }}>
        <Button label="‹" accessibilityLabel={t('calendarPrevious')} secondary disabled={disabled || (month.year === 1 && month.month === 0)}
          onPress={() => setMonth(adjacentCalendarMonth(month.year, month.month, -1))} />
        <Text accessibilityRole="header" style={[ui.body, { fontWeight: '700', textAlign: 'center', flex: 1 }]}>{monthLabel}</Text>
        <Button label="›" accessibilityLabel={t('calendarNext')} secondary disabled={disabled || (month.year === 9999 && month.month === 11)}
          onPress={() => setMonth(adjacentCalendarMonth(month.year, month.month, 1))} />
      </View>
      <View style={{ flexDirection: 'row' }}>{Array.from({ length: 7 }, (_, index) => <Text key={index}
        style={[ui.body, { width: `${100 / 7}%`, textAlign: 'center', fontSize: 12 }]}>
        {new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' }).format(calendarUTCDate(2020, 0, 6 + index))}
      </Text>)}</View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{calendarDays(month.year, month.month).map((day, index) => {
        const date = day === null ? '' : calendarValue(month.year, month.month, day);
        return day === null ? <View key={`empty-${index}`} style={{ width: `${100 / 7}%`, height: 44 }} />
          : <CalendarDay key={date} label={String(day)} accessibilityLabel={dayFormatter.format(calendarUTCDate(month.year, month.month, day))}
            selected={date === value} today={date === todayValue} disabled={disabled} onPress={() => choose(date)} />;
      })}</View>
      <View style={ui.row}>
        <Button label={t('calendarToday')} secondary disabled={disabled} onPress={() => choose(todayValue)} />
        <Button label={t('calendarClear')} secondary disabled={disabled} onPress={() => choose('')} />
        <Button label={t('close')} secondary disabled={disabled} onPress={() => { setOpen(false); trigger.current?.focus(); }} />
      </View>
    </View> : null}
  </View>;
}

function CalendarDay({ label, accessibilityLabel, selected, today, disabled, onPress }: {
  label: string; accessibilityLabel: string; selected: boolean; today: boolean; disabled: boolean; onPress: () => void;
}) {
  const { colors } = useUI();
  const [focused, setFocused] = useState(false);
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} accessibilityState={{ selected, disabled }}
    disabled={disabled} onPress={onPress} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    style={({ pressed }) => ({ width: `${100 / 7}%`, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 8,
      borderWidth: 2, borderColor: focused ? colors.focus : today ? colors.green : 'transparent',
      backgroundColor: selected ? colors.green : pressed ? colors.secondary : colors.surface, opacity: disabled ? 0.5 : 1 })}>
    <Text style={{ fontSize: 15, color: selected ? colors.onGreen : colors.ink, fontWeight: selected || today ? '700' : '400' }}>{label}</Text>
  </Pressable>;
}
