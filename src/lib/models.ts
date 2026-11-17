export type TaskStatus = 'open' | 'claimed' | 'done';
export type Task = {
  id: string; group_id: string; title: string; description: string;
  due_date: string | null; status: TaskStatus; created_by: string;
  assigned_to: string | null; version: number;
};
export type Group = { id: string; name: string; owner_id: string };
export type TaskDraft = { title: string; description: string; due_date: string };

export function validateDraft(draft: TaskDraft): string | null {
  if (draft.title.trim().length < 3 || draft.title.trim().length > 120) {
    return 'Der Titel muss zwischen 3 und 120 Zeichen lang sein.';
  }
  if (draft.description.trim().length > 2000) return 'Die Beschreibung darf höchstens 2000 Zeichen haben.';
  if (draft.due_date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.due_date)) return 'Bitte ein Datum im Format JJJJ-MM-TT eingeben.';
    const date = new Date(`${draft.due_date}T12:00:00Z`);
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== draft.due_date) {
      return 'Bitte ein gültiges Datum eingeben.';
    }
  }
  return null;
}

export function parseTask(value: unknown): Task {
  if (!value || typeof value !== 'object') throw new Error('invalid_data');
  const t = value as Record<string, unknown>;
  if (typeof t.id !== 'string' || typeof t.group_id !== 'string' || typeof t.title !== 'string'
    || typeof t.description !== 'string' || typeof t.created_by !== 'string'
    || !(t.due_date === null || typeof t.due_date === 'string')
    || !(t.assigned_to === null || typeof t.assigned_to === 'string')
    || !Number.isInteger(t.version) || typeof t.version !== 'number'
    || !(t.status === 'open' || t.status === 'claimed' || t.status === 'done')) throw new Error('invalid_data');
  return { id: t.id, group_id: t.group_id, title: t.title, description: t.description,
    due_date: t.due_date, status: t.status, created_by: t.created_by,
    assigned_to: t.assigned_to, version: t.version };
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

export function errorText(error: unknown): string {
  const code = error && typeof error === 'object' && 'code' in error ? error.code : '';
  if (code === 'invalid_credentials') return 'E-Mail-Adresse oder Passwort stimmen nicht.';
  if (code === 'email_not_confirmed') return 'Bitte zuerst die E-Mail-Adresse bestätigen.';
  if (code === 'over_request_rate_limit' || code === 'over_email_send_rate_limit') return 'Zu viele Versuche. Bitte später erneut versuchen.';
  if (code === 'P0001') return 'Die Aktion ist nicht möglich. Bitte aktualisieren und Berechtigung oder Einladungscode prüfen.';
  return 'Die Anfrage ist fehlgeschlagen. Bitte Verbindung prüfen und erneut versuchen.';
}
