import assert from 'node:assert/strict';
import test from 'node:test';
import { adjacentCalendarMonth, calendarDays, calendarValue, parseCalendarValue } from '../src/lib/calendar.ts';
import { taskColorValue } from '../src/lib/taskColors.ts';

test('Kalender validiert manuelle Datumswerte ohne Überlauf und unterstützt Schaltjahre', () => {
  assert.deepEqual(parseCalendarValue('2028-02-29'), { year: 2028, month: 1, day: 29 });
  assert.deepEqual(parseCalendarValue('0001-01-01'), { year: 1, month: 0, day: 1 });
  for (const value of ['', '2026-02-29', '2026-04-31', '2026-13-01', '2026-00-01', '2026-01-00',
    '0000-01-01', '10000-01-01', '2026-2-03', '21.11.2026']) assert.equal(parseCalendarValue(value), null);
  assert.equal(calendarValue(2026, 0, 9), '2026-01-09');
});

test('Kalenderraster beginnt montags und enthält jeden echten Monatstag genau einmal', () => {
  const february = calendarDays(2028, 1);
  assert.equal(february[0], null);
  assert.equal(february[1], 1);
  assert.deepEqual(february.filter(day => day !== null), Array.from({ length: 29 }, (_, i) => i + 1));
  const november = calendarDays(2026, 10);
  assert.equal(november[6], 1);
  assert.equal(november.length, 42);
  assert.equal(calendarDays(1, 0)[0], 1);
});

test('Monatswechsel funktionieren über Jahresgrenzen und bleiben im unterstützten Bereich', () => {
  assert.deepEqual(adjacentCalendarMonth(2026, 11, 1), { year: 2027, month: 0 });
  assert.deepEqual(adjacentCalendarMonth(2026, 0, -1), { year: 2025, month: 11 });
  assert.deepEqual(adjacentCalendarMonth(1, 0, -1), { year: 1, month: 0 });
  assert.deepEqual(adjacentCalendarMonth(9999, 11, 1), { year: 9999, month: 11 });
});

test('Aufgabenfarben besitzen in beiden Darstellungen echte, unterscheidbare Farbtöne', () => {
  for (const dark of [true, false]) {
    const values = (['green', 'blue', 'yellow', 'red', 'purple'] as const).map(color => taskColorValue(color, dark, '#ABCDEF'));
    assert.equal(new Set(values).size, 5);
    assert.ok(values.every(value => /^#[0-9A-F]{6}$/.test(value)));
    assert.equal(taskColorValue('none', dark, '#ABCDEF'), '#ABCDEF');
  }
});
