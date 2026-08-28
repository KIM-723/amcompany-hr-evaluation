-- Validation only. Does not delete any employee.

select
  to_regprocedure('public.delete_employee_completely(uuid)') is not null as single_delete_function,
  to_regprocedure('public.delete_employees_completely(uuid[])') is not null as bulk_delete_function,
  to_regprocedure('public.sync_employee_resignation_status(uuid,boolean,date)') is not null as resignation_sync_function;

select
  has_function_privilege('service_role','public.delete_employee_completely(uuid)','EXECUTE') as single_delete_execute,
  has_function_privilege('service_role','public.delete_employees_completely(uuid[])','EXECUTE') as bulk_delete_execute;

select
  table_name,
  max(case when column_name='subject_is_resigned' then 1 else 0 end) as has_resigned_flag,
  max(case when column_name='subject_resignation_date' then 1 else 0 end) as has_resignation_date
from information_schema.columns
where table_schema='public'
  and table_name in (
    'evaluation_assignments','evaluation_snapshots','self_evaluations','evaluations',
    'evaluation_responses','evaluation_comments','evaluation_evidence_links',
    'evaluation_core_values','evaluation_review_items','evaluation_category_scores',
    'evaluation_results','observation_logs','growth_plans','growth_plan_checkpoints',
    'calibration_logs','evaluation_history','leadership_red_flags'
  )
group by table_name
order by table_name;

select
  count(*) filter (where employment_status='resigned') as resigned_employees,
  count(*) filter (where employment_status='resigned' and resignation_date is null) as legacy_resigned_without_date
from public.employees;
