import assert from 'node:assert/strict';
import { test } from 'node:test';
import { defaultPreferences, parsePreferences } from '../src/lib/preferenceValues.ts';

test('preferences default and round-trip all language/theme combinations', () => {
  assert.deepEqual(parsePreferences(null), defaultPreferences);
  for (const language of ['de', 'en']) {
    for (const themeMode of ['system', 'light', 'dark']) {
      const value = { language, themeMode };
      assert.deepEqual(parsePreferences(JSON.stringify(value)), value);
    }
  }
});

test('preferences reject corrupted, incomplete and unsupported stored data', () => {
  for (const value of ['{', 'null', '[]', '{}', '"de"', '{"language":"fr","themeMode":"dark"}', '{"language":"de","themeMode":"auto"}']) {
    assert.throws(() => parsePreferences(value));
  }
});

test('preferences only restore allowed fields', () => {
  assert.deepEqual(parsePreferences('{"language":"en","themeMode":"dark","extra":"ignored"}'), { language: 'en', themeMode: 'dark' });
});
