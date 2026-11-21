import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Field, Notice } from './ui';
import { DateField } from './DateField';
import { taskColorValue } from '../lib/taskColors';
import { useUI } from '../lib/preferences';
import { validateDraft, taskPriorities, taskColors, type Task, type TaskDraft, type TaskPriority, type TaskColor } from '../lib/models';

export function TaskEditor({ task, busy, serverError, onSave, onCancel }: {
  task?: Task; busy: boolean; serverError: string; onSave: (draft: TaskDraft) => Promise<void>; onCancel: () => void;
}) {
  const { ui, t, language, colors, dark } = useUI();
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? 'normal');
  const [color, setColor] = useState<TaskColor>(task?.color ?? 'none');
  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [due, setDue] = useState(task?.due_date ?? '');
  const [validationShown, setValidationShown] = useState(false);
  const error = validationShown ? validateDraft({ title, description, due_date: due.trim(), priority, color }, language) : null;
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const titleRef = useRef<ComponentRef<typeof TextInput>>(null);
  const continueRef = useRef<ComponentRef<typeof Pressable>>(null);
  const changed = priority !== (task?.priority ?? 'normal') || color !== (task?.color ?? 'none') || title !== (task?.title ?? '') || description !== (task?.description ?? '') || due !== (task?.due_date ?? '');
  useEffect(() => { if (confirmDiscard) continueRef.current?.focus(); }, [confirmDiscard]);

  function continueEditing() {
    setConfirmDiscard(false);
    requestAnimationFrame(() => titleRef.current?.focus());
  }

  function requestClose() {
    if (busy) return;
    if (confirmDiscard) { continueEditing(); return; }
    if (changed) setConfirmDiscard(true);
    else onCancel();
  }
  async function submit() {
    const draft = { title, description, due_date: due.trim(), priority, color };
    const message = validateDraft(draft, language);
    setValidationShown(Boolean(message));
    if (!message) await onSave(draft);
  }
  return <Modal visible animationType="none" accessibilityLabel={task ? t('editTask') : t('newTaskDialog')}
    onRequestClose={requestClose} onShow={() => titleRef.current?.focus()}>
    <SafeAreaView style={ui.page}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16 }}>
          <View style={[ui.card, { width: '100%', maxWidth: 640, alignSelf: 'center' }]}>
    {confirmDiscard ? <>
      <Text accessibilityRole="header" style={ui.heading}>{t('discardTitle')}</Text>
      <Notice message={t('discardHint')} />
      <View style={ui.row}>
        <Button buttonRef={continueRef} label={t('continueEditing')} onPress={continueEditing} />
        <Button label={t('discard')} secondary onPress={onCancel} />
      </View>
    </> : <>
    <Text accessibilityRole="header" style={ui.heading}>{task ? t('editTask') : t('editorTitle')}</Text>
    <Field inputRef={titleRef} label={t('title')} value={title} onChangeText={setTitle} maxLength={120} editable={!busy} />
    <Field label={t('description')} value={description} onChangeText={setDescription} multiline maxLength={2000} editable={!busy} />
    <DateField value={due} onChange={setDue} disabled={busy} />
    <Text style={ui.body}>{t('priority')}</Text>
    <View style={ui.row}>{taskPriorities.map((value) => <Button key={value} label={t(value)} secondary selected={priority === value} disabled={busy} onPress={() => setPriority(value)} />)}</View>
    <Text style={ui.body}>{t('color')}</Text>
    <View style={ui.row}>{taskColors.map((value) => <Button key={value} label={t(value)} swatchColor={taskColorValue(value, dark, colors.line)} secondary selected={color === value} disabled={busy} onPress={() => setColor(value)} />)}</View>
    <Notice message={error || serverError} error />
    <View style={ui.row}><Button label={busy ? t('saving') : t('saveTask')} disabled={busy} onPress={() => void submit()} />
      <Button label={t('cancel')} secondary disabled={busy} onPress={requestClose} /></View>
    </>}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  </Modal>;
}
