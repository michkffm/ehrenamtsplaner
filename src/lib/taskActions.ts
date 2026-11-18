import { translate, type Language } from './i18n.ts';
export type TaskAction = 'claim' | 'release' | 'complete' | 'reopen' | 'start' | 'pause';

export function taskActionMessage(action: TaskAction, language: Language): string {
  const keys = { claim: 'claimedMessage', release: 'releasedMessage', complete: 'completedMessage', reopen: 'reopenedMessage', start: 'startedMessage', pause: 'pausedMessage' } as const;
  return translate(language, keys[action]);
}

// A failed refresh must not turn a confirmed write into an apparent save failure.
export async function performTaskAction(
  write: () => Promise<void>, refresh: () => Promise<void>,
): Promise<'refreshed' | 'refresh_failed'> {
  await write();
  try { await refresh(); return 'refreshed'; }
  catch { return 'refresh_failed'; }
}
