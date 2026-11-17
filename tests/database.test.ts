import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';

test('Datenbank: Vereinsgrenzen, Schreibrechte und Aufgabenzustände', async () => {
  const db = new PGlite();
  const owner = '00000000-0000-4000-8000-000000000001';
  const helper = '00000000-0000-4000-8000-000000000002';
  const outsider = '00000000-0000-4000-8000-000000000003';
  async function asUser(id: string) {
    await db.exec('reset role; set role authenticated;');
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
  }
  try {
    // Synthetic authentication context only; no real accounts or network connections.
    await db.exec(`
      create role anon; create role authenticated;
      create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$
        select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
      $$;
      grant usage on schema public, auth to authenticated, anon;
      insert into auth.users values ('${owner}'), ('${helper}'), ('${outsider}');
    `);
    await db.exec(await readFile(new URL('../supabase/migrations/202611170001_initial.sql', import.meta.url), 'utf8'));
    await asUser(owner);
    const group = (await db.query<{ id: string }>("select public.create_group('Helferverein') as id")).rows[0].id;
    const invite = (await db.query<{ code: string }>('select public.get_invite_code($1) as code', [group])).rows[0].code;
    assert.match(invite, /^[a-f0-9]{32}$/);
    const task = (await db.query<{ id: string }>(
      "select public.save_task($1, 'Tische aufbauen', '', null) as id", [group])).rows[0].id;
    await assert.rejects(db.query('select invite_code from public.groups'), /permission denied/);
    await assert.rejects(db.query("update public.tasks set title = 'Manipuliert'"), /permission denied/);
    await assert.rejects(db.query("select public.save_task($1, 'a', '', null)", [group]), /invalid_request/);

    await asUser(outsider);
    const otherGroup = (await db.query<{ id: string }>("select public.create_group('Anderer Verein') as id")).rows[0].id;
    assert.equal((await db.query('select * from public.tasks')).rows.length, 0);
    assert.equal((await db.query('select id,name,owner_id from public.groups')).rows.length, 1);
    await assert.rejects(db.query('select public.get_invite_code($1)', [group]), /not_allowed/);
    await assert.rejects(db.query("select public.save_task($1, 'Fremde Aufgabe', '', null)", [group]), /invalid_request/);
    await assert.rejects(db.query("select public.change_task($1, 'claim', 1)", [task]), /conflict_or_not_allowed/);
    await assert.rejects(db.query('select public.join_group($1)', ['a'.repeat(32)]), /invalid_invitation/);

    await asUser(helper);
    await db.query('select public.join_group($1)', [invite]);
    await db.query('select public.join_group($1)', [invite]);
    assert.equal((await db.query('select * from public.tasks')).rows.length, 1);
    assert.equal((await db.query('select id from public.groups where id = $1', [otherGroup])).rows.length, 0);
    await assert.rejects(db.query('select public.get_invite_code($1)', [group]), /not_allowed/);
    await assert.rejects(db.query("select public.save_task($1, 'Fremde Änderung', '', null, $2, 1)", [group, task]), /conflict_or_not_allowed/);
    await db.query("select public.change_task($1, 'claim', 1)", [task]);

    await asUser(owner);
    // Two requests with the same version cannot both claim the task.
    await assert.rejects(db.query("select public.change_task($1, 'claim', 1)", [task]), /conflict_or_not_allowed/);
    await assert.rejects(db.query("select public.change_task($1, 'complete', 2)", [task]), /invalid_transition/);
    await assert.rejects(db.query("select public.change_task($1, 'release', 2)", [task]), /invalid_transition/);

    await asUser(helper);
    await db.query("select public.change_task($1, 'complete', 2)", [task]);
    assert.equal((await db.query<{ status: string }>('select status from public.tasks')).rows[0].status, 'done');
    await db.query("select public.change_task($1, 'reopen', 3)", [task]);
    await db.query("select public.change_task($1, 'claim', 4)", [task]);
    await db.query("select public.change_task($1, 'release', 5)", [task]);
    const row = (await db.query<{ status: string; assigned_to: string | null; version: number }>('select status,assigned_to,version from public.tasks')).rows[0];
    assert.deepEqual(row, { status: 'open', assigned_to: null, version: 6 });

    await db.exec('reset role; set role anon;');
    await db.query("select set_config('request.jwt.claim.sub', '', false)");
    await assert.rejects(db.query('select * from public.tasks'), /permission denied/);
    await assert.rejects(db.query("select public.create_group('Unbefugt')"), /permission denied/);
  } finally { await db.close(); }
});
