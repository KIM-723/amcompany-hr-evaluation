-- AMCOMPANY HR Evaluation System
-- Calibration release/restart + leader/executive evaluator role configuration

begin;

-- ---------------------------------------------------------------------------
-- 1. Position-based evaluator role
-- ---------------------------------------------------------------------------
alter table public.positions
  add column if not exists evaluation_role text not null default 'none';

do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conname='chk_positions_evaluation_role'
  ) then
    alter table public.positions
      add constraint chk_positions_evaluation_role
      check (evaluation_role in ('none','leader','executive'));
  end if;
end $$;

create index if not exists idx_positions_evaluation_role
  on public.positions(evaluation_role,is_active,sort_order);

-- Conservative initial classification.
-- Exact '리더' positions become first evaluators.
update public.positions
   set evaluation_role='leader'
 where evaluation_role='none'
   and (
     lower(trim(name))='리더'
     or lower(trim(code))='leader'
   );

-- Common executive titles become second evaluators.
-- HR can correct these immediately in 직책관리.
update public.positions
   set evaluation_role='executive'
 where evaluation_role='none'
   and (
     name ilike '%임원%'
     or name ilike '%사업부대표%'
     or name ilike '%본부장%'
     or lower(trim(code)) in ('executive','exec')
   );

-- Keep legacy employees.is_leader working by marking employees whose
-- position is explicitly configured as leader.
update public.employees e
   set is_leader=true,
       updated_at=now()
  from public.positions p
 where e.position_id=p.id
   and p.evaluation_role='leader'
   and e.is_leader=false;

-- ---------------------------------------------------------------------------
-- 2. Calibration rounds
-- ---------------------------------------------------------------------------
alter table public.evaluation_periods
  add column if not exists calibration_round integer not null default 0,
  add column if not exists calibration_last_started_at timestamptz,
  add column if not exists calibration_last_released_at timestamptz;

alter table public.calibration_logs
  add column if not exists calibration_round integer not null default 1;

create index if not exists idx_calibration_logs_round
  on public.calibration_logs(assignment_id,calibration_round,created_at desc);

create or replace function public.start_or_restart_calibration(
  p_period_id uuid,
  p_actor_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_status text;
  v_round integer;
begin
  select status,calibration_round
    into v_status,v_round
    from public.evaluation_periods
   where id=p_period_id
   for update;

  if not found then
    raise exception '평가기간을 찾을 수 없습니다.';
  end if;

  if v_status='closed' then
    raise exception '종료된 평가기간은 Calibration을 다시 시작할 수 없습니다.';
  end if;

  if v_status='calibration' then
    return jsonb_build_object(
      'status','calibration',
      'calibration_round',v_round
    );
  end if;

  if v_status<>'active' then
    raise exception '진행중 상태에서만 Calibration을 시작할 수 있습니다.';
  end if;

  v_round:=coalesce(v_round,0)+1;

  update public.evaluation_periods
     set status='calibration',
         calibration_round=v_round,
         calibration_last_started_at=now(),
         updated_by=p_actor_id,
         updated_at=now()
   where id=p_period_id;

  return jsonb_build_object(
    'status','calibration',
    'calibration_round',v_round,
    'started_at',now()
  );
end;
$$;

create or replace function public.release_calibration(
  p_period_id uuid,
  p_actor_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_status text;
  v_round integer;
begin
  select status,calibration_round
    into v_status,v_round
    from public.evaluation_periods
   where id=p_period_id
   for update;

  if not found then
    raise exception '평가기간을 찾을 수 없습니다.';
  end if;

  if v_status<>'calibration' then
    raise exception '현재 Calibration 상태가 아닙니다.';
  end if;

  update public.evaluation_periods
     set status='active',
         calibration_last_released_at=now(),
         updated_by=p_actor_id,
         updated_at=now()
   where id=p_period_id;

  return jsonb_build_object(
    'status','active',
    'calibration_round',v_round,
    'released_at',now()
  );
end;
$$;

revoke all on function public.start_or_restart_calibration(uuid,uuid) from public;
revoke all on function public.release_calibration(uuid,uuid) from public;

grant execute on function public.start_or_restart_calibration(uuid,uuid)
  to authenticated,service_role;
grant execute on function public.release_calibration(uuid,uuid)
  to authenticated,service_role;

-- ---------------------------------------------------------------------------
-- 3. Calibration score changes remember the current round.
-- ---------------------------------------------------------------------------
create or replace function public.apply_calibration_score(
  p_response_id uuid,
  p_new_score numeric,
  p_reason text,
  p_actor_id uuid
)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  v_old numeric;
  v_assignment uuid;
  v_eval uuid;
  v_period uuid;
  v_round integer;
begin
  if p_new_score < 1 or p_new_score > 5 then
    raise exception '점수는 1~5 범위여야 합니다.';
  end if;

  if coalesce(trim(p_reason),'')='' then
    raise exception '변경사유는 필수입니다.';
  end if;

  select
    r.score,
    ev.assignment_id,
    ev.id,
    a.period_id,
    greatest(coalesce(p.calibration_round,1),1)
    into v_old,v_assignment,v_eval,v_period,v_round
  from public.evaluation_responses r
  join public.evaluations ev on ev.id=r.evaluation_id
  join public.evaluation_assignments a on a.id=ev.assignment_id
  join public.evaluation_periods p on p.id=a.period_id
  where r.id=p_response_id
  for update of r;

  if not found then
    raise exception '평가응답을 찾을 수 없습니다.';
  end if;

  if not exists (
    select 1
    from public.evaluation_periods
    where id=v_period and status='calibration'
  ) then
    raise exception '현재 평가기간이 Calibration 상태가 아닙니다.';
  end if;

  update public.evaluation_responses
     set score=p_new_score,
         updated_by=p_actor_id,
         updated_at=now()
   where id=p_response_id;

  insert into public.calibration_logs(
    assignment_id,response_id,evaluation_id,old_score,new_score,
    changed_by,reason,anomaly_rule,approved_by,approved_at,calibration_round
  )
  values(
    v_assignment,p_response_id,v_eval,v_old,p_new_score,
    p_actor_id,p_reason,'MANUAL_CALIBRATION',p_actor_id,now(),v_round
  );

  perform public.finalize_assignment_result(v_assignment,p_actor_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Optional DB-level evaluator validation for assignment changes.
-- ---------------------------------------------------------------------------
create or replace function public.validate_assignment_evaluator_roles()
returns trigger
language plpgsql
set search_path=public
as $$
declare
  v_target_leader uuid;
  v_first_valid boolean;
  v_second_valid boolean;
begin
  if new.first_evaluator_id is not null then
    select e.leader_id
      into v_target_leader
      from public.employees e
     where e.id=new.employee_id;

    select (
      e.is_leader
      or coalesce(p.evaluation_role='leader',false)
    )
      into v_first_valid
      from public.employees e
      left join public.positions p on p.id=e.position_id
     where e.id=new.first_evaluator_id
       and e.employment_status<>'resigned';

    if not coalesce(v_first_valid,false) then
      raise exception '1차 평가자는 리더만 지정할 수 있습니다.';
    end if;

    if v_target_leader is distinct from new.first_evaluator_id then
      raise exception '1차 평가자는 해당 구성원의 직원정보상 리더와 일치해야 합니다.';
    end if;
  end if;

  if new.second_evaluator_id is not null then
    select coalesce(p.evaluation_role='executive',false)
      into v_second_valid
      from public.employees e
      left join public.positions p on p.id=e.position_id
     where e.id=new.second_evaluator_id
       and e.employment_status<>'resigned';

    if not coalesce(v_second_valid,false) then
      raise exception '2차 평가자는 임원 직책만 지정할 수 있습니다.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_assignment_evaluator_roles
  on public.evaluation_assignments;

create trigger trg_validate_assignment_evaluator_roles
before insert or update of employee_id,first_evaluator_id,second_evaluator_id
on public.evaluation_assignments
for each row
execute function public.validate_assignment_evaluator_roles();

-- service role permissions for current temporary development login.
grant select,insert,update,delete on table
  public.positions,
  public.employees,
  public.evaluation_periods,
  public.evaluation_assignments,
  public.calibration_logs
to service_role;

grant execute on function public.apply_calibration_score(uuid,numeric,text,uuid)
  to authenticated,service_role;

commit;
