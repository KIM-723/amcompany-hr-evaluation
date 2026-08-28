-- AMCOMPANY HR Evaluation System
-- STEP 13~17: Calibration / 9-Block / Growth / Dashboard / Excel support

begin;

-- ---------------------------------------------------------------------------
-- Calibration anomaly view
-- ---------------------------------------------------------------------------
create or replace view public.calibration_anomalies_v
with (security_invoker=true)
as
select
  r.id as response_id,
  a.id as assignment_id,
  a.period_id,
  p.name as period_name,
  a.employee_id,
  emp.name as employee_name,
  ev.evaluator_id,
  evaluator.name as evaluator_name,
  q.id as question_id,
  q.title as question_title,
  r.score,
  r.comment,
  r.evidence_note,
  case
    when r.score in (1,5)
         and coalesce(nullif(trim(r.evidence_note),''),nullif(trim(r.comment),'')) is null
      then 'EXTREME_NO_EVIDENCE'
    else 'REVIEW'
  end as rule_code,
  case
    when r.score in (1,5)
         and coalesce(nullif(trim(r.evidence_note),''),nullif(trim(r.comment),'')) is null
      then '근거 없는 극단점수'
    else '검토 필요'
  end as rule_label
from public.evaluation_responses r
join public.evaluations ev on ev.id=r.evaluation_id
join public.evaluation_assignments a on a.id=ev.assignment_id
join public.evaluation_periods p on p.id=a.period_id
join public.employees emp on emp.id=a.employee_id
join public.employees evaluator on evaluator.id=ev.evaluator_id
left join public.evaluation_questions q on q.id=r.question_id
where ev.stage='first'
  and (
    (r.score in (1,5) and coalesce(nullif(trim(r.evidence_note),''),nullif(trim(r.comment),'')) is null)
    or r.score in (1,5)
  );

create or replace view public.evaluator_score_stats_v
with (security_invoker=true)
as
with base as (
  select ev.evaluator_id,r.score
  from public.evaluations ev
  join public.evaluation_responses r on r.evaluation_id=ev.id
  where ev.stage='first'
),
global_stat as (
  select avg(score) as global_avg from base
)
select
  b.evaluator_id,
  e.name as evaluator_name,
  round(avg(b.score)::numeric,2) as avg_score,
  round((avg(b.score)-(select global_avg from global_stat))::numeric,2) as delta_from_global,
  round((100.0*count(*) filter(where b.score=1)/nullif(count(*),0))::numeric,1) as one_ratio,
  round((100.0*count(*) filter(where b.score=5)/nullif(count(*),0))::numeric,1) as five_ratio,
  count(*)::int as response_count
from base b
join public.employees e on e.id=b.evaluator_id
group by b.evaluator_id,e.name;

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
begin
  if auth.role() <> 'service_role' and not public.is_hr_admin() then
    raise exception 'Calibration 변경 권한이 없습니다.';
  end if;

  if auth.role() <> 'service_role' then
    p_actor_id := public.current_employee_id();
  end if;

  if p_new_score < 1 or p_new_score > 5 then
    raise exception '점수는 1~5 범위여야 합니다.';
  end if;

  if coalesce(trim(p_reason),'')='' then
    raise exception '변경사유는 필수입니다.';
  end if;

  select r.score,ev.assignment_id,ev.id
    into v_old,v_assignment,v_eval
  from public.evaluation_responses r
  join public.evaluations ev on ev.id=r.evaluation_id
  where r.id=p_response_id
  for update;

  if not found then raise exception '평가응답을 찾을 수 없습니다.'; end if;

  update public.evaluation_responses
     set score=p_new_score,updated_by=p_actor_id,updated_at=now()
   where id=p_response_id;

  insert into public.calibration_logs(
    assignment_id,response_id,evaluation_id,old_score,new_score,changed_by,reason,anomaly_rule,approved_by,approved_at
  ) values(
    v_assignment,p_response_id,v_eval,v_old,p_new_score,p_actor_id,p_reason,'MANUAL_CALIBRATION',p_actor_id,now()
  );

  perform public.finalize_assignment_result(v_assignment,p_actor_id);
end;
$$;

revoke all on function public.apply_calibration_score(uuid,numeric,text,uuid) from public;
grant execute on function public.apply_calibration_score(uuid,numeric,text,uuid) to authenticated,service_role;

-- ---------------------------------------------------------------------------
-- 9-Block query
-- ---------------------------------------------------------------------------
create or replace function public.get_nine_block_rows(
  p_period_id uuid default null,
  p_department_id uuid default null,
  p_job_level_id uuid default null
)
returns table(
  employee_id uuid,
  employee_name text,
  employee_no text,
  department_name text,
  job_level_name text,
  performance_score numeric,
  competency_score numeric,
  performance_band text,
  competency_band text
)
language sql
stable
security invoker
set search_path=public
as $$
with settings as (
  select
    coalesce(s.performance_low_max,2.70) as p_low,
    coalesce(s.performance_middle_max,3.70) as p_mid,
    coalesce(s.competency_low_max,2.70) as c_low,
    coalesce(s.competency_middle_max,3.70) as c_mid
  from (select 1) x
  left join lateral (
    select *
    from public.nine_block_settings n
    where n.is_active=true
      and (p_period_id is null or n.period_id=p_period_id)
    order by case when n.period_id=p_period_id then 0 else 1 end,n.created_at desc
    limit 1
  ) s on true
)
select
  e.id,e.name,e.employee_no,d.name,jl.name,
  r.performance_score,r.competency_score,
  case when r.performance_score<=s.p_low then 'low' when r.performance_score<=s.p_mid then 'middle' else 'high' end,
  case when r.competency_score<=s.c_low then 'low' when r.competency_score<=s.c_mid then 'middle' else 'high' end
from public.evaluation_results r
join public.evaluation_assignments a on a.id=r.assignment_id
join public.employees e on e.id=a.employee_id
left join public.departments d on d.id=e.department_id
left join public.job_levels jl on jl.id=e.job_level_id
cross join settings s
where r.performance_score is not null
  and r.competency_score is not null
  and (p_period_id is null or a.period_id=p_period_id)
  and (p_department_id is null or e.department_id=p_department_id)
  and (p_job_level_id is null or e.job_level_id=p_job_level_id)
order by e.employee_no;
$$;

revoke all on function public.get_nine_block_rows(uuid,uuid,uuid) from public;
grant execute on function public.get_nine_block_rows(uuid,uuid,uuid) to authenticated,service_role;

-- ---------------------------------------------------------------------------
-- Growth plan updated_at
-- ---------------------------------------------------------------------------
drop trigger if exists trg_growth_plans_updated_at_step15 on public.growth_plans;
create trigger trg_growth_plans_updated_at_step15
before update on public.growth_plans
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
grant select on public.calibration_anomalies_v to authenticated,service_role;
grant select on public.evaluator_score_stats_v to authenticated,service_role;

grant select,insert,update,delete on table
  public.calibration_logs,
  public.nine_block_settings,
  public.growth_plans,
  public.growth_plan_checkpoints
to service_role;

grant select on table
  public.evaluation_results,
  public.evaluation_responses,
  public.evaluations,
  public.evaluation_assignments,
  public.employees,
  public.departments,
  public.job_levels,
  public.positions,
  public.evaluation_periods
to service_role;

commit;
