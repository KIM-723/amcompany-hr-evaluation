-- AMCOMPANY HR Evaluation System
-- STEP 5: Employee / organization management hardening
-- Prerequisite: STEP 1~4 migrations
-- No existing data is deleted.

begin;

create index if not exists idx_employees_position on public.employees(position_id);
create index if not exists idx_employees_status on public.employees(employment_status);
create index if not exists idx_employees_leader on public.employees(leader_id);
create index if not exists idx_departments_parent_sort on public.departments(parent_id, sort_order, name);
create index if not exists idx_positions_active_sort on public.positions(is_active, sort_order, name);
create index if not exists idx_job_levels_active_order on public.job_levels(is_active, level_order);

-- Reuse STEP 2 updated_at function so all HR master changes have consistent timestamps.
drop trigger if exists trg_departments_updated_at on public.departments;
create trigger trg_departments_updated_at before update on public.departments
for each row execute function public.set_updated_at();

drop trigger if exists trg_positions_updated_at on public.positions;
create trigger trg_positions_updated_at before update on public.positions
for each row execute function public.set_updated_at();

drop trigger if exists trg_job_levels_updated_at on public.job_levels;
create trigger trg_job_levels_updated_at before update on public.job_levels
for each row execute function public.set_updated_at();

drop trigger if exists trg_employees_updated_at on public.employees;
create trigger trg_employees_updated_at before update on public.employees
for each row execute function public.set_updated_at();

-- Prevent cyclic department hierarchies.
create or replace function public.prevent_department_cycle()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.parent_id is null then
    return new;
  end if;
  if new.parent_id = new.id then
    raise exception 'A department cannot be its own parent';
  end if;
  if exists (
    with recursive ancestors as (
      select d.id, d.parent_id from public.departments d where d.id = new.parent_id
      union all
      select d.id, d.parent_id
      from public.departments d
      join ancestors a on d.id = a.parent_id
    )
    select 1 from ancestors where id = new.id
  ) then
    raise exception 'Department hierarchy cycle detected';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_departments_prevent_cycle on public.departments;
create trigger trg_departments_prevent_cycle
before insert or update of parent_id on public.departments
for each row execute function public.prevent_department_cycle();

-- Audit HR master changes without overwriting application history.
create or replace function public.audit_hr_master_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  resource jsonb;
begin
  resource := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  insert into public.audit_logs(actor_user_id, action, resource_type, resource_id, metadata)
  values(
    auth.uid(),
    lower(tg_op),
    tg_table_name,
    resource ->> 'id',
    jsonb_build_object(
      'old', case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) else null end,
      'new', case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) else null end
    )
  );
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['employees','departments','positions','job_levels']
  loop
    execute format('drop trigger if exists trg_%s_audit_step5 on public.%I', t, t);
    execute format('create trigger trg_%s_audit_step5 after insert or update or delete on public.%I for each row execute function public.audit_hr_master_change()', t, t);
  end loop;
end $$;

commit;
