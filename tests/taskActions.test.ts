import assert from 'node:assert/strict';
import test from 'node:test';
import { performTaskAction } from '../src/lib/taskActions.ts';

test('Erfolgreiche Änderungen werden gespeichert und anschließend aktualisiert', async () => {
  const calls: string[] = [];
  const result = await performTaskAction(async () => { calls.push('write'); }, async () => { calls.push('refresh'); });
  assert.equal(result, 'refreshed');
  assert.deepEqual(calls, ['write', 'refresh']);
});
test('Fehler beim Aktualisieren wiederholen keine bereits gespeicherte Änderung', async () => {
  let writes = 0;
  const result = await performTaskAction(async () => { writes += 1; }, async () => { throw new Error('offline'); });
  assert.equal(result, 'refresh_failed');
  assert.equal(writes, 1);
});
test('Fehlgeschlagene Schreibaktionen werden nicht als Erfolg behandelt', async () => {
  let refreshed = false;
  const failure = new Error('write_failed');
  await assert.rejects(performTaskAction(async () => { throw failure; }, async () => { refreshed = true; }), (error) => error === failure);
  assert.equal(refreshed, false);
});
