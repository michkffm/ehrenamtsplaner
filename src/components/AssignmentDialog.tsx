import { Modal, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUI } from '../lib/preferences';
import type { Member, Task } from '../lib/models';
import { Button, Notice } from './ui';

export function AssignmentDialog({ task, members, busy, error, onAssign, onCancel }: {
  task: Task; members: Member[]; busy: boolean; error: string;
  onAssign: (userId: string | null) => void; onCancel: () => void;
}) {
  const { ui, t } = useUI();
  return <Modal visible accessibilityLabel={t('assignTitle')} onRequestClose={() => { if (!busy) onCancel(); }}>
    <SafeAreaView style={ui.page}><ScrollView contentContainerStyle={{ padding: 16 }}>
      <View style={[ui.card, { width: '100%', maxWidth: 640, alignSelf: 'center' }]}>
        <Text accessibilityRole="header" style={ui.heading}>{t('assignTitle')}</Text>
        <Text style={ui.body}>{task.title}</Text><Text style={ui.body}>{t('assignHint')}</Text>
        <Notice message={error} error />
        <Button label={t('unassigned')} secondary selected={task.assigned_to === null} disabled={busy || task.assigned_to === null} onPress={() => onAssign(null)} />
        {members.map((member) => <Button key={member.user_id} label={member.display_name || t('unnamed', { id: member.user_id.slice(0, 8) })}
          secondary selected={member.user_id === task.assigned_to} disabled={busy || member.user_id === task.assigned_to} onPress={() => onAssign(member.user_id)} />)}
        {!members.length ? <Text style={ui.body}>{t('membersEmpty')}</Text> : null}
        <Button label={t('close')} secondary disabled={busy} onPress={onCancel} />
      </View>
    </ScrollView></SafeAreaView>
  </Modal>;
}
