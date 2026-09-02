-- AMCOMPANY
-- AI 핵심가치 Alignment 분석
-- 성장 / 신뢰 / 전문성 / 감각
--
-- 중요:
-- 이 데이터는 육성·피드백 보조자료이며 자동 인사결정용이 아님.

begin;

create table if not exists public.core_value_ai_analyses (
  id uuid primary key default gen_random_uuid(),

  diagnosis_id uuid not null
    references public.personnel_diagnoses(id) on delete cascade,

  period_id uuid not null
    references public.evaluation_periods(id) on delete cascade,

  employee_id uuid not null
    references public.employees(id) on delete cascade,

  growth_score smallint
    check (growth_score between 0 and 100),
  trust_score smallint
    check (trust_score between 0 and 100),
  professionalism_score smallint
    check (professionalism_score between 0 and 100),
  sense_score smallint
    check (sense_score between 0 and 100),

  overall_alignment_score smallint
    check (overall_alignment_score between 0 and 100),

  core_values jsonb not null default '{}'::jsonb,
  strengths jsonb not null default '[]'::jsonb,
  growth_areas jsonb not null default '[]'::jsonb,
  overall_summary text,
  recommended_actions jsonb not null default '[]'::jsonb,

  analysis_revision integer not null default 1,
  prompt_version text not null,
  model text not null,
  openai_response_id text,

  source_diagnosis_updated_at timestamptz not null,

  analyzed_by uuid
    references public.employees(id) on delete set null,
  analyzed_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint uq_core_value_ai_analysis_diagnosis
    unique (diagnosis_id)
);

create index if not exists idx_core_value_ai_period
  on public.core_value_ai_analyses(period_id, analyzed_at desc);

create index if not exists idx_core_value_ai_employee
  on public.core_value_ai_analyses(employee_id, period_id);

create index if not exists idx_core_value_ai_overall
  on public.core_value_ai_analyses(period_id, overall_alignment_score);

-- 수정 전 AI 결과를 보존해 재분석 이력을 추적한다.
create table if not exists public.core_value_ai_analysis_history (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null,
  diagnosis_id uuid not null,
  analysis_revision integer not null,
  snapshot jsonb not null,
  archived_at timestamptz not null default now()
);

create index if not exists idx_core_value_ai_history_diagnosis
  on public.core_value_ai_analysis_history(diagnosis_id, archived_at desc);

create or replace function public.archive_core_value_ai_analysis()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  insert into public.core_value_ai_analysis_history(
    analysis_id,
    diagnosis_id,
    analysis_revision,
    snapshot
  )
  values(
    old.id,
    old.diagnosis_id,
    old.analysis_revision,
    to_jsonb(old)
  );

  return new;
end;
$$;

drop trigger if exists trg_archive_core_value_ai_analysis
  on public.core_value_ai_analyses;

create trigger trg_archive_core_value_ai_analysis
before update
on public.core_value_ai_analyses
for each row
when (
  old.core_values is distinct from new.core_values
  or old.source_diagnosis_updated_at is distinct from new.source_diagnosis_updated_at
)
execute function public.archive_core_value_ai_analysis();

alter table public.core_value_ai_analyses enable row level security;
alter table public.core_value_ai_analysis_history enable row level security;

drop policy if exists core_value_ai_select
  on public.core_value_ai_analyses;

create policy core_value_ai_select
on public.core_value_ai_analyses
for select
using (
  public.is_hr_admin()
);

drop policy if exists core_value_ai_insert
  on public.core_value_ai_analyses;

create policy core_value_ai_insert
on public.core_value_ai_analyses
for insert
with check (
  public.is_hr_admin()
);

drop policy if exists core_value_ai_update
  on public.core_value_ai_analyses;

create policy core_value_ai_update
on public.core_value_ai_analyses
for update
using (
  public.is_hr_admin()
)
with check (
  public.is_hr_admin()
);

drop policy if exists core_value_ai_delete
  on public.core_value_ai_analyses;

create policy core_value_ai_delete
on public.core_value_ai_analyses
for delete
using (
  public.is_hr_admin()
);

drop policy if exists core_value_ai_history_select
  on public.core_value_ai_analysis_history;

create policy core_value_ai_history_select
on public.core_value_ai_analysis_history
for select
using (
  public.is_hr_admin()
);

drop policy if exists core_value_ai_history_insert
  on public.core_value_ai_analysis_history;

create policy core_value_ai_history_insert
on public.core_value_ai_analysis_history
for insert
with check (
  public.is_hr_admin()
);

grant select, insert, update, delete
on table public.core_value_ai_analyses
to authenticated, service_role;

grant select, insert
on table public.core_value_ai_analysis_history
to authenticated, service_role;

grant execute
on function public.archive_core_value_ai_analysis()
to authenticated, service_role;

comment on table public.core_value_ai_analyses is
  'AMCOMPANY 최종 인사진단 기반 성장/신뢰/전문성/감각 AI Alignment 분석';

comment on column public.core_value_ai_analyses.source_diagnosis_updated_at is
  'AI 분석 당시 personnel_diagnoses.updated_at. 현재 진단 updated_at과 다르면 재분석 필요.';

commit;
