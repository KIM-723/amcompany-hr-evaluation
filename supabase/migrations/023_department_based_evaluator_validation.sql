-- Validation only.

select
  to_regprocedure('public.validate_assignment_evaluator_roles()') is not null
    as department_evaluator_validation_function;

select
  d.name as department_name,
  count(*) filter (
    where e.employment_status='active'
  ) as active_members,
  count(*) filter (
    where e.employment_status='active'
      and (
        e.is_leader=true
        or p.evaluation_role='leader'
      )
  ) as leader_candidates
from public.departments d
left join public.employees e on e.department_id=d.id
left join public.positions p on p.id=e.position_id
where d.is_active=true
group by d.id,d.name
order by d.name;
