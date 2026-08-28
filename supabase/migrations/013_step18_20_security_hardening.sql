-- AMCOMPANY HR Evaluation System
-- STEP 18~20: final security/deployment hardening

begin;

-- Important tables must have RLS enabled.
alter table public.profiles enable row level security;
alter table public.employees enable row level security;
alter table public.employee_role_assignments enable row level security;
alter table public.evaluation_periods enable row level security;
alter table public.evaluation_assignments enable row level security;
alter table public.evaluation_snapshots enable row level security;
alter table public.self_evaluations enable row level security;
alter table public.evaluations enable row level security;
alter table public.evaluation_responses enable row level security;
alter table public.observation_logs enable row level security;
alter table public.evaluation_evidence_links enable row level security;
alter table public.evaluation_review_items enable row level security;
alter table public.evaluation_results enable row level security;
alter table public.growth_plans enable row level security;
alter table public.growth_plan_checkpoints enable row level security;
alter table public.calibration_logs enable row level security;
alter table public.audit_logs enable row level security;

-- High-frequency indexes
create index if not exists idx_responses_score on public.evaluation_responses(score);
create index if not exists idx_evaluations_stage_status on public.evaluations(stage,status);
create index if not exists idx_results_scores on public.evaluation_results(performance_score,competency_score);
create index if not exists idx_growth_due_status on public.growth_plans(status,due_date);
create index if not exists idx_calibration_created on public.calibration_logs(created_at desc);

-- Security health function for HR administrators.
create or replace function public.security_health_check()
returns table(check_name text,status text,detail text)
language plpgsql
security definer
set search_path=public,pg_catalog
as $$
declare
  v_missing integer;
begin
  if auth.role() <> 'service_role' and not public.is_hr_admin() then
    raise exception '보안 점검 권한이 없습니다.';
  end if;

  return query
  select
    'RLS - 핵심 평가테이블'::text,
    case when bool_and(c.relrowsecurity) then 'PASS' else 'FAIL' end,
    'employees / assignments / evaluations / responses / results / observations'::text
  from pg_class c
  join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public'
    and c.relname in ('employees','evaluation_assignments','evaluations','evaluation_responses','evaluation_results','observation_logs');

  select count(*)
    into v_missing
  from (
    values
      ('current_employee_id'),
      ('has_role'),
      ('finalize_assignment_result'),
      ('apply_calibration_score'),
      ('get_nine_block_rows')
  ) x(fn)
  where not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname=x.fn
  );

  return query select
    '핵심 Security Function'::text,
    case when v_missing=0 then 'PASS' else 'FAIL' end,
    case when v_missing=0 then '필수 함수 존재' else '누락 함수 '||v_missing::text||'개' end;

  return query
  select
    'Audit Log'::text,
    case when exists(select 1 from information_schema.tables where table_schema='public' and table_name='audit_logs') then 'PASS' else 'FAIL' end,
    'HR 변경 감사로그 테이블 확인'::text;

  return query
  select
    'Service Role 직접 공개 여부'::text,
    'WARN'::text,
    'DB에서는 Vercel 환경변수 노출 여부를 확인할 수 없습니다. SUPABASE_SECRET_KEY에 NEXT_PUBLIC_ 접두사를 사용하지 마세요.'::text;
end;
$$;

revoke all on function public.security_health_check() from public;
grant execute on function public.security_health_check() to authenticated,service_role;

-- Public/anon should not receive explicit CRUD grants on sensitive tables.
revoke all on table
  public.employees,
  public.employee_role_assignments,
  public.evaluation_assignments,
  public.evaluation_snapshots,
  public.self_evaluations,
  public.evaluations,
  public.evaluation_responses,
  public.evaluation_comments,
  public.observation_logs,
  public.evaluation_evidence_links,
  public.evaluation_review_items,
  public.evaluation_results,
  public.growth_plans,
  public.growth_plan_checkpoints,
  public.calibration_logs,
  public.evaluation_history,
  public.audit_logs
from anon;

commit;
