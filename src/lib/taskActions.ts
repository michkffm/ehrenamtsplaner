export type TaskAction = 'claim' | 'release' | 'complete' | 'reopen';

export const taskActionMessages: Record<TaskAction, string> = {
  claim: 'Du hast die Aufgabe übernommen.',
  release: 'Die Aufgabe ist wieder für andere Helfende frei.',
  complete: 'Die Aufgabe ist als erledigt markiert. Danke fürs Mithelfen!',
  reopen: 'Die Aufgabe ist wieder geöffnet.',
};

// A failed refresh must not turn a confirmed write into an apparent save failure.
export async function performTaskAction(
  write: () => Promise<void>, refresh: () => Promise<void>,
): Promise<'refreshed' | 'refresh_failed'> {
  await write();
  try { await refresh(); return 'refreshed'; }
  catch { return 'refresh_failed'; }
}
