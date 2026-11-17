import assert from 'node:assert/strict';
import test from 'node:test';
import { parseGroups, parseTask, validateDraft } from '../src/lib/models.ts';

test('Aufgaben validieren: Titel, Beschreibung und echte Kalendertage', () => {
  assert.equal(validateDraft({ title: 'Helfende koordinieren', description: '', due_date: '' }), null);
  assert.equal(validateDraft({ title: 'Aufbau', description: 'Tische aufstellen', due_date: '2028-02-29' }), null);
  for (const due_date of ['2026-02-29', '2026-04-31', '17.11.2026', '2026-13-01']) {
    assert.ok(validateDraft({ title: 'Aufbau', description: '', due_date }));
  }
  assert.ok(validateDraft({ title: '  a ', description: '', due_date: '' }));
  assert.ok(validateDraft({ title: 'a'.repeat(121), description: '', due_date: '' }));
  assert.ok(validateDraft({ title: 'Aufbau', description: 'a'.repeat(2001), due_date: '' }));
});
test('Fehlerhafte API-Daten werden abgewiesen', () => {
  const task = { id: 'task', group_id: 'group', title: 'Aufbau', description: '', due_date: null,
    status: 'open', created_by: 'user', assigned_to: null, version: 1 };
  assert.deepEqual(parseTask(task), task);
  assert.throws(() => parseTask({ ...task, status: 'unknown' }));
  assert.throws(() => parseTask({ ...task, version: '1' }));
  assert.throws(() => parseTask(null));
  assert.throws(() => parseGroups([{ id: 'group', name: null }]));
  assert.throws(() => parseGroups({}));
  assert.deepEqual(parseGroups([{ id: 'group', name: 'Verein', owner_id: 'user' }]), [{ id: 'group', name: 'Verein', owner_id: 'user' }]);
});
