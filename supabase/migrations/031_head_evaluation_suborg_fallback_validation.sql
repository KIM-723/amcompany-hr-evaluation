-- Validation only.

select
  to_regprocedure('public.has_descendant_departments(uuid)') is not null
    as has_descendant_function,
  to_regprocedure('public.is_descendant_department(uuid,uuid)') is not null
    as descendant_department_function,
  to_regprocedure('public.validate_assignment_evaluator_roles()') is not null
    as evaluator_validation_function;

select
  d.name as department_name,
  public.has_descendant_departments(d.id) as has_suborganizations,
  count(child.id) as direct_child_count
from public.departments d
left join public.departments child
  on child.parent_id = d.id
 and child.is_active = true
where d.is_active = true
group by d.id, d.name
order by d.name;

select
  e.employee_no,
  e.name,
  d.name as department_name,
  p.name as position_name,
  p.evaluation_role
from public.employees e
left join public.departments d on d.id = e.department_id
left join public.positions p on p.id = e.position_id
where e.employment_status <> 'resigned'
  and (
    p.evaluation_role = 'leader'
    or p.name ilike '%부서장%'
    or p.name ilike '%리더%'
  )
order by d.name, e.employee_no;
