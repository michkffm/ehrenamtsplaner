begin;

-- Pending uploads are visible only to their uploader while still a group member.
create function public.list_pending_task_attachments(p_task uuid)
returns table(id uuid, task_id uuid, filename text, mime_type text, size_bytes integer,
  storage_path text, created_at timestamptz, created_by uuid, uploaded boolean)
language sql stable security definer set search_path = '' as $$
  select a.id, a.task_id, a.filename, a.mime_type, a.size_bytes, a.storage_path, a.created_at, a.created_by,
    exists(select 1 from storage.objects o where o.bucket_id = 'task-attachments' and o.name = a.storage_path)
  from public.task_attachments a join public.tasks t on t.id = a.task_id
  where a.task_id = p_task and not a.ready and a.created_by = auth.uid() and public.is_member(t.group_id)
  order by a.created_at, a.id;
$$;
revoke all on function public.list_pending_task_attachments(uuid) from public, anon;
grant execute on function public.list_pending_task_attachments(uuid) to authenticated;
commit;
