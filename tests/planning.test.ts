import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { de, en, translate } from '../src/lib/i18n.ts';
import { parseTask, parseMembers, validateProgress, type Task } from '../src/lib/models.ts';
import { filterTasks, sortTasks, taskDeadline } from '../src/lib/taskOverview.ts';
import { taskActionMessage } from '../src/lib/taskActions.ts';

test('Sprachen sind vollständig, Platzhalter stimmen überein und Statusmeldungen sind übersetzt', () => {
  assert.deepEqual(Object.keys(de).sort(), Object.keys(en).sort());
  for (const key of Object.keys(de) as (keyof typeof de)[]) {
    assert.ok(en[key].trim());
    assert.deepEqual(de[key].match(/\{\w+\}/g)?.sort() ?? [], en[key].match(/\{\w+\}/g)?.sort() ?? [], key);
  }
  assert.equal(translate('en', 'progressLabel', { value: 75 }), 'Completed: 75%');
  assert.equal(taskActionMessage('start', 'en'), 'The task is now in progress.');
  assert.equal(taskActionMessage('pause', 'de'), 'Die Aufgabe ist pausiert und bleibt zugewiesen.');
});

test('Fortschritt, Wichtigkeit, Aufgabenfarben und Sortierung sind konsistent', () => {
  for (const value of ['', '-1', '101', '1.5', '20%', 'abc', 'Infinity']) assert.equal(validateProgress(value), null);
  assert.equal(validateProgress('0'), 0); assert.equal(validateProgress('100'), 100); assert.equal(validateProgress(' 45 '), 45);
  const base: Task = { id: 'task', group_id: 'group', title: 'Aufbau', description: '', due_date: null,
    status: 'in_progress', created_by: 'owner', assigned_to: 'helper', version: 1, progress: 35, priority: 'normal', color: 'blue' };
  assert.deepEqual(parseTask(base), base);
  for (const changes of [{ progress: -1 }, { progress: 101 }, { progress: 1.5 }, { priority: 'invalid' }, { color: '#bad' },
    { status: 'done', progress: 99 }, { status: 'open', progress: 0 }, { assigned_to: null }]) {
    assert.throws(() => parseTask({ ...base, ...changes }));
  }
  assert.throws(() => parseMembers([{ user_id: 'someone', display_name: 123 }]));
  const urgent: Task = { ...base, id: 'urgent', priority: 'urgent', due_date: '2026-12-01' };
  const earlier: Task = { ...base, id: 'earlier', due_date: '2026-11-18' };
  const tasks = [base, urgent, earlier];
  assert.deepEqual(sortTasks(tasks).map((t) => t.id), ['urgent', 'earlier', 'task']);
  assert.deepEqual(tasks.map((t) => t.id), ['task', 'urgent', 'earlier']);
  assert.deepEqual(filterTasks(tasks, { status: 'in_progress', priority: 'urgent', query: '', mineOnly: true, userId: 'helper' }), [urgent]);
  assert.equal(taskDeadline(earlier, '2026-11-19', 'en').text, 'Overdue · Due: 2026-11-18');
});

test('Planungsdatenbank: Migration, private Namen, Zuweisungen, Fortschritt und Statuswechsel', async () => {
  const db = new PGlite();
  const owner = '00000000-0000-4000-8000-000000000001';
  const helper = '00000000-0000-4000-8000-000000000002';
  const outsider = '00000000-0000-4000-8000-000000000003';
  async function asUser(id: string) {
    await db.exec('reset role; set role authenticated;');
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
  }
  async function row(id: string) {
    return (await db.query<{ status: string; progress: number; assigned_to: string | null; version: number; priority: string; color: string }>(
      'select status,progress,assigned_to,version,priority,color from public.tasks where id=$1', [id])).rows[0];
  }
  try {
    await db.exec(`create role anon; create role authenticated;
      create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid; $$;
      grant usage on schema public,auth to authenticated,anon;
      create schema storage;
      create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,owner_id text,metadata jsonb default '{}',unique(bucket_id,name));
      alter table storage.objects enable row level security;
      grant usage on schema storage to authenticated,anon;
      grant select,insert,update,delete on storage.objects to authenticated,anon;
      insert into auth.users values ('${owner}'),('${helper}'),('${outsider}');`);
    const directory = new URL('../supabase/migrations/', import.meta.url);
    const files = (await readdir(directory)).filter((f) => f.endsWith('.sql')).sort();
    await db.exec(await readFile(new URL(files[0], directory), 'utf8'));
    await asUser(owner);
    const group = (await db.query<{ id: string }>("select public.create_group('Testverein') as id")).rows[0].id;
    const legacy = (await db.query<{ id: string }>("select public.save_task($1,'Bestehende Aufgabe','',null) as id", [group])).rows[0].id;
    await db.query("select public.change_task($1,'claim',1)", [legacy]);
    await db.query("select public.change_task($1,'complete',2)", [legacy]);
    await db.exec('reset role');
    for (const file of files.slice(1)) await db.exec(await readFile(new URL(file, directory), 'utf8'));
    await asUser(owner);
    assert.equal((await row(legacy)).progress, 100, 'Vorhandene erledigte Aufgabe wird auf 100 Prozent migriert');
    assert.equal((await row(legacy)).priority, 'normal');
    await db.query('select public.set_profile($1)', ['Koordination']);
    assert.equal((await db.query<{ name: string }>('select public.get_profile() as name')).rows[0].name, 'Koordination');
    const invite = (await db.query<{ code: string }>('select public.get_invite_code($1) as code', [group])).rows[0].code;
    const task = (await db.query<{ id: string }>("select public.save_task_details($1,'Aufbau planen','Details','2026-11-30',null,null,'urgent','purple') as id", [group])).rows[0].id;
    assert.equal((await row(task)).color, 'purple');
    assert.equal((await row(task)).priority, 'urgent');
    await assert.rejects(db.query("select public.save_task_details($1,'Aufbau planen','',null,null,null,'invalid','blue')", [group]), /invalid_request/);

    await asUser(helper);
    await db.query('select public.join_group($1)', [invite]);
    await db.query('select public.set_profile($1)', ['Helfende Person']);
    assert.equal((await db.query('select * from public.list_group_members($1)', [group])).rows.length, 2);
    await assert.rejects(db.query('select * from public.profiles'), /permission denied/);
    await assert.rejects(db.query('select public.assign_task($1,$2,1)', [task, helper]), /conflict_or_not_allowed/);
    await assert.rejects(db.query("select public.save_task_details($1,'Fremde Änderung','',null,$2,1,'low','red')", [group, task]), /conflict_or_not_allowed/);

    await asUser(outsider);
    await assert.rejects(db.query('select * from public.list_group_members($1)', [group]), /not_allowed/);
    await assert.rejects(db.query('select public.set_task_progress($1,50,1)', [task]), /conflict_or_not_allowed/);

    await asUser(owner);
    await assert.rejects(db.query('select public.assign_task($1,$2,1)', [task, outsider]), /invalid_request/);
    await db.query('select public.assign_task($1,$2,1)', [task, helper]);
    assert.equal((await row(task)).status, 'claimed');
    await assert.rejects(db.query('select public.assign_task($1,$2,1)', [task, owner]), /conflict_or_not_allowed/);
    await asUser(helper);
    await assert.rejects(db.query("select public.change_task($1,'pause',2)", [task]), /invalid_transition/);
    await db.query("select public.change_task($1,'start',2)", [task]);
    assert.equal((await row(task)).status, 'in_progress');
    await assert.rejects(db.query('select public.set_task_progress($1,101,3)', [task]), /invalid_request/);
    await db.query('select public.set_task_progress($1,45,3)', [task]);
    assert.equal((await row(task)).progress, 45);
    await db.query("select public.change_task($1,'pause',4)", [task]);
    assert.equal((await row(task)).status, 'claimed');
    assert.equal((await row(task)).progress, 45, 'Pausieren erhält den Fortschritt');
    await db.query('select public.set_task_progress($1,100,5)', [task]);
    assert.equal((await row(task)).status, 'done');
    await assert.rejects(db.query('select public.set_task_progress($1,50,6)', [task]), /invalid_request/);
    await db.query("select public.change_task($1,'reopen',6)", [task]);
    assert.equal((await row(task)).progress, 0);
    assert.equal((await row(task)).assigned_to, null);
    await db.query("select public.change_task($1,'claim',7)", [task]);
    await db.query("select public.change_task($1,'start',8)", [task]);
    await db.query("select public.change_task($1,'complete',9)", [task]);
    assert.equal((await row(task)).progress, 100);

    await asUser(owner);
    await db.query("select public.change_task($1,'reopen',10)", [task]);
    await db.query('select public.assign_task($1,$2,11)', [task, helper]);
    await db.query('select public.set_task_progress($1,70,12)', [task]);
    await db.query('select public.assign_task($1,$2,13)', [task, owner]);
    assert.equal((await row(task)).progress, 0, 'Neuzuweisung setzt Fortschritt zurück');
    await db.query("select public.change_task($1,'release',14)", [task]);
    assert.equal((await row(task)).status, 'open');
    await db.exec('reset role; set role anon');
    await db.query("select set_config('request.jwt.claim.sub','',false)");
    await assert.rejects(db.query('select public.get_profile()'), /permission denied/);
    await assert.rejects(db.query('select * from public.list_group_members($1)', [group]), /permission denied/);
  } finally { await db.close(); }
});
