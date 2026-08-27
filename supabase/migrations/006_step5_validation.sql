-- STEP 5 validation: read-only checks
select 'employees' as item, count(*)::text as value from public.employees
union all select 'departments', count(*)::text from public.departments
union all select 'job_levels', count(*)::text from public.job_levels
union all select 'positions', count(*)::text from public.positions
union all select 'employee_rls', case when relrowsecurity then 'enabled' else 'disabled' end from pg_class where oid='public.employees'::regclass
union all select 'department_rls', case when relrowsecurity then 'enabled' else 'disabled' end from pg_class where oid='public.departments'::regclass;

select tablename, policyname, cmd
from pg_policies
where schemaname='public'
  and tablename in ('employees','departments','job_levels','positions')
order by tablename, policyname;

select indexname
from pg_indexes
where schemaname='public'
  and indexname in (
    'idx_employees_position','idx_employees_status','idx_employees_leader',
    'idx_departments_parent_sort','idx_positions_active_sort','idx_job_levels_active_order'
  )
order by indexname;
