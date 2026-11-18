import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { attachmentType, cleanAttachmentName, maxAttachmentBytes, parseAttachments } from '../src/lib/attachmentFiles.ts';

test('Anhänge: erlaubte Dateikennungen, Namen und Größen werden geprüft', () => {
  assert.equal(attachmentType(new Uint8Array([137,80,78,71,13,10,26,10])), 'image/png');
  assert.equal(attachmentType(new Uint8Array([255,216,255,224])), 'image/jpeg');
  assert.equal(attachmentType(new TextEncoder().encode('%PDF-1.7\n')), 'application/pdf');
  assert.equal(attachmentType(new TextEncoder().encode('RIFF0000WEBP')), 'image/webp');
  assert.equal(attachmentType(new Uint8Array([0,0,0,24,...new TextEncoder().encode('ftypheic')])), 'image/heic');
  for (const content of ['', '<script>alert(1)</script>', '<svg></svg>', 'MZbinary']) assert.equal(attachmentType(new TextEncoder().encode(content)), null);
  assert.equal(cleanAttachmentName('../test\\foto\u0000.jpg'), '.._test_foto_.jpg');
  assert.equal(cleanAttachmentName('a'.repeat(200)).length, 120);
  const row = { id:'file', task_id:'task', filename:'foto.jpg', mime_type:'image/jpeg', size_bytes:100, storage_path:'group/task/file.jpg', created_at:'2026-11-18', created_by:'uploader' };
  assert.equal(parseAttachments([row])[0].size_bytes, 100);
  for (const invalid of [{size_bytes:0},{size_bytes:maxAttachmentBytes+1},{mime_type:'text/html'},{filename:''},{size_bytes:1.5}]) {
    assert.throws(() => parseAttachments([{...row,...invalid}]));
  }
  assert.throws(() => parseAttachments(null));
});

test('Anhangsregeln: privater Speicher, Vereinsgrenzen, Uploadbesitz und bestätigte Metadaten', async () => {
  const db = new PGlite();
  const owner = '00000000-0000-4000-8000-000000000001';
  const helper = '00000000-0000-4000-8000-000000000002';
  const outsider = '00000000-0000-4000-8000-000000000003';
  async function asUser(id: string) {
    await db.exec('reset role; set role authenticated');
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  }
  async function slot(task: string, name = 'foto.jpg', mime = 'image/jpeg', size = 100) {
    return (await db.query<{attachment_id:string;storage_path:string}>(
      'select * from public.begin_task_attachment($1,$2,$3,$4)', [task,name,mime,size])).rows[0];
  }
  try {
    // Only the Storage metadata schema is emulated here; no real file service or network is used.
    await db.exec(`create role anon; create role authenticated;
      create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid; $$;
      grant usage on schema public,auth to authenticated,anon;
      insert into auth.users values ('${owner}'),('${helper}'),('${outsider}');
      create schema storage;
      create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,owner_id text,metadata jsonb default '{}',unique(bucket_id,name));
      alter table storage.objects enable row level security;
      grant usage on schema storage to authenticated,anon;
      grant select,insert,update,delete on storage.objects to authenticated,anon;`);
    const directory = new URL('../supabase/migrations/', import.meta.url);
    for (const file of (await readdir(directory)).filter((f) => f.endsWith('.sql')).sort()) {
      await db.exec(await readFile(new URL(file, directory), 'utf8'));
    }
    assert.equal((await db.query<{public:boolean}>("select public from storage.buckets where id='task-attachments'")).rows[0].public, false);
    await asUser(owner);
    const group = (await db.query<{id:string}>("select public.create_group('Datei-Testverein') as id")).rows[0].id;
    const task = (await db.query<{id:string}>("select public.save_task($1,'Unterlagen sammeln','',null) as id",[group])).rows[0].id;
    const invite = (await db.query<{code:string}>('select public.get_invite_code($1) as code',[group])).rows[0].code;
    const upload = await slot(task);
    assert.ok(upload.storage_path.startsWith(`${group}/${task}/`));
    await assert.rejects(slot(task,'test.html','text/html'),/invalid_request/);
    await assert.rejects(slot(task,'leer.pdf','application/pdf',0),/invalid_request/);
    await assert.rejects(slot(task,'gross.pdf','application/pdf',maxAttachmentBytes+1),/invalid_request/);
    await assert.rejects(db.query('select public.finish_task_attachment($1)',[upload.attachment_id]),/attachment_not_uploaded/);
    await assert.rejects(db.query("insert into storage.objects(bucket_id,name,owner_id,metadata) values('task-attachments','arbitrary/path.jpg',$1,'{}')",[owner]),/row-level security/);

    await asUser(helper); await db.query('select public.join_group($1)',[invite]);
    assert.equal((await db.query('select * from public.task_attachments')).rows.length,0);
    await assert.rejects(db.query("insert into storage.objects(bucket_id,name,owner_id,metadata) values('task-attachments',$1,$2,'{}')",[upload.storage_path,helper]),/row-level security/);
    await assert.rejects(db.query('select public.finish_task_attachment($1)',[upload.attachment_id]),/not_allowed/);

    await asUser(owner);
    await db.query("insert into storage.objects(bucket_id,name,owner_id,metadata) values('task-attachments',$1,$2,$3)",[upload.storage_path,owner,JSON.stringify({size:100,mimetype:'image/jpeg'})]);
    await db.query('select public.finish_task_attachment($1)',[upload.attachment_id]);
    await db.query('select public.finish_task_attachment($1)',[upload.attachment_id]);
    assert.equal((await db.query('select * from public.task_attachments')).rows.length,1);
    const mismatch = await slot(task,'zweites.jpg');
    await db.query("insert into storage.objects(bucket_id,name,owner_id,metadata) values('task-attachments',$1,$2,$3)",[mismatch.storage_path,owner,JSON.stringify({size:99,mimetype:'image/jpeg'})]);
    await assert.rejects(db.query('select public.finish_task_attachment($1)',[mismatch.attachment_id]),/attachment_not_uploaded/);
    await assert.rejects(db.query("update public.task_attachments set ready=true where id=$1",[mismatch.attachment_id]),/permission denied/);
    assert.equal((await db.query('select * from public.task_attachments')).rows.length,1);

    await asUser(helper);
    assert.equal((await db.query('select * from public.task_attachments')).rows.length,1);
    assert.equal((await db.query('select * from storage.objects')).rows.length,1);
    assert.equal((await db.query("update storage.objects set metadata='{}' returning id")).rows.length,0);
    assert.equal((await db.query('delete from storage.objects returning id')).rows.length,0);

    // A member cannot delete another person's upload, even by calling the RPC directly.
    await assert.rejects(db.query('select public.finish_attachment_deletion($1)',[upload.attachment_id]),/not_allowed/);
    const ownUpload = await slot(task, 'eigene-datei.jpg');
    await db.query("insert into storage.objects(bucket_id,name,owner_id,metadata) values('task-attachments',$1,$2,$3)",
      [ownUpload.storage_path,helper,JSON.stringify({size:100,mimetype:'image/jpeg'})]);
    await db.query('select public.finish_task_attachment($1)',[ownUpload.attachment_id]);
    await assert.rejects(db.query('select public.finish_attachment_deletion($1)',[ownUpload.attachment_id]),/attachment_still_uploaded/);
    assert.equal((await db.query('delete from storage.objects where name=$1 returning id',[ownUpload.storage_path])).rows.length,1);
    await db.query('select public.finish_attachment_deletion($1)',[ownUpload.attachment_id]);
    await db.query('select public.finish_attachment_deletion($1)',[ownUpload.attachment_id]);
    assert.equal((await db.query('select * from public.task_attachments')).rows.length,1);

    const managedUpload = await slot(task, 'vereinsdatei.jpg');
    await db.query("insert into storage.objects(bucket_id,name,owner_id,metadata) values('task-attachments',$1,$2,$3)",
      [managedUpload.storage_path,helper,JSON.stringify({size:100,mimetype:'image/jpeg'})]);
    await db.query('select public.finish_task_attachment($1)',[managedUpload.attachment_id]);
    await asUser(owner);
    assert.equal((await db.query('delete from storage.objects where name=$1 returning id',[managedUpload.storage_path])).rows.length,1);
    await db.query('select public.finish_attachment_deletion($1)',[managedUpload.attachment_id]);

    await asUser(outsider);
    assert.equal((await db.query('select * from public.task_attachments')).rows.length,0);
    assert.equal((await db.query('select * from storage.objects')).rows.length,0);
    await assert.rejects(slot(task),/not_allowed/);
    assert.equal((await db.query('delete from storage.objects where name=$1 returning id',[upload.storage_path])).rows.length,0);
    await assert.rejects(db.query('select public.finish_attachment_deletion($1)',[upload.attachment_id]),/not_allowed/);

    await asUser(owner);
    await assert.rejects(db.query('select public.finish_attachment_deletion($1)',[upload.attachment_id]),/attachment_still_uploaded/);
    assert.equal((await db.query('delete from storage.objects where name=$1 returning id',[upload.storage_path])).rows.length,1);
    await db.query('select public.finish_attachment_deletion($1)',[upload.attachment_id]);
    assert.equal((await db.query('select * from public.task_attachments')).rows.length,0);
    // Unconfirmed uploads remain outside this deletion flow.
    assert.equal((await db.query('delete from storage.objects where name=$1 returning id',[mismatch.storage_path])).rows.length,0);
    await db.exec('reset role; set role anon');
    await db.query("select set_config('request.jwt.claim.sub','',false)");
    assert.equal((await db.query('select * from storage.objects')).rows.length,0);
    await assert.rejects(db.query('select * from public.task_attachments'),/permission denied/);
    await assert.rejects(db.query('select public.finish_attachment_deletion($1)',[upload.attachment_id]),/permission denied/);
  } finally { await db.close(); }
});
