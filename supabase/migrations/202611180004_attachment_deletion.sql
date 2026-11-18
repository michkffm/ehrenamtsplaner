begin;

-- Deletion rights do not follow task assignment: uploader or group owner only.
create function public.can_delete_task_attachment(p_path text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.task_attachments a
    join public.tasks t on t.id = a.task_id join public.groups g on g.id = t.group_id
    where a.storage_path = p_path and a.ready and public.is_member(t.group_id)
      and (a.created_by = auth.uid() or g.owner_id = auth.uid()));
$$;
create policy task_attachment_delete on storage.objects for delete to authenticated using (
  bucket_id = 'task-attachments' and public.can_delete_task_attachment(name)
);

-- Never delete Storage metadata with SQL: the Storage API removes actual bytes first.
create function public.finish_attachment_deletion(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare attachment public.task_attachments%rowtype;
begin
  select * into attachment from public.task_attachments where id = p_id for update;
  -- A repeated call after successful deletion is harmless and reveals no metadata.
  if not found then return; end if;
  if not public.can_delete_task_attachment(attachment.storage_path) then raise exception 'not_allowed'; end if;
  if exists(select 1 from storage.objects where bucket_id = 'task-attachments' and name = attachment.storage_path) then
    raise exception 'attachment_still_uploaded'; end if;
  delete from public.task_attachments where id = p_id;
end;
$$;
revoke all on function public.can_delete_task_attachment(text), public.finish_attachment_deletion(uuid) from public, anon;
grant execute on function public.can_delete_task_attachment(text), public.finish_attachment_deletion(uuid) to authenticated;
commit;
