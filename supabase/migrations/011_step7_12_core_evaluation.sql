-- AMCOMPANY HR Evaluation System
-- STEP 7~12: questions / observations / self / first / second / results
-- Run after STEP 6 migrations.

begin;

-- ---------------------------------------------------------------------------
-- Common updated_at triggers
-- ---------------------------------------------------------------------------
drop trigger if exists trg_templates_updated_at_step7 on public.evaluation_templates;
create trigger trg_templates_updated_at_step7
before update on public.evaluation_templates
for each row execute function public.set_updated_at();

drop trigger if exists trg_categories_updated_at_step7 on public.evaluation_categories;
create trigger trg_categories_updated_at_step7
before update on public.evaluation_categories
for each row execute function public.set_updated_at();

drop trigger if exists trg_questions_updated_at_step7 on public.evaluation_questions;
create trigger trg_questions_updated_at_step7
before update on public.evaluation_questions
for each row execute function public.set_updated_at();

drop trigger if exists trg_observations_updated_at_step8 on public.observation_logs;
create trigger trg_observations_updated_at_step8
before update on public.observation_logs
for each row execute function public.set_updated_at();

drop trigger if exists trg_self_eval_updated_at_step9 on public.self_evaluations;
create trigger trg_self_eval_updated_at_step9
before update on public.self_evaluations
for each row execute function public.set_updated_at();

drop trigger if exists trg_evaluations_updated_at_step10 on public.evaluations;
create trigger trg_evaluations_updated_at_step10
before update on public.evaluations
for each row execute function public.set_updated_at();

drop trigger if exists trg_responses_updated_at_step10 on public.evaluation_responses;
create trigger trg_responses_updated_at_step10
before update on public.evaluation_responses
for each row execute function public.set_updated_at();

drop trigger if exists trg_review_items_updated_at_step11 on public.evaluation_review_items;
create trigger trg_review_items_updated_at_step11
before update on public.evaluation_review_items
for each row execute function public.set_updated_at();

drop trigger if exists trg_results_updated_at_step12 on public.evaluation_results;
create trigger trg_results_updated_at_step12
before update on public.evaluation_results
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Final result calculation
-- Uses the latest first evaluation as the final source until later final-review
-- workflow is introduced. Snapshot/result data remain historical.
-- ---------------------------------------------------------------------------
create or replace function public.finalize_assignment_result(
  p_assignment_id uuid,
  p_actor_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_eval_id uuid;
  v_result_id uuid;
  v_performance numeric(4,2);
  v_competency numeric(4,2);
  v_attitude numeric(4,2);
  v_leadership numeric(4,2);
  v_total numeric(4,2);
  v_core jsonb := '{}'::jsonb;
  v_strengths jsonb := '[]'::jsonb;
  v_growth jsonb := '[]'::jsonb;
begin
  if auth.role() <> 'service_role' and not public.is_hr_admin() then
    raise exception '결과 확정 권한이 없습니다.';
  end if;

  select e.id
    into v_eval_id
    from public.evaluations e
   where e.assignment_id = p_assignment_id
     and e.stage = 'first'
   order by coalesce(e.submitted_at,e.updated_at,e.created_at) desc
   limit 1;

  if v_eval_id is null then
    raise exception '1차 평가가 없어 결과를 생성할 수 없습니다.';
  end if;

  select
    round(avg(r.score) filter (where c.code='performance')::numeric, 2),
    round(avg(r.score) filter (where c.code='competency')::numeric, 2),
    round(avg(r.score) filter (where c.code='attitude')::numeric, 2),
    round(avg(r.score) filter (where c.code='leadership')::numeric, 2)
  into v_performance, v_competency, v_attitude, v_leadership
  from public.evaluation_responses r
  join public.evaluation_questions q on q.id=r.question_id
  join public.evaluation_categories c on c.id=q.category_id
  where r.evaluation_id=v_eval_id;

  select round(
    (
      sum(r.score * greatest(c.weight,0))
      / nullif(sum(greatest(c.weight,0)),0)
    )::numeric,2
  )
  into v_total
  from public.evaluation_responses r
  join public.evaluation_questions q on q.id=r.question_id
  join public.evaluation_categories c on c.id=q.category_id
  where r.evaluation_id=v_eval_id
    and c.weight > 0;

  if v_total is null then
    select round(avg(score)::numeric,2)
      into v_total
      from public.evaluation_responses
     where evaluation_id=v_eval_id;
  end if;

  select coalesce(jsonb_object_agg(x.value_name, x.value_score),'{}'::jsonb)
    into v_core
  from (
    select cv.name as value_name, round(avg(r.score)::numeric,2) as value_score
    from public.evaluation_responses r
    join public.evaluation_question_core_values qcv on qcv.question_id=r.question_id
    join public.core_values cv on cv.id=qcv.core_value_id
    where r.evaluation_id=v_eval_id
    group by cv.id,cv.name
  ) x;

  select coalesce(jsonb_agg(jsonb_build_object('title',x.title,'score',x.score)),'[]'::jsonb)
    into v_strengths
  from (
    select q.title,r.score
    from public.evaluation_responses r
    join public.evaluation_questions q on q.id=r.question_id
    where r.evaluation_id=v_eval_id
    order by r.score desc,q.sort_order
    limit 3
  ) x;

  select coalesce(jsonb_agg(jsonb_build_object('title',x.title,'score',x.score)),'[]'::jsonb)
    into v_growth
  from (
    select q.title,r.score
    from public.evaluation_responses r
    join public.evaluation_questions q on q.id=r.question_id
    where r.evaluation_id=v_eval_id
    order by r.score asc,q.sort_order
    limit 3
  ) x;

  insert into public.evaluation_results(
    assignment_id,final_evaluation_id,
    performance_score,competency_score,attitude_score,leadership_score,total_score,
    core_value_scores,strengths,growth_needs,
    result_snapshot,finalized_at,updated_at
  )
  values(
    p_assignment_id,v_eval_id,
    v_performance,v_competency,v_attitude,v_leadership,v_total,
    v_core,v_strengths,v_growth,
    jsonb_build_object(
      'calculated_at',now(),
      'source_evaluation_id',v_eval_id,
      'formula','category weighted average / fallback response average'
    ),
    now(),now()
  )
  on conflict (assignment_id) do update
  set final_evaluation_id=excluded.final_evaluation_id,
      performance_score=excluded.performance_score,
      competency_score=excluded.competency_score,
      attitude_score=excluded.attitude_score,
      leadership_score=excluded.leadership_score,
      total_score=excluded.total_score,
      core_value_scores=excluded.core_value_scores,
      strengths=excluded.strengths,
      growth_needs=excluded.growth_needs,
      result_snapshot=excluded.result_snapshot,
      finalized_at=excluded.finalized_at,
      updated_at=now()
  returning id into v_result_id;

  update public.evaluations
     set status='finalized',
         finalized_at=now(),
         updated_by=p_actor_id,
         updated_at=now()
   where id=v_eval_id;

  update public.evaluation_assignments
     set status='finalized',
         current_stage='finalized',
         finalized_at=now(),
         updated_at=now()
   where id=p_assignment_id;

  return v_result_id;
end;
$$;

revoke all on function public.finalize_assignment_result(uuid,uuid) from public;
grant execute on function public.finalize_assignment_result(uuid,uuid) to authenticated,service_role;

-- ---------------------------------------------------------------------------
-- service_role permissions for FORCE_DEMO_LOGIN
-- ---------------------------------------------------------------------------
grant usage on schema public to service_role;

grant select,insert,update,delete on table
  public.evaluation_templates,
  public.evaluation_categories,
  public.evaluation_questions,
  public.evaluation_question_standards,
  public.evaluation_question_core_values,
  public.evaluation_question_job_levels,
  public.evaluation_question_positions,
  public.observation_logs,
  public.self_evaluations,
  public.evaluations,
  public.evaluation_responses,
  public.evaluation_evidence_links,
  public.evaluation_review_items,
  public.evaluation_results
to service_role;

grant select on table
  public.evaluation_assignments,
  public.evaluation_periods,
  public.evaluation_snapshots,
  public.employees,
  public.departments,
  public.job_levels,
  public.positions,
  public.core_values
to service_role;

grant usage,select on all sequences in schema public to service_role;

commit;
