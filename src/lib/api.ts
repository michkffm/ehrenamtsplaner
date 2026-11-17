import { client } from './supabase';
import { parseGroups, parseTask, type TaskDraft } from './models';

export async function loadGroups() {
  const { data, error } = await client().from('groups').select('id,name,owner_id').order('name');
  if (error) throw error;
  return parseGroups(data);
}
export async function loadTasks(groupId: string) {
  const { data, error } = await client().from('tasks').select('*').eq('group_id', groupId)
    .order('due_date', { ascending: true, nullsFirst: false }).order('created_at', { ascending: false });
  if (error) throw error;
  if (!Array.isArray(data)) throw new Error('invalid_data');
  return data.map(parseTask);
}
export async function rpc(name: string, args: Record<string, string | number | null>) {
  const { data, error } = await client().rpc(name, args);
  if (error) throw error;
  return data as unknown;
}
export async function saveTask(groupId: string, draft: TaskDraft, id?: string, version?: number) {
  await rpc('save_task', { p_group: groupId, p_title: draft.title.trim(),
    p_description: draft.description.trim(), p_due: draft.due_date || null,
    p_id: id ?? null, p_version: version ?? null });
}
