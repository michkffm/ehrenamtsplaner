import { translate, type Language } from './i18n.ts';
import type { Task, TaskStatus, TaskPriority } from './models';

export function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function filterTasks(tasks: Task[], options: {
  status: 'all' | TaskStatus; query: string; mineOnly: boolean; userId: string; priority?: TaskPriority | 'all';
}): Task[] {
  const terms = options.query.trim().toLocaleLowerCase('de-DE').split(/\s+/).filter(Boolean);
  return tasks.filter((task) => {
    if (options.status !== 'all' && task.status !== options.status) return false;
    if (options.priority && options.priority !== 'all' && task.priority !== options.priority) return false;
    if (options.mineOnly && task.assigned_to !== options.userId) return false;
    const text = `${task.title} ${task.description}`.toLocaleLowerCase('de-DE');
    return terms.every((term) => text.includes(term));
  });
}

export function taskDeadline(task: Task, today: string, language: Language = 'de'): { text: string; overdue: boolean } {
  if (!task.due_date) return { text: translate(language, 'noDeadline'), overdue: false };
  const [year, month, day] = task.due_date.split('-');
  const date = language === 'de' ? `${day}.${month}.${year}` : `${year}-${month}-${day}`;
  if (task.status !== 'done' && task.due_date < today) return { text: translate(language, 'overdue', { date }), overdue: true };
  if (task.status !== 'done' && task.due_date === today) return { text: translate(language, 'dueToday', { date }), overdue: false };
  return { text: translate(language, 'due', { date }), overdue: false };
}

export function sortTasks(tasks: Task[]): Task[] {
  const rank = { urgent: 0, high: 1, normal: 2, low: 3 };
  return [...tasks].sort((a, b) => rank[a.priority] - rank[b.priority] || (a.due_date ?? '9999-99-99').localeCompare(b.due_date ?? '9999-99-99'));
}
