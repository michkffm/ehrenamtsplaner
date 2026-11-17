import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Field, Notice, ui } from './ui';
import { validateDraft, type Task, type TaskDraft } from '../lib/models';

export function TaskEditor({ task, busy, serverError, onSave, onCancel }: {
  task?: Task; busy: boolean; serverError: string; onSave: (draft: TaskDraft) => Promise<void>; onCancel: () => void;
}) {
  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [due, setDue] = useState(task?.due_date ?? '');
  const [error, setError] = useState('');
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const titleRef = useRef<ComponentRef<typeof TextInput>>(null);
  const continueRef = useRef<ComponentRef<typeof Pressable>>(null);
  const changed = title !== (task?.title ?? '') || description !== (task?.description ?? '') || due !== (task?.due_date ?? '');
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
    const draft = { title, description, due_date: due.trim() };
    const message = validateDraft(draft);
    setError(message ?? '');
    if (!message) await onSave(draft);
  }
  return <Modal visible animationType="none" accessibilityLabel={task ? 'Aufgabe bearbeiten' : 'Neue Aufgabe'}
    onRequestClose={requestClose} onShow={() => titleRef.current?.focus()}>
    <SafeAreaView style={ui.page}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16 }}>
          <View style={[ui.card, { width: '100%', maxWidth: 640, alignSelf: 'center' }]}>
    {confirmDiscard ? <>
      <Text accessibilityRole="header" style={ui.heading}>Änderungen verwerfen?</Text>
      <Notice message="Deine Eingaben wurden noch nicht gespeichert. Möchtest du weiter bearbeiten oder sie verwerfen?" />
      <View style={ui.row}>
        <Button buttonRef={continueRef} label="Weiter bearbeiten" onPress={continueEditing} />
        <Button label="Änderungen verwerfen" secondary onPress={onCancel} />
      </View>
    </> : <>
    <Text accessibilityRole="header" style={ui.heading}>{task ? 'Aufgabe bearbeiten' : 'Wo wird Hilfe gebraucht?'}</Text>
    <Field inputRef={titleRef} label="Titel" value={title} onChangeText={setTitle} maxLength={120} editable={!busy} />
    <Field label="Beschreibung (optional)" value={description} onChangeText={setDescription} multiline maxLength={2000} editable={!busy} />
    <Field label="Termin (optional, JJJJ-MM-TT)" value={due} onChangeText={setDue} autoCapitalize="none" maxLength={10} editable={!busy} />
    <Notice message={error || serverError} error />
    <View style={ui.row}><Button label={busy ? 'Wird gespeichert …' : 'Aufgabe speichern'} disabled={busy} onPress={() => void submit()} />
      <Button label="Abbrechen" secondary disabled={busy} onPress={requestClose} /></View>
    </>}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  </Modal>;
}
