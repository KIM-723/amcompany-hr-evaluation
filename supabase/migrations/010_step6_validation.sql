-- STEP 6 validation

select
  column_name,
  data_type,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'evaluation_periods'
  and column_name in (
    'description',
    'copied_from_id',
    'activated_at',
    'closed_at',
    'created_by',
    'updated_by'
  )
order by column_name;

select
  has_table_privilege('service_role', 'public.evaluation_periods', 'SELECT') as periods_select,
  has_table_privilege('service_role', 'public.evaluation_periods', 'INSERT') as periods_insert,
  has_table_privilege('service_role', 'public.evaluation_periods', 'UPDATE') as periods_update,
  has_table_privilege('service_role', 'public.evaluation_assignments', 'SELECT') as assignments_select,
  has_table_privilege('service_role', 'public.evaluation_assignments', 'INSERT') as assignments_insert,
  has_table_privilege('service_role', 'public.evaluation_snapshots', 'SELECT') as snapshots_select,
  has_table_privilege('service_role', 'public.evaluation_templates', 'SELECT') as templates_select;

select
  has_function_privilege(
    'service_role',
    'public.create_assignment_snapshot(uuid,uuid)',
    'EXECUTE'
  ) as snapshot_execute,
  has_function_privilege(
    'service_role',
    'public.activate_evaluation_period(uuid,uuid)',
    'EXECUTE'
  ) as activate_execute,
  has_function_privilege(
    'service_role',
    'public.close_evaluation_period(uuid,uuid)',
    'EXECUTE'
  ) as close_execute;

select
  status,
  count(*) as period_count
from public.evaluation_periods
group by status
order by status;
