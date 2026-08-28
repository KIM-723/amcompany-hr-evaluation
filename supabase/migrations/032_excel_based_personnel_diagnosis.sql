-- AMCOMPANY
-- Excel 기반 인사진단 Workflow
--
-- 일반 구성원
--   Excel 업로드
--   -> 부서장: 1. 진단 요약 + 2. 성장 포인트
--   -> 본부장: 3. 성장 방향
--   -> 완료
--
-- 부서장/기존 리더
--   Excel 업로드
--   -> 본부장: 1. 진단 요약 + 2. 성장 포인트 + 3. 성장 방향
--   -> 완료

begin;

create table if not exists public.personnel_diagnoses (
  id uuid primary key default gen_random_uuid(),

  period_id uuid not null
    references public.evaluation_periods(id) on delete cascade,

  assignment_id uuid not null
    references public.evaluation_assignments(id) on delete cascade,

  employee_id uuid not null
    references public.employees(id) on delete cascade,

  department_head_id uuid
    references public.employees(id) on delete set null,

  headquarters_head_id uuid
    references public.employees(id) on delete set null,

  subject_is_department_head boolean not null default false,

  source_file_name text,
  source_uploaded_by uuid
    references public.employees(id) on delete set null,
  source_uploaded_at timestamptz,
  source_payload jsonb not null default '{}'::jsonb,

  diagnosis_summary jsonb not null default '[]'::jsonb,
  growth_points jsonb not null default '[]'::jsonb,
  growth_directions jsonb not null default '[]'::jsonb,
  other_comment text,

  status text not null default 'imported'
    check (
      status in (
        'imported',
        'department_head_in_progress',
        'department_head_completed',
        'headquarters_head_in_progress',
        'completed'
      )
    ),

  department_head_completed_at timestamptz,
  headquarters_head_completed_at timestamptz,

  created_by uuid
    references public.employees(id) on delete set null,
  updated_by uuid
    references public.employees(id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint uq_personnel_diagnoses_assignment unique (assignment_id),
  constraint uq_personnel_diagnoses_period_employee unique (period_id, employee_id)
);

create index if not exists idx_personnel_diagnoses_period
  on public.personnel_diagnoses(period_id,status);

create index if not exists idx_personnel_diagnoses_employee
  on public.personnel_diagnoses(employee_id,period_id);

create index if not exists idx_personnel_diagnoses_department_head
  on public.personnel_diagnoses(department_head_id,status);

create index if not exists idx_personnel_diagnoses_headquarters_head
  on public.personnel_diagnoses(headquarters_head_id,status);

alter table public.personnel_diagnoses enable row level security;

drop policy if exists personnel_diagnoses_select
  on public.personnel_diagnoses;

create policy personnel_diagnoses_select
on public.personnel_diagnoses
for select
using (
  public.is_hr_admin()
  or employee_id = public.current_employee_id()
  or department_head_id = public.current_employee_id()
  or headquarters_head_id = public.current_employee_id()
);

drop policy if exists personnel_diagnoses_insert
  on public.personnel_diagnoses;

create policy personnel_diagnoses_insert
on public.personnel_diagnoses
for insert
with check (
  public.is_hr_admin()
);

drop policy if exists personnel_diagnoses_update
  on public.personnel_diagnoses;

create policy personnel_diagnoses_update
on public.personnel_diagnoses
for update
using (
  public.is_hr_admin()
  or department_head_id = public.current_employee_id()
  or headquarters_head_id = public.current_employee_id()
)
with check (
  public.is_hr_admin()
  or department_head_id = public.current_employee_id()
  or headquarters_head_id = public.current_employee_id()
);

drop policy if exists personnel_diagnoses_delete
  on public.personnel_diagnoses;

create policy personnel_diagnoses_delete
on public.personnel_diagnoses
for delete
using (
  public.is_hr_admin()
);

grant select,insert,update,delete
on table public.personnel_diagnoses
to authenticated, service_role;

-- FORCE_DEMO_LOGIN / server admin access.
grant usage on schema public to service_role;

comment on table public.personnel_diagnoses is
  'Excel 기반 AMCOMPANY 인사진단: 진단요약/성장포인트/본부장 성장방향';

commit;
