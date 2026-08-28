-- AMCOMPANY HR Evaluation System
-- Evaluation Period permanent deletion
-- Deletes the period and all diagnostic/evaluation data belonging to it.

begin;

create or replace function public.delete_evaluation_period_completely(
  p_period_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period_name text;
  v_assignment_count integer := 0;
  v_observation_count integer := 0;
  v_growth_plan_count integer := 0;
  v_actor_employee_id uuid;
begin
  -- Only HR / super admin, or the server-side service role used by the
  -- temporary FORCE_DEMO_LOGIN development mode.
  if auth.role() <> 'service_role'
     and not (
       coalesce(public.has_role('hr_admin'), false)
       or coalesce(public.has_role('super_admin'), false)
     ) then
    raise exception '평가기간 영구삭제 권한이 없습니다.';
  end if;

  select name
    into v_period_name
    from public.evaluation_periods
   where id = p_period_id
   for update;

  if not found then
    raise exception '삭제할 평가기간을 찾을 수 없습니다.';
  end if;

  select count(*)
    into v_assignment_count
    from public.evaluation_assignments
   where period_id = p_period_id;

  select count(*)
    into v_observation_count
    from public.observation_logs
   where period_id = p_period_id;

  select count(*)
    into v_growth_plan_count
    from public.growth_plans gp
   where gp.source_assignment_id in (
           select a.id
             from public.evaluation_assignments a
            where a.period_id = p_period_id
         )
      or gp.source_result_id in (
           select er.id
             from public.evaluation_results er
             join public.evaluation_assignments a on a.id = er.assignment_id
            where a.period_id = p_period_id
         )
      or gp.source_response_id in (
           select r.id
             from public.evaluation_responses r
             join public.evaluations e on e.id = r.evaluation_id
             join public.evaluation_assignments a on a.id = e.assignment_id
            where a.period_id = p_period_id
         );

  select id
    into v_actor_employee_id
    from public.employees
   where user_id = auth.uid()
   limit 1;

  -- A cloned period may point back to the period being deleted.
  -- Keep the clone, remove only its source pointer.
  update public.evaluation_periods
     set copied_from_id = null,
         updated_at = now()
   where copied_from_id = p_period_id;

  -- Growth plans are not configured with ON DELETE CASCADE for their
  -- source assignment/result/response, so delete period-derived plans first.
  delete from public.growth_plans gp
   where gp.source_assignment_id in (
           select a.id
             from public.evaluation_assignments a
            where a.period_id = p_period_id
         )
      or gp.source_result_id in (
           select er.id
             from public.evaluation_results er
             join public.evaluation_assignments a on a.id = er.assignment_id
            where a.period_id = p_period_id
         )
      or gp.source_response_id in (
           select r.id
             from public.evaluation_responses r
             join public.evaluations e on e.id = r.evaluation_id
             join public.evaluation_assignments a on a.id = e.assignment_id
            where a.period_id = p_period_id
         );

  -- These tables reference assignments without ON DELETE CASCADE.
  delete from public.calibration_logs
   where assignment_id in (
     select id from public.evaluation_assignments where period_id = p_period_id
   )
      or evaluation_id in (
     select e.id
       from public.evaluations e
       join public.evaluation_assignments a on a.id = e.assignment_id
      where a.period_id = p_period_id
   )
      or response_id in (
     select r.id
       from public.evaluation_responses r
       join public.evaluations e on e.id = r.evaluation_id
       join public.evaluation_assignments a on a.id = e.assignment_id
      where a.period_id = p_period_id
   );

  delete from public.evaluation_history
   where assignment_id in (
     select id from public.evaluation_assignments where period_id = p_period_id
   );

  -- Period-scoped observation/evidence data is part of the requested
  -- diagnostic history for this period, so remove it as well.
  delete from public.observation_logs
   where period_id = p_period_id;

  -- Period-scoped leadership diagnostic records.
  delete from public.leadership_red_flags
   where period_id = p_period_id;

  -- evaluation_period_template_rules and nine_block_settings have
  -- ON DELETE CASCADE. evaluation_assignments also cascades to snapshots,
  -- self evaluations, evaluations/responses/reviews/results etc.
  delete from public.evaluation_periods
   where id = p_period_id;

  -- Keep a technical audit event showing that destructive deletion occurred.
  insert into public.audit_logs(
    actor_user_id,
    actor_employee_id,
    action,
    resource_type,
    resource_id,
    metadata
  )
  values(
    auth.uid(),
    v_actor_employee_id,
    'permanent_delete',
    'evaluation_periods',
    p_period_id::text,
    jsonb_build_object(
      'period_name', v_period_name,
      'assignment_count', v_assignment_count,
      'observation_count', v_observation_count,
      'growth_plan_count', v_growth_plan_count,
      'deleted_at', now()
    )
  );

  return jsonb_build_object(
    'deleted', true,
    'period_id', p_period_id,
    'period_name', v_period_name,
    'assignment_count', v_assignment_count,
    'observation_count', v_observation_count,
    'growth_plan_count', v_growth_plan_count
  );
end;
$$;

revoke all on function public.delete_evaluation_period_completely(uuid) from public;
grant execute on function public.delete_evaluation_period_completely(uuid)
  to authenticated, service_role;

-- FORCE_DEMO_LOGIN server client permissions.
grant select, insert, update, delete on table
  public.evaluation_periods,
  public.evaluation_period_template_rules,
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
