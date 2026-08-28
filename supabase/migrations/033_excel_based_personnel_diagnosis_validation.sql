-- Validation only.

select
  to_regclass('public.personnel_diagnoses') is not null
    as personnel_diagnoses_table;

select
  column_name,
  data_type
from information_schema.columns
where table_schema='public'
  and table_name='personnel_diagnoses'
  and column_name in (
    'diagnosis_summary',
    'growth_points',
    'growth_directions',
    'subject_is_department_head',
    'department_head_id',
    'headquarters_head_id',
    'status'
  )
order by column_name;

select
  has_table_privilege(
    'service_role',
    'public.personnel_diagnoses',
    'SELECT,INSERT,UPDATE,DELETE'
  ) as service_role_full_access;

select
  polname
from pg_policy
where polrelid='public.personnel_diagnoses'::regclass
order by polname;
