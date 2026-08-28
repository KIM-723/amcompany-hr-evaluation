-- AMCOMPANY HR Evaluation System
-- Evaluation hierarchy:
-- 1) regular member -> same department leader -> executive
-- 2) leader -> parent/division organization division_head -> executive

begin;

-- Replace old role check with one that includes division_head.
alter table public.positions
  drop constraint if exists chk_positions_evaluation_role;

alter table public.positions
  add constraint chk_positions_evaluation_role
  check (evaluation_role in ('none','leader','division_head','executive'));

-- Conservative automatic classification.
update public.positions
   set evaluation_role='division_head'
 where evaluation_role='none'
   and (
     name ilike '%본부장%'
     or lower(trim(code)) in ('division_head','head')
   );

create or replace function public.is_descendant_department(
  p_parent_department_id uuid,
  p_child_department_id uuid
)
returns boolean
language sql
stable
set search_path=public
as $$
  with recursive descendants as (
    select d.id,d.parent_id
    from public.departments d
    where d.parent_id=p_parent_department_id

    union all

    select d.id,d.parent_id
    from public.departments d
    join descendants x on d.parent_id=x.id
  )
  select exists(
    select 1
    from descendants
    where id=p_child_department_id
  );
$$;

create or replace function public.validate_assignment_evaluator_roles()
returns trigger
language plpgsql
set search_path=public
as $$
declare
  v_target_department uuid;
  v_target_is_leader boolean;
  v_first_department uuid;
  v_first_role text;
  v_first_is_leader boolean;
  v_second_role text;
begin
  select
    e.department_id,
    (
      e.is_leader
      or coalesce(p.evaluation_role='leader',false)
    )
    into v_target_department,v_target_is_leader
    from public.employees e
    left join public.positions p on p.id=e.position_id
   where e.id=new.employee_id;

  if new.first_evaluator_id is not null then
    if new.employee_id=new.first_evaluator_id then
      raise exception '1차 평가자는 본인을 평가할 수 없습니다.';
    end if;

    select
      e.department_id,
      coalesce(p.evaluation_role,'none'),
      e.is_leader
      into v_first_department,v_first_role,v_first_is_leader
      from public.employees e
      left join public.positions p on p.id=e.position_id
     where e.id=new.first_evaluator_id
       and e.employment_status<>'resigned';

    if v_target_department is null or v_first_department is null then
      raise exception '평가대상자 또는 1차 평가자의 부서가 지정되어 있지 않습니다.';
    end if;

    if coalesce(v_target_is_leader,false) then
      -- Leader target -> division head must evaluate.
      if v_first_role<>'division_head' then
        raise exception '리더의 1차 평가자는 본부장이어야 합니다.';
      end if;

      if not public.is_descendant_department(v_first_department,v_target_department) then
        raise exception '평가대상 리더는 선택한 본부장의 산하 조직에 속해야 합니다.';
      end if;
    else
      -- General member -> same department leader.
      if not (coalesce(v_first_is_leader,false) or v_first_role='leader') then
        raise exception '일반 구성원의 1차 평가자는 리더여야 합니다.';
      end if;

      if v_first_department is distinct from v_target_department then
        raise exception '일반 구성원의 1차 평가자는 같은 부서의 리더여야 합니다.';
      end if;
    end if;
  end if;

  if new.second_evaluator_id is not null then
    select coalesce(p.evaluation_role,'none')
      into v_second_role
      from public.employees e
      left join public.positions p on p.id=e.position_id
     where e.id=new.second_evaluator_id
       and e.employment_status<>'resigned';

    if v_second_role<>'executive' then
      raise exception '2차 평가자는 임원이어야 합니다.';
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

grant execute on function public.is_descendant_department(uuid,uuid)
  to authenticated,service_role;

commit;
