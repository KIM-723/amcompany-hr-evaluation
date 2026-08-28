-- Validation only

select
  column_name,
  data_type
from information_schema.columns
where table_schema='public'
  and table_name='positions'
  and column_name='evaluation_role';

select
  name,
  code,
  evaluation_role
from public.positions
order by sort_order,name;

select
  to_regprocedure('public.start_or_restart_calibration(uuid,uuid)') is not null
    as start_calibration_function,
  to_regprocedure('public.release_calibration(uuid,uuid)') is not null
    as release_calibration_function,
  has_function_privilege(
    'service_role',
    'public.start_or_restart_calibration(uuid,uuid)',
    'EXECUTE'
  ) as start_calibration_execute,
  has_function_privilege(
    'service_role',
    'public.release_calibration(uuid,uuid)',
    'EXECUTE'
  ) as release_calibration_execute;

select
  count(*) filter (
    where p.evaluation_role='leader' or e.is_leader=true
  ) as first_evaluator_candidates,
  count(*) filter (
    where p.evaluation_role='executive'
  ) as second_evaluator_candidates
from public.employees e
left join public.positions p on p.id=e.position_id
where e.employment_status<>'resigned';

select
  count(*) as active_members_without_leader
from public.employees
where employment_status='active'
  and leader_id is null;
