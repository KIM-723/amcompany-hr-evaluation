-- AMCOMPANY AI 인사진단 개인 대시보드용 결과 테이블
-- 기존 employees / evaluation_periods 테이블 구조에 맞게 FK는 필요 시 조정하세요.

create table if not exists public.ai_diagnosis_results (
  id uuid primary key default gen_random_uuid(),

  employee_id uuid not null,
  period_id uuid null,
  period_name text null,

  -- AI 종합 산출물
  overall_summary text null,
  strength_top3 jsonb not null default '[]'::jsonb,
  growth_top3 jsonb not null default '[]'::jsonb,
  final_growth_direction text null,

  -- 성장/신뢰/전문성/감각 상세 결과
  -- JSON 구조 예시는 README 참고
  values_json jsonb not null default '{}'::jsonb,

  -- 상태: ai_generated / manager_reviewed / finalized
  status text not null default 'ai_generated',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ai_diagnosis_results_employee_id
  on public.ai_diagnosis_results(employee_id);

create index if not exists idx_ai_diagnosis_results_period_id
  on public.ai_diagnosis_results(period_id);

-- updated_at 자동 갱신
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_ai_diagnosis_results_updated_at
  on public.ai_diagnosis_results;

create trigger trg_ai_diagnosis_results_updated_at
before update on public.ai_diagnosis_results
for each row
execute function public.set_updated_at();

-- RLS 활성화
alter table public.ai_diagnosis_results enable row level security;

-- 중요:
-- 이 패키지의 API Route는 service role/secret key를 서버에서 사용하므로
-- 브라우저에 해당 키를 절대 노출하지 않습니다.
-- 실제 사용자별 조회 권한은 현재 프로젝트의 auth/role 구조에 맞춰 별도로 정책을 추가하세요.
