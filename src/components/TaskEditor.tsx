import { useState } from 'react';
import { Text, View } from 'react-native';
import { Button, Field, Notice, ui } from './ui';
import { validateDraft, type Task, type TaskDraft } from '../lib/models';

export function TaskEditor({ task, busy, onSave, onCancel }: {
  task?: Task; busy: boolean; onSave: (draft: TaskDraft) => Promise<void>; onCancel: () => void;
}) {
  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [due, setDue] = useState(task?.due_date ?? '');
  const [error, setError] = useState('');
  async function submit() {
    const draft = { title, description, due_date: due.trim() };
    const message = validateDraft(draft);
    setError(message ?? '');
    if (!message) await onSave(draft);
  }
  return <View style={ui.card}>
    <Text style={ui.heading}>{task ? 'Aufgabe bearbeiten' : 'Wo wird Hilfe gebraucht?'}</Text>
    <Field label="Titel" value={title} onChangeText={setTitle} maxLength={120} editable={!busy} />
    <Field label="Beschreibung (optional)" value={description} onChangeText={setDescription} multiline maxLength={2000} editable={!busy} />
    <Field label="Termin (optional, JJJJ-MM-TT)" value={due} onChangeText={setDue} autoCapitalize="none" maxLength={10} editable={!busy} />
    <Notice message={error} error />
    <View style={ui.row}><Button label={busy ? 'Wird gespeichert …' : 'Aufgabe speichern'} disabled={busy} onPress={() => void submit()} />
      <Button label="Abbrechen" secondary disabled={busy} onPress={onCancel} /></View>
  </View>;
}
