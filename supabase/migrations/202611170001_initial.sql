begin;

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 3 and 100),
  owner_id uuid not null references auth.users(id),
  invite_code text not null unique default replace(gen_random_uuid()::text, '-', ''),
  created_at timestamptz not null default now()
);
create table public.memberships (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  primary key (group_id, user_id)
);
create index memberships_user_idx on public.memberships(user_id, group_id);
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  title text not null check (length(btrim(title)) between 3 and 120),
  description text not null default '' check (length(description) <= 2000),
  due_date date,
  status text not null default 'open' check (status in ('open', 'claimed', 'done')),
  created_by uuid not null references auth.users(id),
  assigned_to uuid references auth.users(id),
  version integer not null default 1,
  created_at timestamptz not null default now(),
  check ((status = 'open' and assigned_to is null) or (status in ('claimed', 'done') and assigned_to is not null))
);
create index tasks_group_due_idx on public.tasks(group_id, due_date, created_at);

alter table public.groups enable row level security;
alter table public.memberships enable row level security;
alter table public.tasks enable row level security;

create function public.is_member(p_group uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.memberships where group_id = p_group and user_id = auth.uid());
$$;
create policy groups_read on public.groups for select to authenticated using (public.is_member(id));
create policy memberships_read on public.memberships for select to authenticated using (user_id = auth.uid());
create policy tasks_read on public.tasks for select to authenticated using (public.is_member(group_id));

-- All writes go through narrow functions. Clients cannot change roles, ownership or assignees directly.
revoke all on public.groups, public.memberships, public.tasks from anon, authenticated;
grant select (id, name, owner_id) on public.groups to authenticated;
grant select on public.tasks to authenticated;

create function public.create_group(p_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare new_id uuid;
begin
  if auth.uid() is null or p_name is null or length(btrim(p_name)) not between 3 and 100 then
    raise exception 'invalid_request';
  end if;
  insert into public.groups(name, owner_id) values (btrim(p_name), auth.uid()) returning id into new_id;
  insert into public.memberships(group_id, user_id) values (new_id, auth.uid());
  return new_id;
end;
$$;

create function public.join_group(p_code text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare found_id uuid;
begin
  if auth.uid() is null or p_code is null or p_code !~ '^[a-f0-9]{32}$' then raise exception 'invalid_request'; end if;
  select id into found_id from public.groups where invite_code = p_code;
  if found_id is null then raise exception 'invalid_invitation'; end if;
  insert into public.memberships(group_id, user_id) values (found_id, auth.uid()) on conflict do nothing;
  return found_id;
end;
$$;

create function public.get_invite_code(p_group uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare code text;
begin
  select invite_code into code from public.groups where id = p_group and owner_id = auth.uid();
  if code is null then raise exception 'not_allowed'; end if;
  return code;
end;
$$;

create function public.save_task(p_group uuid, p_title text, p_description text, p_due date,
  p_id uuid default null, p_version integer default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare saved_id uuid;
begin
  if not public.is_member(p_group) or p_title is null or length(btrim(p_title)) not between 3 and 120
    or p_description is null or length(p_description) > 2000 then raise exception 'invalid_request'; end if;
  if p_id is null then
    insert into public.tasks(group_id, title, description, due_date, created_by)
      values (p_group, btrim(p_title), btrim(p_description), p_due, auth.uid()) returning id into saved_id;
  else
    update public.tasks set title = btrim(p_title), description = btrim(p_description),
      due_date = p_due, version = version + 1
      where id = p_id and group_id = p_group and version = p_version
        and (created_by = auth.uid() or exists(select 1 from public.groups where id = p_group and owner_id = auth.uid()))
      returning id into saved_id;
    if saved_id is null then raise exception 'conflict_or_not_allowed'; end if;
  end if;
  return saved_id;
end;
$$;

create function public.change_task(p_id uuid, p_action text, p_version integer) returns void
language plpgsql security definer set search_path = '' as $$
declare current_task public.tasks%rowtype;
begin
  select * into current_task from public.tasks where id = p_id for update;
  if not found or not public.is_member(current_task.group_id) or p_version is null
    or current_task.version <> p_version then raise exception 'conflict_or_not_allowed'; end if;
  if p_action = 'claim' and current_task.status = 'open' then
    update public.tasks set status = 'claimed', assigned_to = auth.uid(), version = version + 1 where id = p_id;
  elsif p_action = 'release' and current_task.status = 'claimed' and current_task.assigned_to = auth.uid() then
    update public.tasks set status = 'open', assigned_to = null, version = version + 1 where id = p_id;
  elsif p_action = 'complete' and current_task.status = 'claimed' and current_task.assigned_to = auth.uid() then
    update public.tasks set status = 'done', version = version + 1 where id = p_id;
  elsif p_action = 'reopen' and current_task.status = 'done' and
    (current_task.assigned_to = auth.uid() or exists(select 1 from public.groups where id = current_task.group_id and owner_id = auth.uid())) then
    update public.tasks set status = 'open', assigned_to = null, version = version + 1 where id = p_id;
  else raise exception 'invalid_transition'; end if;
end;
$$;

revoke all on function public.is_member(uuid), public.create_group(text), public.join_group(text),
  public.get_invite_code(uuid), public.save_task(uuid,text,text,date,uuid,integer),
  public.change_task(uuid,text,integer) from public, anon;
grant execute on function public.is_member(uuid), public.create_group(text), public.join_group(text),
  public.get_invite_code(uuid), public.save_task(uuid,text,text,date,uuid,integer),
  public.change_task(uuid,text,integer) to authenticated;

commit;
