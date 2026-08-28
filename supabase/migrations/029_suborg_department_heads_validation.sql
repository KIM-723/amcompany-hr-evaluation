-- Validation only

select
  to_regprocedure('public.validate_assignment_evaluator_roles()') is not null
    as evaluator_validation_function,
  to_regprocedure('public.is_descendant_department(uuid,uuid)') is not null
    as descendant_department_function;

select
  p.name as position_name,
  p.evaluation_role,
  count(e.id) filter (where e.employment_status <> 'resigned') as active_employee_count
from public.positions p
left join public.employees e on e.position_id = p.id
where p.is_active = true
  and (
    p.evaluation_role = 'leader'
    or p.name ilike '%부서장%'
    or p.name ilike '%리더%'
  )
group by p.id, p.name, p.evaluation_role
order by p.name;

select
  d.name as organization,
  parent.name as parent_organization,
  count(e.id) filter (
    where e.employment_status <> 'resigned'
      and (
        p.evaluation_role = 'leader'
        or p.name ilike '%부서장%'
        or p.name ilike '%리더%'
      )
  ) as department_head_or_leader_count
from public.departments d
left join public.departments parent on parent.id = d.parent_id
left join public.employees e on e.department_id = d.id
left join public.positions p on p.id = e.position_id
where d.is_active = true
group by d.id, d.name, parent.name
order by coalesce(parent.name, ''), d.name;
