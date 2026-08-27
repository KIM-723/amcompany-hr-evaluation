-- AMCOMPANY HR Evaluation System
-- STEP 4: Authentication helpers + Role/department scoped RLS
-- Prerequisite: 001_initial_schema.sql + 002_step2_schema_hardening.sql + STEP 3 seed
-- This migration does not insert Auth users. Demo Auth users are created from /demo-setup.

begin;

-- Keep the STEP 2 snapshot function able to resolve pgcrypto functions installed in extensions.
alter function public.create_assignment_snapshot(uuid, uuid)
  set search_path = public, extensions;

-- -----------------------------------------------------------------------------
-- 1. Authentication / authorization helper functions
-- -----------------------------------------------------------------------------
create or replace function public.current_employee_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select e.id
  from public.employees e
  where e.user_id = auth.uid()
    and e.employment_status <> 'resigned'
  limit 1
$$;

create or replace function public.current_role_codes()
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(distinct r.code order by r.code), array[]::text[])
  from public.employee_role_assignments era
  join public.roles r on r.id = era.role_id and r.is_active
  join public.employees e on e.id = era.employee_id
  where e.user_id = auth.uid()
    and era.valid_from <= current_date
    and (era.valid_to is null or era.valid_to >= current_date)
$$;

create or replace function public.has_role(role_code text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select role_code = any(public.current_role_codes())
$$;

create or replace function public.is_hr_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('hr_admin') or public.has_role('super_admin')
$$;

create or replace function public.can_access_department(target_department_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_hr_admin()
    or exists (
      select 1
      from public.employee_role_assignments era
      join public.roles r on r.id = era.role_id
      join public.employees e on e.id = era.employee_id
      where e.user_id = auth.uid()
        and r.code = 'leader'
        and era.scope_department_id = target_department_id
        and era.valid_from <= current_date
        and (era.valid_to is null or era.valid_to >= current_date)
    )
$$;

create or replace function public.can_view_assignment(target_assignment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.evaluation_assignments a
    join public.employees subject on subject.id = a.employee_id
    where a.id = target_assignment_id
      and (
        public.is_hr_admin()
        or a.employee_id = public.current_employee_id()
        or a.first_evaluator_id = public.current_employee_id()
        or a.second_evaluator_id = public.current_employee_id()
        or public.can_access_department(subject.department_id)
      )
  )
$$;

create or replace function public.can_review_assignment(target_assignment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.evaluation_assignments a
    join public.employees subject on subject.id = a.employee_id
    where a.id = target_assignment_id
      and (
        public.is_hr_admin()
        or a.first_evaluator_id = public.current_employee_id()
        or a.second_evaluator_id = public.current_employee_id()
        or public.can_access_department(subject.department_id)
      )
  )
$$;

revoke all on function public.current_employee_id() from public;
revoke all on function public.current_role_codes() from public;
revoke all on function public.has_role(text) from public;
revoke all on function public.is_hr_admin() from public;
revoke all on function public.can_access_department(uuid) from public;
revoke all on function public.can_view_assignment(uuid) from public;
revoke all on function public.can_review_assignment(uuid) from public;

grant execute on function public.current_employee_id() to authenticated;
grant execute on function public.current_role_codes() to authenticated;
grant execute on function public.has_role(text) to authenticated;
grant execute on function public.is_hr_admin() to authenticated;
grant execute on function public.can_access_department(uuid) to authenticated;
grant execute on function public.can_view_assignment(uuid) to authenticated;
grant execute on function public.can_review_assignment(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- 2. Enable RLS on every application table
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.departments enable row level security;
alter table public.positions enable row level security;
alter table public.job_levels enable row level security;
alter table public.roles enable row level security;
alter table public.employees enable row level security;
alter table public.employee_role_assignments enable row level security;
alter table public.core_values enable row level security;
alter table public.evaluation_periods enable row level security;
alter table public.evaluation_templates enable row level security;
alter table public.evaluation_categories enable row level security;
alter table public.evaluation_questions enable row level security;
alter table public.evaluation_question_standards enable row level security;
alter table public.evaluation_question_core_values enable row level security;
alter table public.evaluation_period_template_rules enable row level security;
alter table public.evaluation_question_job_levels enable row level security;
alter table public.evaluation_question_positions enable row level security;
alter table public.evaluation_assignments enable row level security;
alter table public.evaluation_snapshots enable row level security;
alter table public.self_evaluations enable row level security;
alter table public.evaluations enable row level security;
alter table public.evaluation_responses enable row level security;
alter table public.evaluation_comments enable row level security;
alter table public.observation_logs enable row level security;
alter table public.evaluation_evidence_links enable row level security;
alter table public.evaluation_core_values enable row level security;
alter table public.evaluation_review_items enable row level security;
alter table public.evaluation_category_scores enable row level security;
alter table public.evaluation_results enable row level security;
alter table public.growth_plans enable row level security;
alter table public.growth_plan_checkpoints enable row level security;
alter table public.calibration_logs enable row level security;
alter table public.evaluation_history enable row level security;
alter table public.leadership_red_flags enable row level security;
alter table public.projects enable row level security;
alter table public.employee_projects enable row level security;
alter table public.nine_block_settings enable row level security;
alter table public.audit_logs enable row level security;

-- Remove earlier permissive policies and rebuild a single STEP 4 policy set.
do $$
declare p record;
begin
  for p in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = any(array[
        'profiles','departments','positions','job_levels','roles','employees','employee_role_assignments','core_values',
        'evaluation_periods','evaluation_templates','evaluation_categories','evaluation_questions','evaluation_question_standards',
        'evaluation_question_core_values','evaluation_period_template_rules','evaluation_question_job_levels','evaluation_question_positions',
        'evaluation_assignments','evaluation_snapshots','self_evaluations','evaluations','evaluation_responses','evaluation_comments',
        'observation_logs','evaluation_evidence_links','evaluation_core_values','evaluation_review_items','evaluation_category_scores',
        'evaluation_results','growth_plans','growth_plan_checkpoints','calibration_logs','evaluation_history','leadership_red_flags',
        'projects','employee_projects','nine_block_settings','audit_logs'
      ])
  loop
    execute format('drop policy if exists %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- 3. Master data: authenticated read, HR write
-- -----------------------------------------------------------------------------
create policy master_departments_read on public.departments for select to authenticated using (true);
create policy master_departments_write on public.departments for all to authenticated using (public.is_hr_admin()) with check (public.is_hr_admin());
create policy master_positions_read on public.positions for select to authenticated using (true);
create policy master_positions_write on public.positions for all to authenticated using (public.is_hr_admin()) with check (public.is_hr_admin());
create policy master_job_levels_read on public.job_levels for select to authenticated using (true);
create policy master_job_levels_write on public.job_levels for all to authenticated using (public.is_hr_admin()) with check (public.is_hr_admin());
create policy master_roles_read on public.roles for select to authenticated using (true);
create policy master_roles_write on public.roles for all to authenticated using (public.is_hr_admin()) with check (public.is_hr_admin());
create policy master_core_values_read on public.core_values for select to authenticated using (true);
create policy master_core_values_write on public.core_values for all to authenticated using (public.is_hr_admin()) with check (public.is_hr_admin());
create policy master_periods_read on public.evaluation_periods for select to authenticated using (true);
create policy master_periods_write on public.evaluation_periods for all to authenticated using (public.is_hr_admin()) with check (public.is_hr_admin());
create policy master_templates_read on public.evaluation_templates for select to authenticated using (true);
create policy master_templates_write on public.evaluation_templates for all to authenticated using (public.is_hr_admin()) with check (public.is_hr_admin());
create policy master_categories_read on public.evaluation_categories for select to authenticated using (true);
create policy master_categories_write on public.evaluation_categories for all to authenticated using (public.is_hr_admin()) with check (public.is_hr_admin());
create policy master_questions_read on public.evaluation_questions for select to authenticated using (true);
create policy master_questions_write on public.evaluation_questions for all to authenticated using (public.is_hr_admin()) with check (public.is_hr_admin());
create policy master_question_standards_read on public.evaluation_question_standards for select to authenticated using (true);
create policy master_question_standards_write on public.evaluation_question_standards for all to authenticated using (public.is_hr_admin()) with check (public.is_hr_admin());
create policy master_question_values_read on public.evaluation_question_core_values for select to authenticated using (true);
create policy master_question_values_write on public.evaluation_question_core_values for all to authenticated using (public.is_hr_admin()) with check (public.is_hr_admin());
create policy master_period_rules_read on public.evaluation_period_template_rules for select to authenticated using (true);
create policy master_period_rules_write on public.evaluation_period_template_rules for all to authenticated using (public.is_hr_admin()) with check (public.is_hr_admin());
create policy master_question_levels_read on public.evaluation_question_job_levels for select to authenticated using (true);
create policy master_question_levels_write on public.evaluation_question_job_levels for all to authenticated using (public.is_hr_admin()) with check (public.is_hr_admin());
create policy master_question_positions_read on public.evaluation_question_positions for select to authenticated using (true);
create policy master_question_positions_write on public.evaluation_question_positions for all to authenticated using (public.is_hr_admin()) with check (public.is_hr_admin());
create policy projects_read on public.projects for select to authenticated using (true);
create policy projects_write on public.projects for all to authenticated using (public.is_hr_admin()) with check (public.is_hr_admin());
create policy employee_projects_read on public.employee_projects for select to authenticated using (
  public.is_hr_admin()
  or employee_id = public.current_employee_id()
  or exists(select 1 from public.employees e where e.id = employee_projects.employee_id and public.can_access_department(e.department_id))
);
create policy employee_projects_write on public.employee_projects for all to authenticated using (public.is_hr_admin()) with check (public.is_hr_admin());
create policy nine_block_settings_read on public.nine_block_settings for select to authenticated using (true);
create policy nine_block_settings_write on public.nine_block_settings for all to authenticated using (public.is_hr_admin()) with check (public.is_hr_admin());

-- -----------------------------------------------------------------------------
-- 4. User / employee / Role scope
-- -----------------------------------------------------------------------------
create policy profiles_select on public.profiles for select to authenticated using (
  id = auth.uid() or public.is_hr_admin()
);
create policy profiles_update_self on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy employee_roles_select on public.employee_role_assignments for select to authenticated using (
  employee_id = public.current_employee_id() or public.is_hr_admin()
);
create policy employee_roles_write on public.employee_role_assignments for all to authenticated using (public.is_hr_admin()) with check (public.is_hr_admin());

create policy employees_select on public.employees for select to authenticated using (
  user_id = auth.uid()
  or public.is_hr_admin()
  or public.can_access_department(department_id)
  or exists(
    select 1 from public.evaluation_assignments a
    where a.employee_id = employees.id
      and (a.first_evaluator_id = public.current_employee_id() or a.second_evaluator_id = public.current_employee_id())
  )
);
create policy employees_write on public.employees for all to authenticated using (public.is_hr_admin()) with check (public.is_hr_admin());

-- -----------------------------------------------------------------------------
-- 5. Evaluation assignment / snapshot
-- -----------------------------------------------------------------------------
create policy assignments_select on public.evaluation_assignments for select to authenticated using (
  public.can_view_assignment(id)
);
create policy assignments_write on public.evaluation_assignments for all to authenticated using (public.is_hr_admin()) with check (public.is_hr_admin());

create policy snapshots_select on public.evaluation_snapshots for select to authenticated using (
  public.can_view_assignment(assignment_id)
);
create policy snapshots_write on public.evaluation_snapshots for all to authenticated using (public.is_hr_admin()) with check (public.is_hr_admin());

-- -----------------------------------------------------------------------------
-- 6. Self evaluation
-- -----------------------------------------------------------------------------
create policy self_eval_select on public.self_evaluations for select to authenticated using (
  public.is_hr_admin()
  or exists(select 1 from public.evaluation_assignments a where a.id = self_evaluations.assignment_id and a.employee_id = public.current_employee_id())
  or public.can_review_assignment(assignment_id)
);
create policy self_eval_insert on public.self_evaluations for insert to authenticated with check (
  public.is_hr_admin()
  or exists(select 1 from public.evaluation_assignments a where a.id = self_evaluations.assignment_id and a.employee_id = public.current_employee_id())
);
create policy self_eval_update on public.self_evaluations for update to authenticated using (
  public.is_hr_admin()
  or exists(select 1 from public.evaluation_assignments a where a.id = self_evaluations.assignment_id and a.employee_id = public.current_employee_id())
) with check (
  public.is_hr_admin()
  or exists(select 1 from public.evaluation_assignments a where a.id = self_evaluations.assignment_id and a.employee_id = public.current_employee_id())
);

-- -----------------------------------------------------------------------------
-- 7. Evaluations / responses / comments / core values
-- -----------------------------------------------------------------------------
create policy evaluations_select on public.evaluations for select to authenticated using (
  public.is_hr_admin()
  or evaluator_id = public.current_employee_id()
  or public.can_review_assignment(assignment_id)
  or exists(
    select 1 from public.evaluation_assignments a
    where a.id = evaluations.assignment_id
      and a.employee_id = public.current_employee_id()
      and a.status = 'finalized'
  )
);
create policy evaluations_insert on public.evaluations for insert to authenticated with check (
  public.is_hr_admin() or evaluator_id = public.current_employee_id()
);
create policy evaluations_update on public.evaluations for update to authenticated using (
  public.is_hr_admin() or evaluator_id = public.current_employee_id()
) with check (
  public.is_hr_admin() or evaluator_id = public.current_employee_id()
);

create policy responses_select on public.evaluation_responses for select to authenticated using (
  exists(select 1 from public.evaluations ev where ev.id = evaluation_responses.evaluation_id and (
    public.is_hr_admin()
    or ev.evaluator_id = public.current_employee_id()
    or public.can_review_assignment(ev.assignment_id)
    or exists(select 1 from public.evaluation_assignments a where a.id = ev.assignment_id and a.employee_id = public.current_employee_id() and a.status = 'finalized')
  ))
);
create policy responses_insert on public.evaluation_responses for insert to authenticated with check (
  exists(select 1 from public.evaluations ev where ev.id = evaluation_responses.evaluation_id and (public.is_hr_admin() or ev.evaluator_id = public.current_employee_id()))
);
create policy responses_update on public.evaluation_responses for update to authenticated using (
  exists(select 1 from public.evaluations ev where ev.id = evaluation_responses.evaluation_id and (public.is_hr_admin() or ev.evaluator_id = public.current_employee_id()))
) with check (
  exists(select 1 from public.evaluations ev where ev.id = evaluation_responses.evaluation_id and (public.is_hr_admin() or ev.evaluator_id = public.current_employee_id()))
);

create policy comments_select on public.evaluation_comments for select to authenticated using (
  exists(select 1 from public.evaluations ev where ev.id = evaluation_comments.evaluation_id and (
    public.is_hr_admin() or ev.evaluator_id = public.current_employee_id() or public.can_review_assignment(ev.assignment_id)
  ))
);
create policy comments_insert on public.evaluation_comments for insert to authenticated with check (
  author_id = public.current_employee_id() and exists(select 1 from public.evaluations ev where ev.id = evaluation_comments.evaluation_id and public.can_review_assignment(ev.assignment_id))
  or public.is_hr_admin()
);

create policy evaluation_values_select on public.evaluation_core_values for select to authenticated using (
  exists(select 1 from public.evaluations ev where ev.id = evaluation_core_values.evaluation_id and (
    public.is_hr_admin() or ev.evaluator_id = public.current_employee_id() or public.can_review_assignment(ev.assignment_id)
    or exists(select 1 from public.evaluation_assignments a where a.id=ev.assignment_id and a.employee_id=public.current_employee_id() and a.status='finalized')
  ))
);
create policy evaluation_values_write on public.evaluation_core_values for all to authenticated using (
  exists(select 1 from public.evaluations ev where ev.id = evaluation_core_values.evaluation_id and (public.is_hr_admin() or ev.evaluator_id = public.current_employee_id()))
) with check (
  exists(select 1 from public.evaluations ev where ev.id = evaluation_core_values.evaluation_id and (public.is_hr_admin() or ev.evaluator_id = public.current_employee_id()))
);

-- -----------------------------------------------------------------------------
-- 8. Observation evidence
-- -----------------------------------------------------------------------------
create policy observations_select on public.observation_logs for select to authenticated using (
  public.is_hr_admin()
  or observer_id = public.current_employee_id()
  or (subject_employee_id = public.current_employee_id() and visibility = 'subject_visible')
  or exists(select 1 from public.employees e where e.id = observation_logs.subject_employee_id and public.can_access_department(e.department_id))
);
create policy observations_insert on public.observation_logs for insert to authenticated with check (
  public.is_hr_admin() or observer_id = public.current_employee_id()
);
create policy observations_update on public.observation_logs for update to authenticated using (
  public.is_hr_admin() or observer_id = public.current_employee_id()
) with check (
  public.is_hr_admin() or observer_id = public.current_employee_id()
);
create policy observations_delete on public.observation_logs for delete to authenticated using (
  public.is_hr_admin() or observer_id = public.current_employee_id()
);

create policy evidence_links_select on public.evaluation_evidence_links for select to authenticated using (
  exists(select 1 from public.evaluation_responses er join public.evaluations ev on ev.id=er.evaluation_id where er.id=evaluation_evidence_links.response_id and (
    public.is_hr_admin() or ev.evaluator_id=public.current_employee_id() or public.can_review_assignment(ev.assignment_id)
  ))
);
create policy evidence_links_write on public.evaluation_evidence_links for all to authenticated using (
  public.is_hr_admin() or linked_by = public.current_employee_id()
) with check (
  public.is_hr_admin() or linked_by = public.current_employee_id()
);

-- -----------------------------------------------------------------------------
-- 9. Second review / aggregates / final results
-- -----------------------------------------------------------------------------
create policy review_items_select on public.evaluation_review_items for select to authenticated using (
  public.is_hr_admin()
  or reviewer_id = public.current_employee_id()
  or exists(select 1 from public.evaluations ev where ev.id=evaluation_review_items.evaluation_id and public.can_review_assignment(ev.assignment_id))
);
create policy review_items_write on public.evaluation_review_items for all to authenticated using (
  public.is_hr_admin() or reviewer_id = public.current_employee_id()
) with check (
  public.is_hr_admin() or reviewer_id = public.current_employee_id()
);

create policy category_scores_select on public.evaluation_category_scores for select to authenticated using (
  exists(select 1 from public.evaluations ev where ev.id=evaluation_category_scores.evaluation_id and (
    public.is_hr_admin() or ev.evaluator_id=public.current_employee_id() or public.can_review_assignment(ev.assignment_id)
    or exists(select 1 from public.evaluation_assignments a where a.id=ev.assignment_id and a.employee_id=public.current_employee_id() and a.status='finalized')
  ))
);
create policy category_scores_write on public.evaluation_category_scores for all to authenticated using (public.is_hr_admin()) with check (public.is_hr_admin());

create policy results_select on public.evaluation_results for select to authenticated using (
  public.is_hr_admin()
  or exists(
    select 1 from public.evaluation_assignments a
    join public.employees subject on subject.id=a.employee_id
    where a.id=evaluation_results.assignment_id
      and (
        (a.employee_id=public.current_employee_id() and evaluation_results.is_released)
        or a.first_evaluator_id=public.current_employee_id()
        or a.second_evaluator_id=public.current_employee_id()
        or public.can_access_department(subject.department_id)
      )
  )
);
create policy results_write on public.evaluation_results for all to authenticated using (public.is_hr_admin()) with check (public.is_hr_admin());

-- -----------------------------------------------------------------------------
-- 10. Growth
-- -----------------------------------------------------------------------------
create policy growth_plans_select on public.growth_plans for select to authenticated using (
  public.is_hr_admin()
  or employee_id=public.current_employee_id()
  or created_by=public.current_employee_id()
  or exists(select 1 from public.employees e where e.id=growth_plans.employee_id and public.can_access_department(e.department_id))
);
create policy growth_plans_insert on public.growth_plans for insert to authenticated with check (
  public.is_hr_admin() or employee_id=public.current_employee_id() or created_by=public.current_employee_id()
);
create policy growth_plans_update on public.growth_plans for update to authenticated using (
  public.is_hr_admin() or employee_id=public.current_employee_id() or created_by=public.current_employee_id()
) with check (
  public.is_hr_admin() or employee_id=public.current_employee_id() or created_by=public.current_employee_id()
);

create policy growth_checkpoints_select on public.growth_plan_checkpoints for select to authenticated using (
  exists(select 1 from public.growth_plans gp where gp.id=growth_plan_checkpoints.growth_plan_id and (
    public.is_hr_admin() or gp.employee_id=public.current_employee_id() or gp.created_by=public.current_employee_id()
    or exists(select 1 from public.employees e where e.id=gp.employee_id and public.can_access_department(e.department_id))
  ))
);
create policy growth_checkpoints_insert on public.growth_plan_checkpoints for insert to authenticated with check (
  public.is_hr_admin() or created_by=public.current_employee_id()
);
create policy growth_checkpoints_update on public.growth_plan_checkpoints for update to authenticated using (
  public.is_hr_admin() or created_by=public.current_employee_id()
) with check (
  public.is_hr_admin() or created_by=public.current_employee_id()
);

-- -----------------------------------------------------------------------------
-- 11. Sensitive HR-only tables / history
-- -----------------------------------------------------------------------------
create policy calibration_hr_only on public.calibration_logs for all to authenticated using (public.is_hr_admin()) with check (public.is_hr_admin());
create policy red_flags_hr_only on public.leadership_red_flags for all to authenticated using (public.is_hr_admin()) with check (public.is_hr_admin());
create policy audit_hr_read on public.audit_logs for select to authenticated using (public.is_hr_admin());
create policy audit_insert_authenticated on public.audit_logs for insert to authenticated with check (actor_user_id = auth.uid());

create policy history_select on public.evaluation_history for select to authenticated using (
  public.is_hr_admin() or public.can_review_assignment(assignment_id)
);
create policy history_insert on public.evaluation_history for insert to authenticated with check (
  public.is_hr_admin() or public.can_review_assignment(assignment_id)
);

commit;
