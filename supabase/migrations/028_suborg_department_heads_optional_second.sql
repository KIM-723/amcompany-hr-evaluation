-- AMCOMPANY HR Evaluation System
-- 부서장 평가:
-- - 본부장 소속 조직의 모든 하위조직을 재귀 조회
-- - 직책명이 부서장/리더이거나 evaluation_role=leader 인 사람을 평가대상으로 허용
-- - 2차 평가자는 선택사항
--
-- 일반 구성원:
-- - 같은 부서의 부서장 1차
-- - 본부장 2차 필수

begin;

create or replace function public.validate_assignment_evaluator_roles()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_target_department uuid;
  v_target_role text;
  v_target_position_name text;
  v_target_is_department_head_or_leader boolean;

  v_first_department uuid;
  v_first_role text;
  v_first_position_name text;
  v_first_is_department_head boolean;

  v_second_role text;
begin
  select
    e.department_id,
    case
      when p.evaluation_role = 'executive' then 'division_head'
      else coalesce(p.evaluation_role, 'none')
    end,
    coalesce(p.name, ''),
    (
      coalesce(p.evaluation_role = 'leader', false)
      or coalesce(p.name ilike '%부서장%', false)
      or coalesce(p.name ilike '%리더%', false)
    )
    into
      v_target_department,
      v_target_role,
      v_target_position_name,
      v_target_is_department_head_or_leader
    from public.employees e
    left join public.positions p on p.id = e.position_id
   where e.id = new.employee_id;

  if new.first_evaluator_id is not null then
    if new.employee_id = new.first_evaluator_id then
      raise exception '1차 평가자는 본인을 평가할 수 없습니다.';
    end if;

    select
      e.department_id,
      case
        when p.evaluation_role = 'executive' then 'division_head'
        else coalesce(p.evaluation_role, 'none')
      end,
      coalesce(p.name, ''),
      (
        coalesce(p.evaluation_role = 'leader', false)
        or coalesce(p.name ilike '%부서장%', false)
      )
      into
        v_first_department,
        v_first_role,
        v_first_position_name,
        v_first_is_department_head
      from public.employees e
      left join public.positions p on p.id = e.position_id
     where e.id = new.first_evaluator_id
       and e.employment_status <> 'resigned';

    if v_target_department is null or v_first_department is null then
      raise exception '평가대상자 또는 1차 평가자의 부서가 지정되어 있지 않습니다.';
    end if;

    if coalesce(v_target_is_department_head_or_leader, false) then
      -- 부서장/기존 리더 대상 -> 본부장 1차
      if v_first_role <> 'division_head' then
        raise exception '부서장·리더의 1차 평가자는 본부장이어야 합니다.';
      end if;

      if not public.is_descendant_department(
        v_first_department,
        v_target_department
      ) then
        raise exception '평가대상 부서장·리더는 선택한 본부장의 산하 조직에 속해야 합니다.';
      end if;

      -- 부서장/리더 평가는 second_evaluator_id = null 허용.
    else
      -- 일반 구성원 -> 같은 부서 부서장 1차
      if not coalesce(v_first_is_department_head, false) then
        raise exception '일반 구성원의 1차 평가자는 부서장이어야 합니다.';
      end if;

      if v_first_department is distinct from v_target_department then
        raise exception '일반 구성원의 1차 평가자는 같은 부서의 부서장이어야 합니다.';
      end if;

      if new.second_evaluator_id is null then
        raise exception '일반 구성원 평가는 2차 평가자인 본부장이 필수입니다.';
      end if;
    end if;
  end if;

  if new.second_evaluator_id is not null then
    select
      case
        when p.evaluation_role = 'executive' then 'division_head'
        else coalesce(p.evaluation_role, 'none')
      end
      into v_second_role
      from public.employees e
      left join public.positions p on p.id = e.position_id
     where e.id = new.second_evaluator_id
       and e.employment_status <> 'resigned';

    if v_second_role <> 'division_head' then
      raise exception '2차 평가자는 본부장이어야 합니다.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_assignment_evaluator_roles
  on public.evaluation_assignments;

create trigger trg_validate_assignment_evaluator_roles
before insert or update of employee_id, first_evaluator_id, second_evaluator_id
on public.evaluation_assignments
for each row
execute function public.validate_assignment_evaluator_roles();

commit;
