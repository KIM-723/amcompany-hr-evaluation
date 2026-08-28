-- Validation only

select
  to_regprocedure('public.is_descendant_department(uuid,uuid)') is not null
    as descendant_department_function,
  to_regprocedure('public.validate_assignment_evaluator_roles()') is not null
    as evaluator_validation_function;

select
  evaluation_role,
  count(*) as position_count
from public.positions
group by evaluation_role
order by evaluation_role;

select
  count(*) filter(where p.evaluation_role='leader' or e.is_leader=true) as leader_candidates,
  count(*) filter(where p.evaluation_role='division_head') as division_head_candidates,
  count(*) filter(where p.evaluation_role='executive') as executive_candidates
from public.employees e
left join public.positions p on p.id=e.position_id
where e.employment_status<>'resigned';

select
  d.name as organization,
  parent.name as parent_organization
from public.departments d
left join public.departments parent on parent.id=d.parent_id
where d.is_active=true
order by coalesce(parent.name,''),d.name;
