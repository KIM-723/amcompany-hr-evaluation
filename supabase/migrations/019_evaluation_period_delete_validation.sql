-- Validation only. Does NOT delete any evaluation period.

select
  to_regprocedure('public.delete_evaluation_period_completely(uuid)') is not null
    as period_delete_function,
  has_function_privilege(
    'service_role',
    'public.delete_evaluation_period_completely(uuid)',
    'EXECUTE'
  ) as service_role_execute;

select
  tc.table_name,
  kcu.column_name,
  rc.delete_rule
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on tc.constraint_name = kcu.constraint_name
 and tc.constraint_schema = kcu.constraint_schema
join information_schema.referential_constraints rc
  on tc.constraint_name = rc.constraint_name
 and tc.constraint_schema = rc.constraint_schema
where tc.constraint_type = 'FOREIGN KEY'
  and tc.table_schema = 'public'
  and tc.table_name in (
    'evaluation_assignments',
    'evaluation_period_template_rules',
    'nine_block_settings',
    'observation_logs',
    'leadership_red_flags'
  )
order by tc.table_name, kcu.column_name;
