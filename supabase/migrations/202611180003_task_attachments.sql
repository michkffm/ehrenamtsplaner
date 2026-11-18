begin;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('task-attachments', 'task-attachments', false, 10485760,
  array['image/jpeg','image/png','image/webp','image/heic','image/heif','application/pdf'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table public.task_attachments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id),
  filename text not null check (length(btrim(filename)) between 1 and 120),
  mime_type text not null check (mime_type in ('image/jpeg','image/png','image/webp','image/heic','image/heif','application/pdf')),
  size_bytes integer not null check (size_bytes between 1 and 10485760),
  storage_path text not null unique,
  created_by uuid not null references auth.users(id),
  ready boolean not null default false,
  created_at timestamptz not null default now()
);
create index task_attachments_task_idx on public.task_attachments(task_id, created_at);
alter table public.task_attachments enable row level security;
revoke all on public.task_attachments from public, anon, authenticated;
grant select on public.task_attachments to authenticated;
create policy attachment_metadata_read on public.task_attachments for select to authenticated using (
  ready and exists(select 1 from public.tasks t where t.id = task_id and public.is_member(t.group_id))
);

create function public.can_access_task_attachment(p_path text, p_write boolean default false) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.task_attachments a join public.tasks t on t.id = a.task_id
    where a.storage_path = p_path and public.is_member(t.group_id)
      and case when p_write then a.created_by = auth.uid() and not a.ready
        else a.ready or a.created_by = auth.uid() end);
$$;
create policy task_attachment_upload on storage.objects for insert to authenticated with check (
  bucket_id = 'task-attachments' and owner_id = auth.uid()::text and public.can_access_task_attachment(name, true)
);
create policy task_attachment_read on storage.objects for select to authenticated using (
  bucket_id = 'task-attachments' and public.can_access_task_attachment(name, false)
);

create function public.begin_task_attachment(p_task uuid, p_filename text, p_mime text, p_size integer)
returns table(attachment_id uuid, storage_path text)
language plpgsql security definer set search_path = '' as $$
declare group_id uuid; new_id uuid; new_path text; extension text; safe_name text;
begin
  select t.group_id into group_id from public.tasks t where t.id = p_task;
  if group_id is null or not public.is_member(group_id) then raise exception 'not_allowed'; end if;
  if p_size is null or p_size not between 1 and 10485760 or p_filename is null then raise exception 'invalid_request'; end if;
  extension := case p_mime when 'image/jpeg' then 'jpg' when 'image/png' then 'png' when 'image/webp' then 'webp'
    when 'image/heic' then 'heic' when 'image/heif' then 'heif' when 'application/pdf' then 'pdf' else null end;
  safe_name := left(btrim(regexp_replace(p_filename, '[[:cntrl:]/\\]', '_', 'g')), 120);
  if extension is null or length(safe_name) < 1 then raise exception 'invalid_request'; end if;
  new_id := gen_random_uuid();
  new_path := group_id::text || '/' || p_task::text || '/' || new_id::text || '.' || extension;
  insert into public.task_attachments(id, task_id, filename, mime_type, size_bytes, storage_path, created_by)
    values(new_id, p_task, safe_name, p_mime, p_size, new_path, auth.uid());
  return query select new_id, new_path;
end;
$$;

create function public.finish_task_attachment(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare attachment public.task_attachments%rowtype;
begin
  select * into attachment from public.task_attachments where id = p_id for update;
  if not found or attachment.created_by <> auth.uid() or auth.uid() is null
    or not exists(select 1 from public.tasks t where t.id = attachment.task_id and public.is_member(t.group_id)) then
    raise exception 'not_allowed'; end if;
  if not exists(select 1 from storage.objects o where o.bucket_id = 'task-attachments'
    and o.name = attachment.storage_path and o.owner_id = auth.uid()::text
    and o.metadata->>'size' = attachment.size_bytes::text
    and o.metadata->>'mimetype' = attachment.mime_type) then raise exception 'attachment_not_uploaded'; end if;
  update public.task_attachments set ready = true where id = p_id;
end;
$$;

revoke all on function public.can_access_task_attachment(text,boolean), public.begin_task_attachment(uuid,text,text,integer),
  public.finish_task_attachment(uuid) from public, anon;
grant execute on function public.can_access_task_attachment(text,boolean), public.begin_task_attachment(uuid,text,text,integer),
  public.finish_task_attachment(uuid) to authenticated;
commit;
