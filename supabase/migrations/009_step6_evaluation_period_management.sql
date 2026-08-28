-- AMCOMPANY HR Evaluation System
-- STEP 6: Evaluation Period Management
-- Prerequisite: STEP 1~5 + STEP 5 service_role permission fix
-- Existing data is preserved.

begin;

-- -----------------------------------------------------------------------------
-- 1. Period master hardening
-- -----------------------------------------------------------------------------
alter table public.evaluation_periods
  add column if not exists description text,
  add column if not exists copied_from_id uuid references public.evaluation_periods(id);

create index if not exists idx_evaluation_periods_status_dates
  on public.evaluation_periods(status, start_date desc, end_date desc);

create index if not exists idx_evaluation_periods_copied_from
  on public.evaluation_periods(copied_from_id)
  where copied_from_id is not null;

-- Allow assignment creation before the immutable activation snapshot is made.
alter table public.evaluation_assignments
  alter column employee_snapshot set default '{}'::jsonb,
  alter column evaluator_snapshot set default '{}'::jsonb,
  alter column template_snapshot set default '{}'::jsonb;

-- STEP 2 snapshot helper uses pgcrypto digest from the extensions schema.
alter function public.create_assignment_snapshot(uuid, uuid)
  set search_path = public, extensions;

-- -----------------------------------------------------------------------------
-- 2. Date validation
-- -----------------------------------------------------------------------------
create or replace function public.validate_evaluation_period_dates()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  d date;
begin
  if new.start_date > new.end_date then
    raise exception '전체 평가기간 종료일은 시작일보다 빠를 수 없습니다.';
  end if;

  if new.self_start_date is not null and new.self_end_date is not null
     and new.self_start_date > new.self_end_date then
    raise exception '자기평가 종료일은 시작일보다 빠를 수 없습니다.';
  end if;

  if new.first_start_date is not null and new.first_end_date is not null
     and new.first_start_date > new.first_end_date then
    raise exception '1차 평가 종료일은 시작일보다 빠를 수 없습니다.';
  end if;

  if new.second_start_date is not null and new.second_end_date is not null
     and new.second_start_date > new.second_end_date then
    raise exception '2차 평가 종료일은 시작일보다 빠를 수 없습니다.';
  end if;

  if new.calibration_start_date is not null and new.calibration_end_date is not null
     and new.calibration_start_date > new.calibration_end_date then
    raise exception 'Calibration 종료일은 시작일보다 빠를 수 없습니다.';
  end if;

  foreach d in array array[
    new.self_start_date, new.self_end_date,
    new.first_start_date, new.first_end_date,
    new.second_start_date, new.second_end_date,
    new.calibration_start_date, new.calibration_end_date
  ]
  loop
    if d is not null and (d < new.start_date or d > new.end_date) then
      raise exception '세부 평가 일정은 전체 평가기간 안에 있어야 합니다.';
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists trg_evaluation_period_dates_step6 on public.evaluation_periods;
create trigger trg_evaluation_period_dates_step6
before insert or update on public.evaluation_periods
for each row execute function public.validate_evaluation_period_dates();

drop trigger if exists trg_evaluation_periods_updated_at on public.evaluation_periods;
create trigger trg_evaluation_periods_updated_at
before update on public.evaluation_periods
for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 3. Period activation: create immutable assignment snapshots once
-- -----------------------------------------------------------------------------
create or replace function public.activate_evaluation_period(
  p_period_id uuid,
  p_created_by uuid default null
)
returns table(total_assignments integer, snapshots_created integer)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  r record;
  v_total integer := 0;
  v_created integer := 0;
  v_status text;
begin
  if coalesce(auth.role(), '') <> 'service_role' and not public.is_hr_admin() then
    raise exception '평가기간을 활성화할 권한이 없습니다.' using errcode = '42501';
  end if;

  select status
    into v_status
    from public.evaluation_periods
   where id = p_period_id
   for update;

  if not found then
    raise exception '평가기간을 찾을 수 없습니다.';
  end if;

  if v_status in ('calibration', 'closed') then
    raise exception 'Calibration 또는 종료된 평가기간은 다시 시작할 수 없습니다.';
  end if;

  select count(*)
    into v_total
    from public.evaluation_assignments
   where period_id = p_period_id;

  if v_total = 0 then
    raise exception '평가대상자가 없습니다. 평가대상자를 먼저 지정해주세요.';
  end if;

  for r in
    select a.id
      from public.evaluation_assignments a
     where a.period_id = p_period_id
     order by a.assigned_at, a.id
  loop
    if not exists (
      select 1
        from public.evaluation_snapshots s
       where s.assignment_id = r.id
    ) then
      perform public.create_assignment_snapshot(r.id, p_created_by);
      v_created := v_created + 1;
    end if;

    update public.evaluation_assignments
       set current_stage = case
             when current_stage = 'not_started' then 'self'
             else current_stage
           end,
           started_at = coalesce(started_at, now()),
           updated_at = now()
     where id = r.id;
  end loop;

  update public.evaluation_periods
     set status = 'active',
         activated_at = coalesce(activated_at, now()),
         updated_by = p_created_by,
         updated_at = now()
   where id = p_period_id;

  return query select v_total, v_created;
end;
$$;

create or replace function public.close_evaluation_period(
  p_period_id uuid,
  p_closed_by uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
begin
  if coalesce(auth.role(), '') <> 'service_role' and not public.is_hr_admin() then
    raise exception '평가기간을 종료할 권한이 없습니다.' using errcode = '42501';
  end if;

  select status
    into v_status
    from public.evaluation_periods
   where id = p_period_id
   for update;

  if not found then
    raise exception '평가기간을 찾을 수 없습니다.';
  end if;

  if v_status = 'closed' then
    return;
  end if;

  update public.evaluation_periods
     set status = 'closed',
         closed_at = now(),
         updated_by = p_closed_by,
         updated_at = now()
   where id = p_period_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- 4. Audit
-- -----------------------------------------------------------------------------
drop trigger if exists trg_evaluation_periods_audit_step6 on public.evaluation_periods;
create trigger trg_evaluation_periods_audit_step6
after insert or update or delete on public.evaluation_periods
for each row execute function public.audit_hr_master_change();

-- evaluation_assignments already has evaluation_history from STEP 2.
-- Keep an audit trail for administrative target/evaluator changes too.
drop trigger if exists trg_evaluation_assignments_audit_step6 on public.evaluation_assignments;
create trigger trg_evaluation_assignments_audit_step6
after insert or update or delete on public.evaluation_assignments
for each row execute function public.audit_hr_master_change();

-- -----------------------------------------------------------------------------
-- 5. FORCE_DEMO_LOGIN / server Admin client grants
-- -----------------------------------------------------------------------------
grant usage on schema public to service_role;

grant select, insert, update, delete
on table
  public.evaluation_periods,
  public.evaluation_period_template_rules,
  public.evaluation_assignments,
  public.evaluation_snapshots,
  public.evaluation_templates,
  public.employees,
  public.departments,
  public.job_levels,
  public.positions,
  public.audit_logs
to service_role;

grant select
on table
  public.evaluation_categories,
  public.evaluation_questions,
  public.evaluation_question_standards,
  public.evaluation_question_core_values,
  public.core_values
to service_role;

grant usage, select on all sequences in schema public to service_role;

revoke all on function public.activate_evaluation_period(uuid, uuid) from public;
revoke all on function public.close_evaluation_period(uuid, uuid) from public;

grant execute on function public.create_assignment_snapshot(uuid, uuid) to service_role;
grant execute on function public.activate_evaluation_period(uuid, uuid) to service_role;
grant execute on function public.close_evaluation_period(uuid, uuid) to service_role;

-- Normal authenticated HR administrators use existing STEP 4 RLS policies.
grant execute on function public.activate_evaluation_period(uuid, uuid) to authenticated;
grant execute on function public.close_evaluation_period(uuid, uuid) to authenticated;

commit;
