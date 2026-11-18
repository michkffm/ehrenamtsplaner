import { useState } from 'react';
import { Text, View } from 'react-native';
import { useUI } from '../lib/preferences';
import { validateProgress, type Member, type Task } from '../lib/models';
import type { TaskAction } from '../lib/taskActions';
import { taskDeadline } from '../lib/taskOverview';
import { Button, Field, Notice } from './ui';
import { TaskAttachments } from './TaskAttachments';

export type TaskCardProps = {
  task: Task; members: Member[]; userId: string; ownerId: string; today: string; busy: boolean;
  onAction: (task: Task, action: TaskAction) => void;
  onEdit: (task: Task) => void; onAssign: (task: Task) => void;
  onProgress: (task: Task, value: number) => void;
};

export function TaskCard({ task, members, userId, ownerId, today, busy, onAction, onEdit, onAssign, onProgress }: TaskCardProps) {
  const { ui, colors, t, language, dark } = useUI();
  const [editingProgress, setEditingProgress] = useState(false);
  const [progress, setProgress] = useState(String(task.progress));
  const [invalidProgress, setInvalidProgress] = useState(false);
  const deadline = taskDeadline(task, today, language);
  const accents = dark ? { none: colors.line, green: '#80D9AA', blue: '#83BFFF', yellow: '#F3D36B', red: '#FFADA3', purple: '#CFADFF' }
    : { none: colors.line, green: '#236A45', blue: '#2456A3', yellow: '#956B08', red: '#A83232', purple: '#7544A0' };
  const member = members.find((m) => m.user_id === task.assigned_to);
  const assignee = member?.display_name || t('unnamed', { id: task.assigned_to?.slice(0, 8) ?? '' });
  const canManage = task.assigned_to === userId || ownerId === userId;
  const active = task.status === 'claimed' || task.status === 'in_progress';

  return <View style={[ui.card, { borderLeftWidth: 6, borderLeftColor: accents[task.color], minWidth: 0 }]}>
    <Text style={ui.eyebrow}>{t(task.status)}{task.assigned_to === userId ? ` · ${t('yourTask')}` : ''}</Text>
    <Text style={ui.heading}>{task.title}</Text>
    <Text style={[ui.body, { fontWeight: '700' }]}>{t('priority')}: {t(task.priority)}</Text>
    {task.color !== 'none' ? <Text style={ui.body}>{t('color')}: {t(task.color)}</Text> : null}
    {task.description ? <Text style={ui.body}>{task.description}</Text> : null}
    <Text style={ui.body}>{task.assigned_to ? t('assigned', { name: assignee }) : t('unassigned')}</Text>
    <Text style={[ui.body, deadline.overdue ? { color: colors.error, fontWeight: '700' } : undefined]}>{deadline.text}</Text>
    <View accessibilityRole="progressbar" accessibilityLabel={t('progress')}
      aria-valuemin={0} aria-valuemax={100} aria-valuenow={task.progress} aria-valuetext={t('progressLabel', { value: task.progress })}
      accessibilityValue={{ min: 0, max: 100, now: task.progress, text: t('progressLabel', { value: task.progress }) }}
      style={{ height: 10, backgroundColor: colors.secondary, borderRadius: 5, overflow: 'hidden' }}>
      <View style={{ width: `${task.progress}%`, height: '100%', backgroundColor: colors.green }} />
    </View>
    <Text style={ui.body}>{t('progressLabel', { value: task.progress })}</Text>
    {editingProgress ? <>
      <Field label={`${t('progress')} (%)`} value={progress} onChangeText={setProgress} keyboardType="number-pad" maxLength={3} editable={!busy} />
      <Notice message={invalidProgress ? t('progressInvalid') : ''} error />
      <View style={ui.row}>
        <Button label={t('progressSave')} disabled={busy} onPress={() => {
          const value = validateProgress(progress);
          if (value === null) { setInvalidProgress(true); return; }
          setInvalidProgress(false); onProgress(task, value);
        }} />
        <Button label={t('cancel')} secondary disabled={busy} onPress={() => { setProgress(String(task.progress)); setInvalidProgress(false); setEditingProgress(false); }} />
      </View>
    </> : null}
    <View style={ui.row}>
      {task.status === 'open' ? <Button label={t('claim')} disabled={busy} onPress={() => onAction(task, 'claim')} /> : null}
      {canManage && task.status === 'claimed' ? <Button label={t('start')} disabled={busy} onPress={() => onAction(task, 'start')} /> : null}
      {canManage && task.status === 'in_progress' ? <Button label={t('pause')} secondary disabled={busy} onPress={() => onAction(task, 'pause')} /> : null}
      {canManage && active ? <>
        <Button label={t('complete')} disabled={busy} onPress={() => onAction(task, 'complete')} />
        <Button label={t('release')} secondary disabled={busy} onPress={() => onAction(task, 'release')} />
        {!editingProgress ? <Button label={t('progress')} secondary disabled={busy} onPress={() => { setProgress(String(task.progress)); setInvalidProgress(false); setEditingProgress(true); }} /> : null}
      </> : null}
      {canManage && task.status === 'done' ? <Button label={t('reopen')} secondary disabled={busy} onPress={() => onAction(task, 'reopen')} /> : null}
      {task.created_by === userId || ownerId === userId ? <Button label={t('edit')} secondary disabled={busy} onPress={() => onEdit(task)} /> : null}
      {ownerId === userId && task.status !== 'done' ? <Button label={t('assign')} secondary disabled={busy} onPress={() => onAssign(task)} /> : null}
    </View>
    <TaskAttachments task={task} disabled={busy} userId={userId} ownerId={ownerId} />
  </View>;
}
