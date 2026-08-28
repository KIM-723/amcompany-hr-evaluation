-- STEP 5 service_role permission validation

select
  table_name,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee = 'service_role'
  and table_name in (
    'employees',
    'departments',
    'job_levels',
    'positions',
    'audit_logs'
  )
order by table_name, privilege_type;

select
  has_table_privilege('service_role', 'public.employees', 'SELECT') as employees_select,
  has_table_privilege('service_role', 'public.employees', 'INSERT') as employees_insert,
  has_table_privilege('service_role', 'public.employees', 'UPDATE') as employees_update,
  has_table_privilege('service_role', 'public.departments', 'SELECT') as departments_select,
  has_table_privilege('service_role', 'public.job_levels', 'SELECT') as job_levels_select,
  has_table_privilege('service_role', 'public.positions', 'SELECT') as positions_select;
