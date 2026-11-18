import { Text, View, useWindowDimensions } from 'react-native';
import { useUI } from '../lib/preferences';
import { taskStatuses } from '../lib/models';
import { sortTasks } from '../lib/taskOverview';
import { TaskCard, type TaskCardProps } from './TaskCard';

export function TaskBoard({ tasks, mode, ...props }: Omit<TaskCardProps, 'task'> & { tasks: TaskCardProps['task'][]; mode: 'board' | 'list' }) {
  const { ui, colors, t } = useUI();
  const { width } = useWindowDimensions();
  const sorted = sortTasks(tasks);
  const card = (task: TaskCardProps['task']) => <TaskCard key={`${task.id}-${task.version}`} task={task} {...props} />;
  if (mode === 'list') return <View style={{ gap: 16 }}>{sorted.map(card)}</View>;
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
    {taskStatuses.map((status) => <View key={status} style={{ flexBasis: width >= 1300 ? '23%' : width >= 760 ? '47%' : '100%', flexGrow: 1, minWidth: 0, gap: 14,
      backgroundColor: colors.secondary, padding: 12, borderRadius: 18 }}>
      <Text accessibilityRole="header" style={ui.heading}>{t(status)} · {sorted.filter((task) => task.status === status).length}</Text>
      {sorted.some((task) => task.status === status) ? sorted.filter((task) => task.status === status).map(card)
        : <Text style={ui.body}>{t('emptyColumn')}</Text>}
    </View>)}
  </View>;
}
