create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  code text unique,
  parent_id uuid references public.departments(id),
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.positions (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order int not null default 0,
  is_active boolean not null default true
);

create table if not exists public.job_levels (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  level_order int not null unique,
  description text,
  is_active boolean not null default true
);

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code in ('employee','first_evaluator','second_evaluator','leader','hr_admin','super_admin')),
  name text not null unique
);

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references public.profiles(id) on delete set null,
  employee_no text not null unique,
  name text not null,
  email text unique,
  hire_date date not null,
  employment_status text not null default 'active' check (employment_status in ('active','leave','resigned')),
  employment_type text not null default 'regular',
  department_id uuid references public.departments(id),
  job_level_id uuid references public.job_levels(id),
  position_id uuid references public.positions(id),
  leader_id uuid references public.employees(id),
  is_leader boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.employee_role_assignments (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  scope_department_id uuid references public.departments(id),
  valid_from date not null default current_date,
  valid_to date,
  unique(employee_id, role_id, scope_department_id, valid_from)
);

create table if not exists public.core_values (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null unique,
  description text,
  sort_order int not null default 0,
  is_active boolean not null default true
);

create table if not exists public.evaluation_periods (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  start_date date not null,
  end_date date not null,
  self_start_date date,
  self_end_date date,
  first_start_date date,
  first_end_date date,
  second_start_date date,
  second_end_date date,
  calibration_start_date date,
  calibration_end_date date,
  result_release_date date,
  status text not null default 'draft' check(status in ('draft','scheduled','active','calibration','closed')),
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.evaluation_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  version int not null default 1,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.evaluation_categories (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.evaluation_templates(id) on delete cascade,
  code text not null,
  name text not null,
  weight numeric(6,3) not null default 0,
  sort_order int not null default 0,
  unique(template_id, code)
);

create table if not exists public.evaluation_questions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.evaluation_templates(id) on delete cascade,
  category_id uuid not null references public.evaluation_categories(id),
  competency text,
  title text not null,
  question text not null,
  description text,
  behavior_examples text,
  weight numeric(6,3) not null default 0,
  is_required boolean not null default true,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.evaluation_question_standards (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.evaluation_questions(id) on delete cascade,
  job_level_id uuid not null references public.job_levels(id),
  expected_behavior text not null,
  unique(question_id, job_level_id)
);

create table if not exists public.evaluation_question_core_values (
  question_id uuid not null references public.evaluation_questions(id) on delete cascade,
  core_value_id uuid not null references public.core_values(id) on delete cascade,
  primary key(question_id, core_value_id)
);

create table if not exists public.evaluation_assignments (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references public.evaluation_periods(id) on delete cascade,
  employee_id uuid not null references public.employees(id),
  first_evaluator_id uuid references public.employees(id),
  second_evaluator_id uuid references public.employees(id),
  template_id uuid not null references public.evaluation_templates(id),
  status text not null default 'not_started',
  employee_snapshot jsonb not null,
  evaluator_snapshot jsonb not null,
  template_snapshot jsonb not null,
  assigned_at timestamptz not null default now(),
  finalized_at timestamptz,
  unique(period_id, employee_id)
);

create table if not exists public.self_evaluations (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null unique references public.evaluation_assignments(id) on delete cascade,
  achievements text,
  growth_area text,
  gaps text,
  next_improvement text,
  support_needed text,
  performance_score numeric(3,2),
  competency_score numeric(3,2),
  core_value_scores jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check(status in ('draft','submitted','reopened')),
  submitted_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.evaluations (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.evaluation_assignments(id) on delete cascade,
  evaluator_id uuid not null references public.employees(id),
  stage text not null check(stage in ('first','second','final')),
  status text not null default 'draft' check(status in ('draft','submitted','approved','revision_requested','calibration_required','finalized')),
  strengths text,
  improvements text,
  next_expectations text,
  total_score numeric(4,2),
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(assignment_id, evaluator_id, stage)
);

create table if not exists public.evaluation_responses (
  id uuid primary key default gen_random_uuid(),
  evaluation_id uuid not null references public.evaluations(id) on delete cascade,
  question_id uuid references public.evaluation_questions(id),
  question_snapshot jsonb not null,
  score numeric(2,1) not null check(score between 1 and 5),
  comment text,
  evidence_required boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(evaluation_id, question_id)
);

create table if not exists public.evaluation_comments (
  id uuid primary key default gen_random_uuid(),
  evaluation_id uuid not null references public.evaluations(id) on delete cascade,
  author_id uuid not null references public.employees(id),
  question_id uuid references public.evaluation_questions(id),
  comment_type text not null default 'review',
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.observation_logs (
  id uuid primary key default gen_random_uuid(),
  observer_id uuid not null references public.employees(id),
  subject_employee_id uuid not null references public.employees(id),
  observed_date date not null,
  work_context text,
  situation text not null,
  behavior text not null,
  impact_result text not null,
  sentiment text not null check(sentiment in ('positive','improvement')),
  core_value_id uuid references public.core_values(id),
  question_id uuid references public.evaluation_questions(id),
  period_id uuid references public.evaluation_periods(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.evaluation_evidence_links (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null references public.evaluation_responses(id) on delete cascade,
  observation_log_id uuid not null references public.observation_logs(id) on delete cascade,
  linked_by uuid not null references public.employees(id),
  created_at timestamptz not null default now(),
  unique(response_id, observation_log_id)
);

create table if not exists public.evaluation_core_values (
  id uuid primary key default gen_random_uuid(),
  evaluation_id uuid not null references public.evaluations(id) on delete cascade,
  core_value_id uuid not null references public.core_values(id),
  score numeric(2,1) not null check(score between 1 and 5),
  comment text,
  unique(evaluation_id, core_value_id)
);

create table if not exists public.growth_plans (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id),
  source_assignment_id uuid references public.evaluation_assignments(id),
  competency text not null,
  current_state text,
  expected_state text,
  actions text not null,
  leader_support text,
  due_date date,
  checkpoint_date date,
  status text not null default 'planned' check(status in ('planned','in_progress','checkpoint','completed','on_hold')),
  created_by uuid references public.employees(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.growth_plan_checkpoints (
  id uuid primary key default gen_random_uuid(),
  growth_plan_id uuid not null references public.growth_plans(id) on delete cascade,
  checkpoint_date date not null,
  progress_note text not null,
  progress_percent int check(progress_percent between 0 and 100),
  created_by uuid references public.employees(id),
  created_at timestamptz not null default now()
);

create table if not exists public.calibration_logs (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.evaluation_assignments(id),
  response_id uuid references public.evaluation_responses(id),
  old_score numeric(2,1),
  new_score numeric(2,1),
  changed_by uuid not null references public.employees(id),
  reason text not null,
  anomaly_rule text,
  created_at timestamptz not null default now()
);

create table if not exists public.evaluation_history (
  id bigserial primary key,
  assignment_id uuid not null references public.evaluation_assignments(id),
  entity_type text not null,
  entity_id uuid,
  action text not null,
  before_data jsonb,
  after_data jsonb,
  changed_by uuid references public.employees(id),
  changed_at timestamptz not null default now()
);

create table if not exists public.leadership_red_flags (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id),
  period_id uuid references public.evaluation_periods(id),
  category text not null,
  severity text not null check(severity in ('low','medium','high')),
  description text not null,
  status text not null default 'open' check(status in ('open','reviewing','closed')),
  created_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date date,
  end_date date,
  is_active boolean not null default true
);

create table if not exists public.employee_projects (
  employee_id uuid not null references public.employees(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  role_name text,
  primary key(employee_id, project_id)
);

create table if not exists public.audit_logs (
  id bigserial primary key,
  actor_user_id uuid references auth.users(id),
  action text not null,
  resource_type text not null,
  resource_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_employees_department on public.employees(department_id);
create index if not exists idx_employees_job_level on public.employees(job_level_id);
create index if not exists idx_assignments_period on public.evaluation_assignments(period_id);
create index if not exists idx_assignments_first_eval on public.evaluation_assignments(first_evaluator_id);
create index if not exists idx_assignments_second_eval on public.evaluation_assignments(second_evaluator_id);
create index if not exists idx_evaluations_assignment on public.evaluations(assignment_id);
create index if not exists idx_responses_evaluation on public.evaluation_responses(evaluation_id);
create index if not exists idx_observation_subject_date on public.observation_logs(subject_employee_id, observed_date desc);
create index if not exists idx_history_assignment on public.evaluation_history(assignment_id, changed_at desc);
create index if not exists idx_growth_employee on public.growth_plans(employee_id, status);

create or replace function public.current_employee_id() returns uuid language sql stable security definer set search_path=public as $$
  select id from public.employees where user_id = auth.uid() limit 1
$$;

create or replace function public.has_role(role_code text) returns boolean language sql stable security definer set search_path=public as $$
  select exists(
    select 1 from public.employee_role_assignments era
    join public.roles r on r.id=era.role_id
    join public.employees e on e.id=era.employee_id
    where e.user_id=auth.uid() and r.code=role_code and (era.valid_to is null or era.valid_to>=current_date)
  )
$$;

alter table public.profiles enable row level security;
alter table public.employees enable row level security;
alter table public.employee_role_assignments enable row level security;
alter table public.evaluation_assignments enable row level security;
alter table public.self_evaluations enable row level security;
alter table public.evaluations enable row level security;
alter table public.evaluation_responses enable row level security;
alter table public.observation_logs enable row level security;
alter table public.growth_plans enable row level security;
alter table public.calibration_logs enable row level security;
alter table public.audit_logs enable row level security;

create policy "profiles_self_or_admin" on public.profiles for select using (id=auth.uid() or public.has_role('hr_admin') or public.has_role('super_admin'));
create policy "employees_self_eval_scope_admin" on public.employees for select using (
  user_id=auth.uid() or public.has_role('hr_admin') or public.has_role('super_admin') or
  exists(select 1 from public.evaluation_assignments a where a.employee_id=employees.id and (a.first_evaluator_id=public.current_employee_id() or a.second_evaluator_id=public.current_employee_id()))
);
create policy "assignments_scope" on public.evaluation_assignments for select using (
  employee_id=public.current_employee_id() or first_evaluator_id=public.current_employee_id() or second_evaluator_id=public.current_employee_id() or public.has_role('hr_admin') or public.has_role('super_admin')
);
create policy "self_eval_owner" on public.self_evaluations for all using (
  exists(select 1 from public.evaluation_assignments a where a.id=self_evaluations.assignment_id and (a.employee_id=public.current_employee_id() or public.has_role('hr_admin') or public.has_role('super_admin')))
) with check (
  exists(select 1 from public.evaluation_assignments a where a.id=self_evaluations.assignment_id and (a.employee_id=public.current_employee_id() or public.has_role('hr_admin') or public.has_role('super_admin')))
);
create policy "evaluations_scope" on public.evaluations for select using (
  evaluator_id=public.current_employee_id() or public.has_role('hr_admin') or public.has_role('super_admin') or
  exists(select 1 from public.evaluation_assignments a where a.id=evaluations.assignment_id and (a.employee_id=public.current_employee_id() or a.first_evaluator_id=public.current_employee_id() or a.second_evaluator_id=public.current_employee_id()))
);
create policy "observations_observer_admin" on public.observation_logs for all using (observer_id=public.current_employee_id() or public.has_role('hr_admin') or public.has_role('super_admin')) with check (observer_id=public.current_employee_id() or public.has_role('hr_admin') or public.has_role('super_admin'));
create policy "growth_plan_scope" on public.growth_plans for select using (employee_id=public.current_employee_id() or created_by=public.current_employee_id() or public.has_role('hr_admin') or public.has_role('super_admin'));
create policy "calibration_admin_only" on public.calibration_logs for all using (public.has_role('hr_admin') or public.has_role('super_admin')) with check (public.has_role('hr_admin') or public.has_role('super_admin'));
create policy "audit_admin_read" on public.audit_logs for select using (public.has_role('hr_admin') or public.has_role('super_admin'));
