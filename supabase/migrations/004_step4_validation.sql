-- STEP 4 structural validation (safe, read-only)

select 'rls_tables' as check_name, count(*)::text as value
from pg_class c
join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public'
  and c.relkind='r'
  and c.relrowsecurity=true
  and c.relname = any(array[
    'profiles','employees','employee_role_assignments','evaluation_assignments','self_evaluations','evaluations',
    'evaluation_responses','observation_logs','growth_plans','calibration_logs','audit_logs','evaluation_results'
  ])
union all
select 'policies', count(*)::text
from pg_policies
where schemaname='public'
union all
select 'auth_helpers', count(*)::text
from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
  and p.proname = any(array['current_employee_id','current_role_codes','has_role','is_hr_admin','can_access_department','can_view_assignment','can_review_assignment']);

select tablename, count(*) as policy_count
from pg_policies
where schemaname='public'
group by tablename
order by tablename;
