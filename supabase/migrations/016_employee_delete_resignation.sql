-- AMCOMPANY HR Evaluation System
-- Employee deletion / bulk deletion / resignation propagation
-- Existing evaluation snapshots are preserved when an employee merely resigns.
-- Permanent employee deletion removes the employee's own HR/evaluation records.

begin;

-- ---------------------------------------------------------------------------
-- 1. Resignation operational marker columns
--    Historical snapshots stay immutable. These columns represent current
--    operational resignation status, separate from snapshot contents.
-- ---------------------------------------------------------------------------
alter table public.evaluation_assignments
  add column if not exists subject_is_resigned boolean not null default false,
  add column if not exists subject_resignation_date date;

alter table public.evaluation_snapshots
  add column if not exists subject_is_resigned boolean not null default false,
  add column if not exists subject_resignation_date date;

alter table public.self_evaluations
  add column if not exists subject_is_resigned boolean not null default false,
  add column if not exists subject_resignation_date date;

alter table public.evaluations
  add column if not exists subject_is_resigned boolean not null default false,
  add column if not exists subject_resignation_date date;

alter table public.evaluation_responses
  add column if not exists subject_is_resigned boolean not null default false,
  add column if not exists subject_resignation_date date;

alter table public.evaluation_comments
  add column if not exists subject_is_resigned boolean not null default false,
  add column if not exists subject_resignation_date date;

alter table public.evaluation_evidence_links
  add column if not exists subject_is_resigned boolean not null default false,
  add column if not exists subject_resignation_date date;

alter table public.evaluation_core_values
  add column if not exists subject_is_resigned boolean not null default false,
  add column if not exists subject_resignation_date date;

alter table public.evaluation_review_items
  add column if not exists subject_is_resigned boolean not null default false,
  add column if not exists subject_resignation_date date;

alter table public.evaluation_category_scores
  add column if not exists subject_is_resigned boolean not null default false,
  add column if not exists subject_resignation_date date;

alter table public.evaluation_results
  add column if not exists subject_is_resigned boolean not null default false,
  add column if not exists subject_resignation_date date;

alter table public.observation_logs
  add column if not exists subject_is_resigned boolean not null default false,
  add column if not exists subject_resignation_date date;

alter table public.growth_plans
  add column if not exists subject_is_resigned boolean not null default false,
  add column if not exists subject_resignation_date date;

alter table public.growth_plan_checkpoints
  add column if not exists subject_is_resigned boolean not null default false,
  add column if not exists subject_resignation_date date;

alter table public.calibration_logs
  add column if not exists subject_is_resigned boolean not null default false,
  add column if not exists subject_resignation_date date;

alter table public.evaluation_history
  add column if not exists subject_is_resigned boolean not null default false,
  add column if not exists subject_resignation_date date;

alter table public.leadership_red_flags
  add column if not exists subject_is_resigned boolean not null default false,
  add column if not exists subject_resignation_date date;

-- New/updated resigned employees must have a resignation date.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname='chk_resigned_employee_requires_date'
  ) then
    alter table public.employees
      add constraint chk_resigned_employee_requires_date
      check (employment_status <> 'resigned' or resignation_date is not null)
      not valid;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 2. Propagation helper
-- ---------------------------------------------------------------------------
create or replace function public.sync_employee_resignation_status(
  p_employee_id uuid,
  p_is_resigned boolean,
  p_resignation_date date
)
returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  update public.evaluation_assignments
     set subject_is_resigned=p_is_resigned,
         subject_resignation_date=case when p_is_resigned then p_resignation_date else null end,
         updated_at=now()
   where employee_id=p_employee_id;

  update public.evaluation_snapshots s
     set subject_is_resigned=p_is_resigned,
         subject_resignation_date=case when p_is_resigned then p_resignation_date else null end
    from public.evaluation_assignments a
   where s.assignment_id=a.id and a.employee_id=p_employee_id;

  update public.self_evaluations s
     set subject_is_resigned=p_is_resigned,
         subject_resignation_date=case when p_is_resigned then p_resignation_date else null end,
         updated_at=now()
    from public.evaluation_assignments a
   where s.assignment_id=a.id and a.employee_id=p_employee_id;

  update public.evaluations e
     set subject_is_resigned=p_is_resigned,
         subject_resignation_date=case when p_is_resigned then p_resignation_date else null end,
         updated_at=now()
    from public.evaluation_assignments a
   where e.assignment_id=a.id and a.employee_id=p_employee_id;

  update public.evaluation_responses r
     set subject_is_resigned=p_is_resigned,
         subject_resignation_date=case when p_is_resigned then p_resignation_date else null end,
         updated_at=now()
    from public.evaluations e
    join public.evaluation_assignments a on a.id=e.assignment_id
   where r.evaluation_id=e.id and a.employee_id=p_employee_id;

  update public.evaluation_comments c
     set subject_is_resigned=p_is_resigned,
         subject_resignation_date=case when p_is_resigned then p_resignation_date else null end
    from public.evaluations e
    join public.evaluation_assignments a on a.id=e.assignment_id
   where c.evaluation_id=e.id and a.employee_id=p_employee_id;

  update public.evaluation_evidence_links l
     set subject_is_resigned=p_is_resigned,
         subject_resignation_date=case when p_is_resigned then p_resignation_date else null end
    from public.evaluation_responses r
    join public.evaluations e on e.id=r.evaluation_id
    join public.evaluation_assignments a on a.id=e.assignment_id
   where l.response_id=r.id and a.employee_id=p_employee_id;

  update public.evaluation_core_values cv
     set subject_is_resigned=p_is_resigned,
         subject_resignation_date=case when p_is_resigned then p_resignation_date else null end
    from public.evaluations e
    join public.evaluation_assignments a on a.id=e.assignment_id
   where cv.evaluation_id=e.id and a.employee_id=p_employee_id;

  update public.evaluation_review_items ri
     set subject_is_resigned=p_is_resigned,
         subject_resignation_date=case when p_is_resigned then p_resignation_date else null end,
         updated_at=now()
    from public.evaluations e
    join public.evaluation_assignments a on a.id=e.assignment_id
   where ri.evaluation_id=e.id and a.employee_id=p_employee_id;

  update public.evaluation_category_scores cs
     set subject_is_resigned=p_is_resigned,
         subject_resignation_date=case when p_is_resigned then p_resignation_date else null end
    from public.evaluations e
    join public.evaluation_assignments a on a.id=e.assignment_id
   where cs.evaluation_id=e.id and a.employee_id=p_employee_id;

  update public.evaluation_results r
     set subject_is_resigned=p_is_resigned,
         subject_resignation_date=case when p_is_resigned then p_resignation_date else null end,
         updated_at=now()
    from public.evaluation_assignments a
   where r.assignment_id=a.id and a.employee_id=p_employee_id;

  update public.observation_logs
     set subject_is_resigned=p_is_resigned,
         subject_resignation_date=case when p_is_resigned then p_resignation_date else null end,
         updated_at=now()
   where subject_employee_id=p_employee_id;

  update public.growth_plans
     set subject_is_resigned=p_is_resigned,
         subject_resignation_date=case when p_is_resigned then p_resignation_date else null end,
         updated_at=now()
   where employee_id=p_employee_id;

  update public.growth_plan_checkpoints cp
     set subject_is_resigned=p_is_resigned,
         subject_resignation_date=case when p_is_resigned then p_resignation_date else null end
    from public.growth_plans gp
   where cp.growth_plan_id=gp.id and gp.employee_id=p_employee_id;

  update public.calibration_logs c
     set subject_is_resigned=p_is_resigned,
         subject_resignation_date=case when p_is_resigned then p_resignation_date else null end
    from public.evaluation_assignments a
   where c.assignment_id=a.id and a.employee_id=p_employee_id;

  update public.evaluation_history h
     set subject_is_resigned=p_is_resigned,
         subject_resignation_date=case when p_is_resigned then p_resignation_date else null end
    from public.evaluation_assignments a
   where h.assignment_id=a.id and a.employee_id=p_employee_id;

  update public.leadership_red_flags
     set subject_is_resigned=p_is_resigned,
         subject_resignation_date=case when p_is_resigned then p_resignation_date else null end
   where employee_id=p_employee_id;
end;
$$;

create or replace function public.trg_sync_employee_resignation()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if new.employment_status='resigned' and new.resignation_date is null then
    raise exception '퇴사 상태에서는 퇴사일이 필수입니다.';
  end if;

  if (
    new.employment_status is distinct from old.employment_status
    or new.resignation_date is distinct from old.resignation_date
  ) then
    perform public.sync_employee_resignation_status(
      new.id,
      new.employment_status='resigned',
      new.resignation_date
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_employee_resignation_sync on public.employees;
create trigger trg_employee_resignation_sync
after update of employment_status,resignation_date on public.employees
for each row execute function public.trg_sync_employee_resignation();

create or replace function public.trg_sync_employee_resignation_insert()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if new.employment_status='resigned' and new.resignation_date is null then
    raise exception '퇴사 상태에서는 퇴사일이 필수입니다.';
  end if;

  if new.employment_status='resigned' then
    perform public.sync_employee_resignation_status(new.id,true,new.resignation_date);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_employee_resignation_sync_insert on public.employees;
create trigger trg_employee_resignation_sync_insert
after insert on public.employees
for each row execute function public.trg_sync_employee_resignation_insert();

-- Existing data backfill
update public.evaluation_assignments a
   set subject_is_resigned=(e.employment_status='resigned'),
       subject_resignation_date=case when e.employment_status='resigned' then e.resignation_date else null end
  from public.employees e
 where a.employee_id=e.id;

update public.evaluation_snapshots s
   set subject_is_resigned=a.subject_is_resigned,
       subject_resignation_date=a.subject_resignation_date
  from public.evaluation_assignments a
 where s.assignment_id=a.id;

update public.self_evaluations s
   set subject_is_resigned=a.subject_is_resigned,
       subject_resignation_date=a.subject_resignation_date
  from public.evaluation_assignments a
 where s.assignment_id=a.id;

update public.evaluations e
   set subject_is_resigned=a.subject_is_resigned,
       subject_resignation_date=a.subject_resignation_date
  from public.evaluation_assignments a
 where e.assignment_id=a.id;

update public.evaluation_results r
   set subject_is_resigned=a.subject_is_resigned,
       subject_resignation_date=a.subject_resignation_date
  from public.evaluation_assignments a
 where r.assignment_id=a.id;

update public.observation_logs o
   set subject_is_resigned=(e.employment_status='resigned'),
       subject_resignation_date=case when e.employment_status='resigned' then e.resignation_date else null end
  from public.employees e
 where o.subject_employee_id=e.id;

update public.growth_plans g
   set subject_is_resigned=(e.employment_status='resigned'),
       subject_resignation_date=case when e.employment_status='resigned' then e.resignation_date else null end
  from public.employees e
 where g.employee_id=e.id;

-- Propagate remaining child tables using each employee once.
do $$
declare r record;
begin
  for r in
    select id,employment_status,resignation_date
    from public.employees
    where employment_status='resigned'
  loop
    perform public.sync_employee_resignation_status(r.id,true,r.resignation_date);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 3. Permanent deletion
-- ---------------------------------------------------------------------------
create or replace function public.delete_employee_completely(p_employee_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_name text;
  v_employee_no text;
  v_user_id uuid;
  v_current_employee uuid;
begin
  if auth.role() <> 'service_role'
     and not (coalesce(public.has_role('hr_admin'),false) or coalesce(public.has_role('super_admin'),false)) then
    raise exception '직원 영구삭제 권한이 없습니다.';
  end if;

  select id into v_current_employee from public.employees where user_id=auth.uid() limit 1;

  if auth.role() <> 'service_role' and v_current_employee=p_employee_id then
    raise exception '현재 로그인한 본인 계정은 영구삭제할 수 없습니다.';
  end if;

  select name,employee_no,user_id
    into v_name,v_employee_no,v_user_id
    from public.employees
   where id=p_employee_id
   for update;

  if not found then
    raise exception '삭제할 직원을 찾을 수 없습니다.';
  end if;

  -- Deactivate the linked profile. auth.users itself is not deleted here.
  if v_user_id is not null then
    update public.profiles set is_active=false,updated_at=now() where id=v_user_id;
  end if;

  -- Remove references from system/master records that must survive.
  update public.employees set leader_id=null,updated_at=now() where leader_id=p_employee_id;
  update public.evaluation_periods set created_by=null where created_by=p_employee_id;
  update public.evaluation_periods set updated_by=null where updated_by=p_employee_id;
  update public.evaluation_templates set created_by=null where created_by=p_employee_id;
  update public.evaluation_templates set updated_by=null where updated_by=p_employee_id;
  update public.evaluation_snapshots set created_by=null where created_by=p_employee_id;
  update public.evaluations set updated_by=null where updated_by=p_employee_id;
  update public.evaluation_responses set updated_by=null where updated_by=p_employee_id;
  update public.growth_plans set created_by=null where created_by=p_employee_id and employee_id<>p_employee_id;
  update public.growth_plan_checkpoints set created_by=null where created_by=p_employee_id;
  update public.calibration_logs set approved_by=null where approved_by=p_employee_id;
  update public.evaluation_history set changed_by=null where changed_by=p_employee_id;
  update public.nine_block_settings set created_by=null where created_by=p_employee_id;
  update public.audit_logs set actor_employee_id=null where actor_employee_id=p_employee_id;

  -- The employee may have been an evaluator/author for another employee.
  -- Those authored evaluation records are deleted, while the other employee's
  -- assignment itself survives with evaluator references cleared.
  update public.growth_plans
     set source_response_id=null
   where source_response_id in (
     select r.id
     from public.evaluation_responses r
     join public.evaluations e on e.id=r.evaluation_id
     where e.evaluator_id=p_employee_id
   );

  update public.growth_plans
     set source_result_id=null
   where source_result_id in (
     select er.id
     from public.evaluation_results er
     where er.final_evaluation_id in (
       select id from public.evaluations where evaluator_id=p_employee_id
     )
   );

  delete from public.calibration_logs
   where evaluation_id in (select id from public.evaluations where evaluator_id=p_employee_id)
      or response_id in (
        select r.id
        from public.evaluation_responses r
        join public.evaluations e on e.id=r.evaluation_id
        where e.evaluator_id=p_employee_id
      );

  delete from public.evaluation_results
   where final_evaluation_id in (
     select id from public.evaluations where evaluator_id=p_employee_id
   );

  delete from public.evaluation_review_items where reviewer_id=p_employee_id;
  delete from public.evaluation_comments where author_id=p_employee_id;
  delete from public.evaluation_evidence_links where linked_by=p_employee_id;
  delete from public.calibration_logs where changed_by=p_employee_id;

  delete from public.evaluation_history
   where entity_id in (
     select id from public.evaluations where evaluator_id=p_employee_id
   );

  delete from public.evaluations where evaluator_id=p_employee_id;

  update public.evaluation_assignments
     set first_evaluator_id=null,
         updated_at=now()
   where first_evaluator_id=p_employee_id;

  update public.evaluation_assignments
     set second_evaluator_id=null,
         updated_at=now()
   where second_evaluator_id=p_employee_id;

  -- Observations written by the employee or written about the employee.
  delete from public.observation_logs
   where observer_id=p_employee_id or subject_employee_id=p_employee_id;

  -- The employee's own leadership flags and growth plans.
  delete from public.leadership_red_flags where employee_id=p_employee_id;
  delete from public.growth_plans where employee_id=p_employee_id;

  -- Before deleting the employee's assignments, break optional source links
  -- from other employees' growth plans.
  update public.growth_plans
     set source_response_id=null
   where source_response_id in (
     select r.id
     from public.evaluation_responses r
     join public.evaluations e on e.id=r.evaluation_id
     join public.evaluation_assignments a on a.id=e.assignment_id
     where a.employee_id=p_employee_id
   );

  update public.growth_plans
     set source_result_id=null
   where source_result_id in (
     select er.id
     from public.evaluation_results er
     join public.evaluation_assignments a on a.id=er.assignment_id
     where a.employee_id=p_employee_id
   );

  update public.growth_plans
     set source_assignment_id=null
   where source_assignment_id in (
     select id from public.evaluation_assignments where employee_id=p_employee_id
   );

  -- These two tables do not cascade from assignment in the original schema.
  delete from public.calibration_logs
   where assignment_id in (
     select id from public.evaluation_assignments where employee_id=p_employee_id
   );

  delete from public.evaluation_history
   where assignment_id in (
     select id from public.evaluation_assignments where employee_id=p_employee_id
   );

  -- Assignment deletion cascades to snapshots/self evaluations/evaluations/
  -- responses/comments/category scores/results/evidence links etc.
  delete from public.evaluation_assignments where employee_id=p_employee_id;

  -- Remaining employee-owned relations with ON DELETE CASCADE are cleaned by FK.
  delete from public.employees where id=p_employee_id;

  return jsonb_build_object(
    'employee_id',p_employee_id,
    'employee_no',v_employee_no,
    'employee_name',v_name,
    'deleted',true
  );
end;
$$;

create or replace function public.delete_employees_completely(p_employee_ids uuid[])
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_id uuid;
  v_count integer:=0;
begin
  if p_employee_ids is null or coalesce(array_length(p_employee_ids,1),0)=0 then
    raise exception '삭제할 직원을 선택해주세요.';
  end if;

  if array_length(p_employee_ids,1)>200 then
    raise exception '한 번에 최대 200명까지 삭제할 수 있습니다.';
  end if;

  foreach v_id in array p_employee_ids
  loop
    perform public.delete_employee_completely(v_id);
    v_count:=v_count+1;
  end loop;

  return jsonb_build_object('deleted_count',v_count,'deleted',true);
end;
$$;

revoke all on function public.sync_employee_resignation_status(uuid,boolean,date) from public;
revoke all on function public.delete_employee_completely(uuid) from public;
revoke all on function public.delete_employees_completely(uuid[]) from public;

grant execute on function public.sync_employee_resignation_status(uuid,boolean,date) to service_role;
grant execute on function public.delete_employee_completely(uuid) to authenticated,service_role;
grant execute on function public.delete_employees_completely(uuid[]) to authenticated,service_role;

-- Service role needs all tables touched by the delete/sync functions.
grant select,insert,update,delete on table
  public.employees,
  public.profiles,
  public.evaluation_periods,
  public.evaluation_templates,
  public.evaluation_assignments,
  public.evaluation_snapshots,
  public.self_evaluations,
  public.evaluations,
  public.evaluation_responses,
  public.evaluation_comments,
  public.evaluation_evidence_links,
  public.evaluation_core_values,
  public.evaluation_review_items,
  public.evaluation_category_scores,
  public.evaluation_results,
  public.observation_logs,
  public.growth_plans,
  public.growth_plan_checkpoints,
  public.calibration_logs,
  public.evaluation_history,
  public.leadership_red_flags,
  public.nine_block_settings,
  public.audit_logs
to service_role;

commit;
