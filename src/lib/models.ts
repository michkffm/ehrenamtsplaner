import { translate, type Language, type MessageKey } from './i18n.ts';

export const taskStatuses = ['open', 'claimed', 'in_progress', 'done'] as const;
export type TaskStatus = typeof taskStatuses[number];
export const taskPriorities = ['low', 'normal', 'high', 'urgent'] as const;
export type TaskPriority = typeof taskPriorities[number];
export const taskColors = ['none', 'green', 'blue', 'yellow', 'red', 'purple'] as const;
export type TaskColor = typeof taskColors[number];
export type Member = { user_id: string; display_name: string | null };

export type Task = {
  id: string; group_id: string; title: string; description: string;
  due_date: string | null; status: TaskStatus; created_by: string;
  assigned_to: string | null; version: number; priority: TaskPriority; color: TaskColor; progress: number;
};
export type Group = { id: string; name: string; owner_id: string };
export type TaskDraft = { title: string; description: string; due_date: string; priority?: TaskPriority; color?: TaskColor };

export function validateDraft(draft: TaskDraft, language: Language = 'de'): string | null {
  if (draft.title.trim().length < 3 || draft.title.trim().length > 120) {
    return translate(language, 'validationTitle');
  }
  if (draft.description.trim().length > 2000) return translate(language, 'validationDescription');
  if (draft.due_date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.due_date)) return translate(language, 'dateFormat');
    const date = new Date(`${draft.due_date}T12:00:00Z`);
    if (!Number.isFinite(date.getTime()) || date.getUTCFullYear() < 1 || date.toISOString().slice(0, 10) !== draft.due_date) {
      return translate(language, 'dateInvalid');
    }
  }
  if ((draft.priority !== undefined && !taskPriorities.includes(draft.priority)) || (draft.color !== undefined && !taskColors.includes(draft.color))) return translate(language, 'priorityInvalid');
  return null;
}

export function parseTask(value: unknown): Task {
  if (!value || typeof value !== 'object') throw new Error('invalid_data');
  const t = value as Record<string, unknown>;
  const priority = taskPriorities.find((p) => p === t.priority);
  const color = taskColors.find((c) => c === t.color);
  if (typeof t.id !== 'string' || typeof t.group_id !== 'string' || typeof t.title !== 'string'
    || typeof t.description !== 'string' || typeof t.created_by !== 'string'
    || !(t.due_date === null || typeof t.due_date === 'string')
    || !(t.assigned_to === null || typeof t.assigned_to === 'string')
    || !Number.isInteger(t.version) || typeof t.version !== 'number'
    || !(t.status === 'open' || t.status === 'claimed' || t.status === 'in_progress' || t.status === 'done')
    || !priority || !color
    || typeof t.progress !== 'number' || !Number.isInteger(t.progress) || t.progress < 0 || t.progress > 100) throw new Error('invalid_data');
  if ((t.status === 'open' && (t.assigned_to !== null || t.progress !== 0))
    || (t.status !== 'open' && t.assigned_to === null)
    || (t.status === 'done' ? t.progress !== 100 : t.progress === 100)) throw new Error('invalid_data');
  return { id: t.id, group_id: t.group_id, title: t.title, description: t.description,
    due_date: t.due_date, status: t.status, created_by: t.created_by,
    assigned_to: t.assigned_to, version: t.version,
    priority, color, progress: t.progress };
}

export function parseGroups(value: unknown): Group[] {
  if (!Array.isArray(value)) throw new Error('invalid_data');
  return value.map((g: unknown) => {
    if (!g || typeof g !== 'object' || !('id' in g) || !('name' in g)
      || !('owner_id' in g) || typeof g.owner_id !== 'string'
      || typeof g.id !== 'string' || typeof g.name !== 'string') throw new Error('invalid_data');
    return { id: g.id, name: g.name, owner_id: g.owner_id };
  });
}

export function parseMembers(value: unknown): Member[] {
  if (!Array.isArray(value)) throw new Error('invalid_data');
  return value.map((m: unknown) => {
    if (!m || typeof m !== 'object' || !('user_id' in m) || typeof m.user_id !== 'string'
      || !('display_name' in m) || !(m.display_name === null || typeof m.display_name === 'string')) throw new Error('invalid_data');
    return { user_id: m.user_id, display_name: m.display_name };
  });
}

export function validateProgress(value: string): number | null {
  if (!/^\d{1,3}$/.test(value.trim())) return null;
  const number = Number(value);
  return number >= 0 && number <= 100 ? number : null;
}

export function errorText(error: unknown, language: Language = 'de'): string {
  const code = error && typeof error === 'object' && 'code' in error ? error.code : '';
  const message = error && typeof error === 'object' && 'message' in error ? error.message : '';
  let key: MessageKey = 'networkError';
  if (code === 'invalid_credentials') key = 'credentialsError';
  if (code === 'email_not_confirmed') key = 'emailError';
  if (code === 'over_request_rate_limit' || code === 'over_email_send_rate_limit') key = 'rateError';
  if (code === 'P0001') {
    const messages: Record<string, MessageKey> = {
      invalid_invitation: 'inviteError', conflict_or_not_allowed: 'conflictError',
      invalid_transition: 'transitionError', not_allowed: 'permissionError', invalid_request: 'inputError',
    };
    key = typeof message === 'string' && Object.hasOwn(messages, message) ? messages[message] : 'actionError';
  }
  return translate(language, key);
}
