-- Validation only. No employee/evaluation data is deleted.

select
  to_regprocedure('public.validate_assignment_evaluator_roles()') is not null
    as evaluator_validation_function,
  to_regprocedure('public.is_descendant_department(uuid,uuid)') is not null
    as descendant_department_function;

select
  evaluation_role,
  count(*) as position_count
from public.positions
where is_active = true
group by evaluation_role
order by evaluation_role;

select
  count(*) filter (
    where p.evaluation_role = 'leader'
  ) as department_head_candidates,
  count(*) filter (
    where p.evaluation_role in ('division_head', 'executive')
  ) as division_head_candidates
from public.employees e
left join public.positions p on p.id = e.position_id
where e.employment_status <> 'resigned';

select
  d.name as department_name,
  count(*) filter (where e.employment_status <> 'resigned') as current_members,
  count(*) filter (
    where e.employment_status <> 'resigned'
      and p.evaluation_role = 'leader'
  ) as department_heads
from public.departments d
left join public.employees e on e.department_id = d.id
left join public.positions p on p.id = e.position_id
where d.is_active = true
group by d.id, d.name
order by d.name;
