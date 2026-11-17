import type { Task, TaskStatus } from './models';

export function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function filterTasks(tasks: Task[], options: {
  status: 'all' | TaskStatus; query: string; mineOnly: boolean; userId: string;
}): Task[] {
  const terms = options.query.trim().toLocaleLowerCase('de-DE').split(/\s+/).filter(Boolean);
  return tasks.filter((task) => {
    if (options.status !== 'all' && task.status !== options.status) return false;
    if (options.mineOnly && task.assigned_to !== options.userId) return false;
    const text = `${task.title} ${task.description}`.toLocaleLowerCase('de-DE');
    return terms.every((term) => text.includes(term));
  });
}

export function taskDeadline(task: Task, today: string): { text: string; overdue: boolean } {
  if (!task.due_date) return { text: 'Ohne festen Termin', overdue: false };
  const [year, month, day] = task.due_date.split('-');
  const date = `${day}.${month}.${year}`;
  if (task.status !== 'done' && task.due_date < today) return { text: `Überfällig · Termin: ${date}`, overdue: true };
  if (task.status !== 'done' && task.due_date === today) return { text: `Heute fällig · ${date}`, overdue: false };
  return { text: `Termin: ${date}`, overdue: false };
}
