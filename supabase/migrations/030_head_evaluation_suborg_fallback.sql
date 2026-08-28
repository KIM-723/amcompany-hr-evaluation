-- AMCOMPANY HR Evaluation System
-- 본부장 소속조직에 parent_id 기반 산하조직이 없으면
-- 전체 재직 부서장/리더를 평가대상으로 허용하는 fallback.
--
-- 조직구조가 정상 연결된 경우에는 기존대로 해당 본부 산하조직만 허용.

begin;

create or replace function public.has_descendant_departments(
  p_department_id uuid
)
returns boolean
language sql
stable
set search_path = public
as $$
  with recursive descendants as (
    select d.id
      from public.departments d
     where d.parent_id = p_department_id
       and d.is_active = true

    union all

    select d.id
      from public.departments d
      join descendants x on d.parent_id = x.id
     where d.is_active = true
  )
  select exists(select 1 from descendants);
$$;

grant execute on function public.has_descendant_departments(uuid)
  to authenticated, service_role;

create or replace function public.validate_assignment_evaluator_roles()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_target_department uuid;
  v_target_position_name text;
  v_target_is_department_head_or_leader boolean;

  v_first_department uuid;
  v_first_role text;
  v_first_position_name text;
  v_first_is_department_head boolean;

  v_second_role text;
  v_has_suborg boolean;
begin
  select
    e.department_id,
    coalesce(p.name, ''),
    (
      coalesce(p.evaluation_role = 'leader', false)
      or coalesce(p.name ilike '%부서장%', false)
      or coalesce(p.name ilike '%리더%', false)
    )
    into
      v_target_department,
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
      if v_first_role <> 'division_head' then
        raise exception '부서장·리더의 1차 평가자는 본부장이어야 합니다.';
      end if;

      v_has_suborg := public.has_descendant_departments(v_first_department);

      -- 조직 상위관계가 실제로 설정돼 있을 때만 산하조직 소속을 강제한다.
      -- 산하조직이 하나도 없으면 전체 부서장/리더를 허용한다.
      if v_has_suborg
         and not public.is_descendant_department(
           v_first_department,
           v_target_department
         ) then
        raise exception '평가대상 부서장·리더는 선택한 본부장의 산하 조직에 속해야 합니다.';
      end if;
    else
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
