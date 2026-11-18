begin;

alter table public.tasks add column priority text not null default 'normal'
  check (priority in ('low', 'normal', 'high', 'urgent'));
alter table public.tasks add column color text not null default 'none'
  check (color in ('none', 'green', 'blue', 'yellow', 'red', 'purple'));
alter table public.tasks add column progress integer not null default 0 check (progress between 0 and 100);
update public.tasks set progress = 100 where status = 'done';
alter table public.tasks drop constraint tasks_status_check;
alter table public.tasks add constraint tasks_status_check check (status in ('open', 'claimed', 'in_progress', 'done'));
alter table public.tasks drop constraint tasks_check;
alter table public.tasks add constraint tasks_assignment_check check (
  (status = 'open' and assigned_to is null and progress = 0) or
  (status in ('claimed', 'in_progress') and assigned_to is not null and progress < 100) or
  (status = 'done' and assigned_to is not null and progress = 100)
);

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (length(btrim(display_name)) between 1 and 80)
);
alter table public.profiles enable row level security;
revoke all on public.profiles from public, anon, authenticated;

create function public.set_profile(p_name text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or p_name is null or length(btrim(p_name)) not between 1 and 80 then raise exception 'invalid_request'; end if;
  insert into public.profiles(user_id, display_name) values (auth.uid(), btrim(p_name))
    on conflict (user_id) do update set display_name = excluded.display_name;
end;
$$;
create function public.get_profile() returns text
language sql stable security definer set search_path = '' as $$
  select display_name from public.profiles where user_id = auth.uid();
$$;
create function public.list_group_members(p_group uuid) returns table(user_id uuid, display_name text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_member(p_group) then raise exception 'not_allowed'; end if;
  return query select m.user_id, p.display_name from public.memberships m
    left join public.profiles p on p.user_id = m.user_id
    where m.group_id = p_group order by p.display_name nulls last, m.user_id;
end;
$$;

create function public.save_task_details(p_group uuid, p_title text, p_description text, p_due date,
  p_id uuid default null, p_version integer default null, p_priority text default 'normal', p_color text default 'none') returns uuid
language plpgsql security definer set search_path = '' as $$
declare saved_id uuid;
begin
  if p_priority is null or p_priority not in ('low','normal','high','urgent')
    or p_color is null or p_color not in ('none','green','blue','yellow','red','purple') then raise exception 'invalid_request'; end if;
  saved_id := public.save_task(p_group, p_title, p_description, p_due, p_id, p_version);
  update public.tasks set priority = p_priority, color = p_color where id = saved_id;
  return saved_id;
end;
$$;

create or replace function public.change_task(p_id uuid, p_action text, p_version integer) returns void
language plpgsql security definer set search_path = '' as $$
declare current_task public.tasks%rowtype; can_manage boolean;
begin
  select * into current_task from public.tasks where id = p_id for update;
  if not found or not public.is_member(current_task.group_id) or p_version is null
    or current_task.version <> p_version then raise exception 'conflict_or_not_allowed'; end if;
  can_manage := current_task.assigned_to = auth.uid() or exists(
    select 1 from public.groups where id = current_task.group_id and owner_id = auth.uid());
  if p_action = 'claim' and current_task.status = 'open' then
    update public.tasks set status = 'claimed', assigned_to = auth.uid(), progress = 0, version = version + 1 where id = p_id;
  elsif p_action = 'release' and current_task.status in ('claimed', 'in_progress') and can_manage then
    update public.tasks set status = 'open', assigned_to = null, progress = 0, version = version + 1 where id = p_id;
  elsif p_action = 'start' and current_task.status = 'claimed' and can_manage then
    update public.tasks set status = 'in_progress', version = version + 1 where id = p_id;
  elsif p_action = 'pause' and current_task.status = 'in_progress' and can_manage then
    update public.tasks set status = 'claimed', version = version + 1 where id = p_id;
  elsif p_action = 'complete' and current_task.status in ('claimed', 'in_progress') and can_manage then
    update public.tasks set status = 'done', progress = 100, version = version + 1 where id = p_id;
  elsif p_action = 'reopen' and current_task.status = 'done' and can_manage then
    update public.tasks set status = 'open', assigned_to = null, progress = 0, version = version + 1 where id = p_id;
  else raise exception 'invalid_transition'; end if;
end;
$$;

create function public.assign_task(p_id uuid, p_user uuid, p_version integer) returns void
language plpgsql security definer set search_path = '' as $$
declare current_task public.tasks%rowtype;
begin
  select * into current_task from public.tasks where id = p_id for update;
  if not found or p_version is null or current_task.version <> p_version or current_task.status = 'done'
    or not exists(select 1 from public.groups where id = current_task.group_id and owner_id = auth.uid()) then
    raise exception 'conflict_or_not_allowed'; end if;
  if p_user is not null and not exists(select 1 from public.memberships where group_id = current_task.group_id and user_id = p_user) then
    raise exception 'invalid_request'; end if;
  update public.tasks set assigned_to = p_user, progress = 0,
    status = case when p_user is null then 'open' else 'claimed' end, version = version + 1 where id = p_id;
end;
$$;

create function public.set_task_progress(p_id uuid, p_progress integer, p_version integer) returns void
language plpgsql security definer set search_path = '' as $$
declare current_task public.tasks%rowtype;
begin
  select * into current_task from public.tasks where id = p_id for update;
  if not found or p_version is null or current_task.version <> p_version or not public.is_member(current_task.group_id)
    or not (current_task.assigned_to = auth.uid() or exists(select 1 from public.groups where id = current_task.group_id and owner_id = auth.uid())) then
    raise exception 'conflict_or_not_allowed'; end if;
  if current_task.status not in ('claimed','in_progress') or p_progress is null or p_progress not between 0 and 100 then
    raise exception 'invalid_request'; end if;
  update public.tasks set progress = p_progress, status = case when p_progress = 100 then 'done' else 'in_progress' end,
    version = version + 1 where id = p_id;
end;
$$;

revoke all on function public.set_profile(text), public.get_profile(), public.list_group_members(uuid),
  public.save_task_details(uuid,text,text,date,uuid,integer,text,text), public.assign_task(uuid,uuid,integer),
  public.set_task_progress(uuid,integer,integer) from public, anon;
grant execute on function public.set_profile(text), public.get_profile(), public.list_group_members(uuid),
  public.save_task_details(uuid,text,text,date,uuid,integer,text,text), public.assign_task(uuid,uuid,integer),
  public.set_task_progress(uuid,integer,integer) to authenticated;
commit;
