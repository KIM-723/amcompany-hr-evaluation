-- AMCOMPANY HR Evaluation System
-- First evaluator membership rule:
-- leader's department = target employee's department.
--
-- The chosen leader is excluded from their own evaluation target set.

begin;

create or replace function public.validate_assignment_evaluator_roles()
returns trigger
language plpgsql
set search_path=public
as $$
declare
  v_target_department uuid;
  v_first_department uuid;
  v_first_valid boolean;
  v_second_valid boolean;
begin
  if new.first_evaluator_id is not null then
    if new.employee_id = new.first_evaluator_id then
      raise exception '1차 평가자는 본인을 평가대상으로 지정할 수 없습니다.';
    end if;

    select e.department_id
      into v_target_department
      from public.employees e
     where e.id=new.employee_id;

    select
      e.department_id,
      (
        e.is_leader
        or coalesce(p.evaluation_role='leader',false)
      )
      into v_first_department,v_first_valid
      from public.employees e
      left join public.positions p on p.id=e.position_id
     where e.id=new.first_evaluator_id
       and e.employment_status<>'resigned';

    if not coalesce(v_first_valid,false) then
      raise exception '1차 평가자는 리더만 지정할 수 있습니다.';
    end if;

    if v_target_department is null or v_first_department is null then
      raise exception '평가대상자 또는 1차 평가자의 부서가 지정되어 있지 않습니다.';
    end if;

    if v_target_department is distinct from v_first_department then
      raise exception '1차 평가자는 평가대상자와 같은 부서의 리더여야 합니다.';
    end if;
  end if;

  if new.second_evaluator_id is not null then
    select coalesce(p.evaluation_role='executive',false)
      into v_second_valid
      from public.employees e
      left join public.positions p on p.id=e.position_id
     where e.id=new.second_evaluator_id
       and e.employment_status<>'resigned';

    if not coalesce(v_second_valid,false) then
      raise exception '2차 평가자는 임원 직책만 지정할 수 있습니다.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_assignment_evaluator_roles
  on public.evaluation_assignments;

create trigger trg_validate_assignment_evaluator_roles
before insert or update of employee_id,first_evaluator_id,second_evaluator_id
on public.evaluation_assignments
for each row
execute function public.validate_assignment_evaluator_roles();

commit;
