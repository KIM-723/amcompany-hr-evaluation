-- AMCOMPANY HR Evaluation System
-- STEP 2: Database schema hardening / snapshot / history / review structures
-- Safe to run after 001_initial_schema.sql. No sample data is inserted.

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- 1. Common helpers
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- 2. Strengthen existing master tables
-- -----------------------------------------------------------------------------
alter table public.departments
  add column if not exists description text,
  add column if not exists updated_at timestamptz not null default now();

alter table public.positions
  add column if not exists code text,
  add column if not exists description text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists uq_positions_code_not_null
  on public.positions(code)
  where code is not null;

alter table public.job_levels
  add column if not exists code text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists uq_job_levels_code_not_null
  on public.job_levels(code)
  where code is not null;

alter table public.roles
  add column if not exists description text,
  add column if not exists is_system boolean not null default true,
  add column if not exists is_active boolean not null default true,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.employees
  add column if not exists phone text,
  add column if not exists resignation_date date,
  add column if not exists notes text;

alter table public.employee_role_assignments
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.core_values
  add column if not exists updated_at timestamptz not null default now();

-- -----------------------------------------------------------------------------
-- 3. Evaluation period / template governance
-- -----------------------------------------------------------------------------
alter table public.evaluation_periods
  add column if not exists code text,
  add column if not exists activated_at timestamptz,
  add column if not exists closed_at timestamptz,
  add column if not exists created_by uuid references public.employees(id),
  add column if not exists updated_by uuid references public.employees(id);

create unique index if not exists uq_evaluation_periods_code_not_null
  on public.evaluation_periods(code)
  where code is not null;

alter table public.evaluation_templates
  add column if not exists code text,
  add column if not exists effective_from date,
  add column if not exists effective_to date,
  add column if not exists created_by uuid references public.employees(id),
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists updated_by uuid references public.employees(id);

create unique index if not exists uq_evaluation_templates_code_version
  on public.evaluation_templates(code, version)
  where code is not null;

alter table public.evaluation_categories
  add column if not exists description text,
  add column if not exists is_required boolean not null default true,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.evaluation_questions
  add column if not exists code text,
  add column if not exists question_type text not null default 'score',
  add column if not exists min_score numeric(2,1) not null default 1.0,
  add column if not exists max_score numeric(2,1) not null default 5.0,
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists uq_evaluation_questions_template_code_not_null
  on public.evaluation_questions(template_id, code)
  where code is not null;

-- Which template applies to a period / job level / position.
create table if not exists public.evaluation_period_template_rules (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references public.evaluation_periods(id) on delete cascade,
  template_id uuid not null references public.evaluation_templates(id),
  job_level_id uuid references public.job_levels(id),
  position_id uuid references public.positions(id),
  department_id uuid references public.departments(id),
  priority int not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_period_template_rule_scope
  on public.evaluation_period_template_rules(
    period_id,
    template_id,
    coalesce(job_level_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(position_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(department_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

-- Question applicability is normalized instead of hardcoding job levels / positions.
create table if not exists public.evaluation_question_job_levels (
  question_id uuid not null references public.evaluation_questions(id) on delete cascade,
  job_level_id uuid not null references public.job_levels(id) on delete cascade,
  primary key(question_id, job_level_id)
);

create table if not exists public.evaluation_question_positions (
  question_id uuid not null references public.evaluation_questions(id) on delete cascade,
  position_id uuid not null references public.positions(id) on delete cascade,
  primary key(question_id, position_id)
);

-- -----------------------------------------------------------------------------
-- 4. Assignment snapshot architecture
-- -----------------------------------------------------------------------------
alter table public.evaluation_assignments
  add column if not exists snapshot_version int not null default 1,
  add column if not exists snapshot_created_at timestamptz,
  add column if not exists started_at timestamptz,
  add column if not exists current_stage text not null default 'not_started',
  add column if not exists updated_at timestamptz not null default now();

-- Explicit immutable evaluation snapshot. The JSON snapshot is the source of truth
-- for historical evaluation context after an assignment starts.
create table if not exists public.evaluation_snapshots (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null unique references public.evaluation_assignments(id) on delete cascade,
  snapshot_version int not null default 1,
  period_snapshot jsonb not null,
  employee_snapshot jsonb not null,
  organization_snapshot jsonb not null,
  evaluator_snapshot jsonb not null,
  template_snapshot jsonb not null,
  core_values_snapshot jsonb not null default '[]'::jsonb,
  snapshot_checksum text,
  created_by uuid references public.employees(id),
  created_at timestamptz not null default now()
);

comment on table public.evaluation_snapshots is
'Immutable evaluation-start snapshot. Protects historical department, job level, position, evaluators, questions, standards and core values from later master-data changes.';

-- -----------------------------------------------------------------------------
-- 5. Evaluation / review / final result structures
-- -----------------------------------------------------------------------------
alter table public.evaluations
  add column if not exists review_summary text,
  add column if not exists approved_at timestamptz,
  add column if not exists finalized_at timestamptz,
  add column if not exists updated_by uuid references public.employees(id);

alter table public.evaluation_responses
  add column if not exists standard_snapshot jsonb,
  add column if not exists evidence_note text,
  add column if not exists updated_by uuid references public.employees(id);

-- Structured 2nd reviewer decisions per question / evaluation.
create table if not exists public.evaluation_review_items (
  id uuid primary key default gen_random_uuid(),
  evaluation_id uuid not null references public.evaluations(id) on delete cascade,
  response_id uuid references public.evaluation_responses(id) on delete cascade,
  reviewer_id uuid not null references public.employees(id),
  decision text not null check(decision in ('approved','commented','revision_requested','calibration_required')),
  reason_code text,
  review_comment text,
  requested_score numeric(2,1) check(requested_score is null or requested_score between 1 and 5),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Category aggregates are materialized when submitted/finalized so reports keep the
-- value used at the time instead of depending on future formula changes.
create table if not exists public.evaluation_category_scores (
  id uuid primary key default gen_random_uuid(),
  evaluation_id uuid not null references public.evaluations(id) on delete cascade,
  category_id uuid references public.evaluation_categories(id),
  category_code text not null,
  category_name text not null,
  raw_score numeric(5,2),
  weighted_score numeric(5,2),
  weight numeric(6,3),
  calculated_at timestamptz not null default now(),
  unique(evaluation_id, category_code)
);

-- Final result snapshot used by result screen, exports and 9-block.
create table if not exists public.evaluation_results (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null unique references public.evaluation_assignments(id) on delete cascade,
  final_evaluation_id uuid references public.evaluations(id),
  performance_score numeric(4,2),
  competency_score numeric(4,2),
  attitude_score numeric(4,2),
  leadership_score numeric(4,2),
  total_score numeric(4,2),
  core_value_scores jsonb not null default '{}'::jsonb,
  strengths jsonb not null default '[]'::jsonb,
  growth_needs jsonb not null default '[]'::jsonb,
  result_snapshot jsonb not null default '{}'::jsonb,
  is_released boolean not null default false,
  released_at timestamptz,
  finalized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 6. Evidence / observation enhancements
-- -----------------------------------------------------------------------------
alter table public.observation_logs
  add column if not exists related_work text,
  add column if not exists visibility text not null default 'evaluator_hr'
    check(visibility in ('private','evaluator_hr','subject_visible')),
  add column if not exists is_archived boolean not null default false;

alter table public.evaluation_evidence_links
  add column if not exists note text;

-- -----------------------------------------------------------------------------
-- 7. Growth plan linkage
-- -----------------------------------------------------------------------------
alter table public.growth_plans
  add column if not exists source_result_id uuid references public.evaluation_results(id),
  add column if not exists source_response_id uuid references public.evaluation_responses(id),
  add column if not exists success_measure text;

-- -----------------------------------------------------------------------------
-- 8. Calibration / 9-block settings
-- -----------------------------------------------------------------------------
alter table public.calibration_logs
  add column if not exists evaluation_id uuid references public.evaluations(id),
  add column if not exists approved_by uuid references public.employees(id),
  add column if not exists approved_at timestamptz;

create table if not exists public.nine_block_settings (
  id uuid primary key default gen_random_uuid(),
  period_id uuid references public.evaluation_periods(id) on delete cascade,
  name text not null default '기본 9-Block 기준',
  performance_low_max numeric(3,2) not null default 2.70,
  performance_middle_max numeric(3,2) not null default 3.70,
  competency_low_max numeric(3,2) not null default 2.70,
  competency_middle_max numeric(3,2) not null default 3.70,
  block_guidance jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_by uuid references public.employees(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_nine_block_performance_thresholds check (
    performance_low_max >= 1 and performance_low_max < performance_middle_max and performance_middle_max < 5
  ),
  constraint chk_nine_block_competency_thresholds check (
    competency_low_max >= 1 and competency_low_max < competency_middle_max and competency_middle_max < 5
  )
);

create unique index if not exists uq_nine_block_settings_active_period
  on public.nine_block_settings(period_id)
  where is_active = true and period_id is not null;

-- -----------------------------------------------------------------------------
-- 9. Audit / history metadata
-- -----------------------------------------------------------------------------
alter table public.evaluation_history
  add column if not exists source text not null default 'application',
  add column if not exists request_id text;

alter table public.audit_logs
  add column if not exists actor_employee_id uuid references public.employees(id),
  add column if not exists ip_address inet,
  add column if not exists user_agent text;

-- -----------------------------------------------------------------------------
-- 10. Constraints that can be safely added only when absent
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'chk_evaluation_period_dates') then
    alter table public.evaluation_periods
      add constraint chk_evaluation_period_dates check (start_date <= end_date);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'chk_employee_resignation_date') then
    alter table public.employees
      add constraint chk_employee_resignation_date check (resignation_date is null or resignation_date >= hire_date);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'chk_role_assignment_dates') then
    alter table public.employee_role_assignments
      add constraint chk_role_assignment_dates check (valid_to is null or valid_to >= valid_from);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'chk_question_score_range') then
    alter table public.evaluation_questions
      add constraint chk_question_score_range check (min_score >= 1 and max_score <= 5 and min_score <= max_score);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'chk_category_weight_range') then
    alter table public.evaluation_categories
      add constraint chk_category_weight_range check (weight >= 0 and weight <= 100);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'chk_question_weight_range') then
    alter table public.evaluation_questions
      add constraint chk_question_weight_range check (weight >= 0 and weight <= 100);
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 11. Indexes for high-frequency HR queries
-- -----------------------------------------------------------------------------
create index if not exists idx_departments_parent_sort
  on public.departments(parent_id, sort_order)
  where is_active = true;

create index if not exists idx_employees_status_department
  on public.employees(employment_status, department_id);

create index if not exists idx_employee_roles_employee_dates
  on public.employee_role_assignments(employee_id, valid_from, valid_to);

create index if not exists idx_periods_status_dates
  on public.evaluation_periods(status, start_date, end_date);

create index if not exists idx_template_rules_period_priority
  on public.evaluation_period_template_rules(period_id, priority)
  where is_active = true;

create index if not exists idx_questions_template_category_sort
  on public.evaluation_questions(template_id, category_id, sort_order)
  where is_active = true;

create index if not exists idx_question_standards_level
  on public.evaluation_question_standards(job_level_id, question_id);

create index if not exists idx_assignments_period_status
  on public.evaluation_assignments(period_id, status);

create index if not exists idx_assignments_employee_period
  on public.evaluation_assignments(employee_id, period_id desc);

create index if not exists idx_assignments_first_status
  on public.evaluation_assignments(first_evaluator_id, status);

create index if not exists idx_assignments_second_status
  on public.evaluation_assignments(second_evaluator_id, status);

create index if not exists idx_snapshots_assignment
  on public.evaluation_snapshots(assignment_id);

create index if not exists idx_evaluations_stage_status
  on public.evaluations(stage, status);

create index if not exists idx_review_items_reviewer_decision
  on public.evaluation_review_items(reviewer_id, decision, created_at desc);

create index if not exists idx_result_release
  on public.evaluation_results(is_released, finalized_at desc);

create index if not exists idx_observation_observer_date
  on public.observation_logs(observer_id, observed_date desc);

create index if not exists idx_observation_period_subject
  on public.observation_logs(period_id, subject_employee_id, observed_date desc);

create index if not exists idx_evidence_observation
  on public.evaluation_evidence_links(observation_log_id);

create index if not exists idx_growth_due_status
  on public.growth_plans(status, due_date);

create index if not exists idx_calibration_assignment_created
  on public.calibration_logs(assignment_id, created_at desc);

create index if not exists idx_audit_resource
  on public.audit_logs(resource_type, resource_id, created_at desc);

create index if not exists idx_audit_actor
  on public.audit_logs(actor_user_id, created_at desc);

-- -----------------------------------------------------------------------------
-- 12. updated_at triggers
-- -----------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles','departments','positions','job_levels','roles','employees',
    'employee_role_assignments','core_values','evaluation_periods','evaluation_templates',
    'evaluation_categories','evaluation_questions','evaluation_period_template_rules',
    'evaluation_assignments','self_evaluations','evaluations','evaluation_responses',
    'evaluation_review_items','evaluation_results','observation_logs','growth_plans',
    'nine_block_settings'
  ]
  loop
    execute format('drop trigger if exists trg_%I_updated_at on public.%I', t, t);
    execute format(
      'create trigger trg_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      t, t
    );
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- 13. Evaluation history triggers
-- -----------------------------------------------------------------------------
create or replace function public.log_evaluation_entity_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_assignment_id uuid;
  v_entity_id uuid;
  v_action text;
begin
  v_action := lower(tg_op);

  if tg_table_name = 'evaluation_assignments' then
    v_assignment_id := coalesce(new.id, old.id);
    v_entity_id := coalesce(new.id, old.id);
  elsif tg_table_name = 'self_evaluations' then
    v_assignment_id := coalesce(new.assignment_id, old.assignment_id);
    v_entity_id := coalesce(new.id, old.id);
  elsif tg_table_name = 'evaluations' then
    v_assignment_id := coalesce(new.assignment_id, old.assignment_id);
    v_entity_id := coalesce(new.id, old.id);
  elsif tg_table_name = 'evaluation_responses' then
    select e.assignment_id
      into v_assignment_id
      from public.evaluations e
     where e.id = coalesce(new.evaluation_id, old.evaluation_id);
    v_entity_id := coalesce(new.id, old.id);
  else
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  insert into public.evaluation_history(
    assignment_id,
    entity_type,
    entity_id,
    action,
    before_data,
    after_data,
    changed_by,
    source
  )
  values(
    v_assignment_id,
    tg_table_name,
    v_entity_id,
    v_action,
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) else null end,
    public.current_employee_id(),
    'db_trigger'
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

-- INSERT/UPDATE history is captured while draft saves happen. DELETE logging is
-- intentionally deferred; destructive operations are handled as a separate security rule.
drop trigger if exists trg_history_evaluation_assignments on public.evaluation_assignments;
create trigger trg_history_evaluation_assignments
  after insert or update on public.evaluation_assignments
  for each row execute function public.log_evaluation_entity_change();

drop trigger if exists trg_history_self_evaluations on public.self_evaluations;
create trigger trg_history_self_evaluations
  after insert or update on public.self_evaluations
  for each row execute function public.log_evaluation_entity_change();

drop trigger if exists trg_history_evaluations on public.evaluations;
create trigger trg_history_evaluations
  after insert or update on public.evaluations
  for each row execute function public.log_evaluation_entity_change();

drop trigger if exists trg_history_evaluation_responses on public.evaluation_responses;
create trigger trg_history_evaluation_responses
  after insert or update on public.evaluation_responses
  for each row execute function public.log_evaluation_entity_change();

-- -----------------------------------------------------------------------------
-- 14. Snapshot helper
-- -----------------------------------------------------------------------------
create or replace function public.create_assignment_snapshot(
  p_assignment_id uuid,
  p_created_by uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  a public.evaluation_assignments%rowtype;
  p public.evaluation_periods%rowtype;
  e public.employees%rowtype;
  d public.departments%rowtype;
  jl public.job_levels%rowtype;
  pos public.positions%rowtype;
  first_e public.employees%rowtype;
  second_e public.employees%rowtype;
  v_snapshot_id uuid;
  v_template jsonb;
  v_core_values jsonb;
begin
  select * into a from public.evaluation_assignments where id = p_assignment_id;
  if not found then
    raise exception 'evaluation_assignment % not found', p_assignment_id;
  end if;

  if exists(select 1 from public.evaluation_snapshots where assignment_id = p_assignment_id) then
    raise exception 'snapshot already exists for assignment %', p_assignment_id;
  end if;

  select * into p from public.evaluation_periods where id = a.period_id;
  select * into e from public.employees where id = a.employee_id;
  select * into d from public.departments where id = e.department_id;
  select * into jl from public.job_levels where id = e.job_level_id;
  select * into pos from public.positions where id = e.position_id;
  select * into first_e from public.employees where id = a.first_evaluator_id;
  select * into second_e from public.employees where id = a.second_evaluator_id;

  select jsonb_build_object(
    'template', to_jsonb(t),
    'categories', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'category', to_jsonb(c),
          'questions', coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'question', to_jsonb(q),
                'standards', coalesce((select jsonb_agg(to_jsonb(s)) from public.evaluation_question_standards s where s.question_id = q.id), '[]'::jsonb),
                'core_values', coalesce((
                  select jsonb_agg(to_jsonb(cv))
                  from public.evaluation_question_core_values qcv
                  join public.core_values cv on cv.id = qcv.core_value_id
                  where qcv.question_id = q.id
                ), '[]'::jsonb)
              ) order by q.sort_order, q.id
            ) from public.evaluation_questions q where q.category_id = c.id and q.is_active = true
          ), '[]'::jsonb)
        ) order by c.sort_order, c.id
      )
      from public.evaluation_categories c
      where c.template_id = t.id
    ), '[]'::jsonb)
  )
  into v_template
  from public.evaluation_templates t
  where t.id = a.template_id;

  select coalesce(jsonb_agg(to_jsonb(cv) order by cv.sort_order, cv.id), '[]'::jsonb)
    into v_core_values
    from public.core_values cv
   where cv.is_active = true;

  insert into public.evaluation_snapshots(
    assignment_id,
    snapshot_version,
    period_snapshot,
    employee_snapshot,
    organization_snapshot,
    evaluator_snapshot,
    template_snapshot,
    core_values_snapshot,
    snapshot_checksum,
    created_by
  )
  values(
    a.id,
    a.snapshot_version,
    to_jsonb(p),
    to_jsonb(e),
    jsonb_build_object('department', to_jsonb(d), 'job_level', to_jsonb(jl), 'position', to_jsonb(pos)),
    jsonb_build_object('first_evaluator', to_jsonb(first_e), 'second_evaluator', to_jsonb(second_e)),
    v_template,
    v_core_values,
    encode(digest(coalesce(v_template::text,'') || coalesce(to_jsonb(e)::text,''), 'sha256'), 'hex'),
    p_created_by
  )
  returning id into v_snapshot_id;

  update public.evaluation_assignments
     set employee_snapshot = to_jsonb(e),
         evaluator_snapshot = jsonb_build_object('first_evaluator', to_jsonb(first_e), 'second_evaluator', to_jsonb(second_e)),
         template_snapshot = v_template,
         snapshot_created_at = now(),
         started_at = coalesce(started_at, now())
   where id = a.id;

  return v_snapshot_id;
end;
$$;

comment on function public.create_assignment_snapshot(uuid, uuid) is
'Creates a one-time immutable snapshot for an evaluation assignment. Call when the assignment becomes active.';

-- -----------------------------------------------------------------------------
-- 15. Secure-by-default RLS for new STEP 2 tables.
-- Detailed policies are implemented in STEP 4.
-- -----------------------------------------------------------------------------
alter table public.evaluation_period_template_rules enable row level security;
alter table public.evaluation_question_job_levels enable row level security;
alter table public.evaluation_question_positions enable row level security;
alter table public.evaluation_snapshots enable row level security;
alter table public.evaluation_review_items enable row level security;
alter table public.evaluation_category_scores enable row level security;
alter table public.evaluation_results enable row level security;
alter table public.nine_block_settings enable row level security;

-- No permissive policies are created here. Until STEP 4, these new tables are
-- intentionally inaccessible to anon/authenticated clients and can only be
-- managed by migrations/service-role server code.
