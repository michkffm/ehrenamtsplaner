import assert from 'node:assert/strict';
import test from 'node:test';
import type { Task } from '../src/lib/models.ts';
import { filterTasks, localDateKey, taskDeadline } from '../src/lib/taskOverview.ts';

const open: Task = { id: '1', group_id: 'verein', title: 'Tische aufbauen', description: 'Für das Sommerfest',
  due_date: '2026-11-16', status: 'open', created_by: 'ich', assigned_to: null, version: 1 };
const mine: Task = { ...open, id: '2', title: 'Küche vorbereiten', description: 'Tische reinigen', status: 'claimed', assigned_to: 'ich' };
const other: Task = { ...mine, id: '3', assigned_to: 'jemand-anderes' };
const done: Task = { ...mine, id: '4', status: 'done' };
const tasks = [open, mine, other, done];
const options = { status: 'all' as const, query: '', mineOnly: false, userId: 'ich' };

test('Suche ignoriert Großschreibung und zusätzliche Leerzeichen, sucht in Titel und Beschreibung', () => {
  assert.deepEqual(filterTasks(tasks, { ...options, query: '  TISCHE  sommerfest ' }), [open]);
  assert.deepEqual(filterTasks(tasks, { ...options, query: 'küche' }), [mine, other, done]);
  assert.deepEqual(filterTasks(tasks, { ...options, query: '   ' }), tasks);
  assert.deepEqual(filterTasks(tasks, { ...options, query: 'unbekannt' }), []);
  assert.deepEqual(filterTasks([], options), []);
});
test('Meine Aufgaben meint übernommene Aufgaben und lässt sich mit Suche und Status kombinieren', () => {
  assert.deepEqual(filterTasks(tasks, { ...options, mineOnly: true }), [mine, done]);
  assert.deepEqual(filterTasks(tasks, { ...options, mineOnly: true, status: 'claimed', query: 'reinigen' }), [mine]);
  assert.deepEqual(filterTasks(tasks, { ...options, mineOnly: true, status: 'open' }), []);
  assert.deepEqual(filterTasks(tasks, { ...options, status: 'done' }), [done]);
  assert.deepEqual(tasks, [open, mine, other, done]);
});
test('Termine beachten Tagesgrenzen, Jahreswechsel und erledigte Aufgaben', () => {
  assert.deepEqual(taskDeadline(open, '2026-11-17'), { text: 'Überfällig · Termin: 16.11.2026', overdue: true });
  assert.deepEqual(taskDeadline(open, '2026-11-16'), { text: 'Heute fällig · 16.11.2026', overdue: false });
  assert.deepEqual(taskDeadline(open, '2026-11-15'), { text: 'Termin: 16.11.2026', overdue: false });
  assert.equal(taskDeadline(done, '2026-11-17').overdue, false);
  assert.equal(taskDeadline({ ...open, due_date: null }, '2026-11-17').text, 'Ohne festen Termin');
  assert.equal(taskDeadline({ ...open, due_date: '2026-12-31' }, '2027-01-01').overdue, true);
  assert.equal(localDateKey(new Date(2026, 0, 2, 0, 1)), '2026-01-02');
  assert.equal(localDateKey(new Date(2026, 10, 17, 23, 59)), '2026-11-17');
});
