-- AMCOMPANY HR Evaluation System
-- Live employee roster + evaluator terminology normalization
-- Internal role codes are preserved for backward compatibility:
--   leader        = 부서장
--   division_head = 본부장
--   executive     = legacy; migrated to division_head

begin;

-- ---------------------------------------------------------------------------
-- 0. Backward-compatible prerequisites.
-- ---------------------------------------------------------------------------

-- Ensure the evaluator role column/constraint exists even if an earlier role migration was skipped.
alter table public.positions
  add column if not exists evaluation_role text not null default 'none';

alter table public.positions
  drop constraint if exists chk_positions_evaluation_role;

alter table public.positions
  add constraint chk_positions_evaluation_role
  check (evaluation_role in ('none','leader','division_head','executive'));

create or replace function public.is_descendant_department(
  p_parent_department_id uuid,
  p_child_department_id uuid
)
returns boolean
language sql
stable
set search_path = public
as $$
  with recursive descendants as (
    select d.id, d.parent_id
      from public.departments d
     where d.parent_id = p_parent_department_id

    union all

    select d.id, d.parent_id
      from public.departments d
      join descendants x on d.parent_id = x.id
  )
  select exists(
    select 1
      from descendants
     where id = p_child_department_id
  );
$$;

-- ---------------------------------------------------------------------------
-- 1. Normalize old evaluator-role setup to the new business terminology.
-- ---------------------------------------------------------------------------
update public.positions
   set evaluation_role = 'division_head',
       updated_at = now()
 where evaluation_role = 'executive';

-- Exact/current position names can self-heal the evaluator role.
update public.positions
   set evaluation_role = 'leader',
       updated_at = now()
 where is_active = true
   and name ilike '%부서장%'
   and evaluation_role <> 'leader';

update public.positions
   set evaluation_role = 'division_head',
       updated_at = now()
 where is_active = true
   and name ilike '%본부장%'
   and evaluation_role <> 'division_head';

-- Preserve old employees.is_leader compatibility while position-based setup is used.
update public.employees e
   set is_leader = true,
       updated_at = now()
  from public.positions p
 where e.position_id = p.id
   and p.evaluation_role = 'leader'
   and e.is_leader = false;

-- ---------------------------------------------------------------------------
-- 2. Evaluator validation using the new terminology.
-- General member -> same department 부서장 -> 본부장
-- 부서장 -> parent organization 본부장 -> 본부장(2차)
-- ---------------------------------------------------------------------------
create or replace function public.validate_assignment_evaluator_roles()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_target_department uuid;
  v_target_is_department_head boolean;
  v_first_department uuid;
  v_first_role text;
  v_first_is_department_head boolean;
  v_second_role text;
begin
  select
    e.department_id,
    coalesce(p.evaluation_role = 'leader', false)
    into v_target_department, v_target_is_department_head
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
      coalesce(p.evaluation_role = 'leader', false)
      into v_first_department, v_first_role, v_first_is_department_head
      from public.employees e
      left join public.positions p on p.id = e.position_id
     where e.id = new.first_evaluator_id
       and e.employment_status <> 'resigned';

    if v_target_department is null or v_first_department is null then
      raise exception '평가대상자 또는 1차 평가자의 부서가 지정되어 있지 않습니다.';
    end if;

    if coalesce(v_target_is_department_head, false) then
      if v_first_role <> 'division_head' then
        raise exception '부서장의 1차 평가자는 본부장이어야 합니다.';
      end if;

      if not public.is_descendant_department(v_first_department, v_target_department) then
        raise exception '평가대상 부서장은 선택한 본부장의 산하 조직에 속해야 합니다.';
      end if;
    else
      if not coalesce(v_first_is_department_head, false) then
        raise exception '일반 구성원의 1차 평가자는 부서장이어야 합니다.';
      end if;

      if v_first_department is distinct from v_target_department then
        raise exception '일반 구성원의 1차 평가자는 같은 부서의 부서장이어야 합니다.';
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
