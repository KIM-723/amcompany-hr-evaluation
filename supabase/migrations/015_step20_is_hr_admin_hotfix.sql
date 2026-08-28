-- AMCOMPANY HR Evaluation System
-- Hotfix: missing is_hr_admin() helper

begin;

create or replace function public.is_hr_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(public.has_role('hr_admin'), false)
    or coalesce(public.has_role('super_admin'), false)
$$;

revoke all on function public.is_hr_admin() from public;
grant execute on function public.is_hr_admin() to authenticated, service_role;

commit;

-- validation
select
  to_regprocedure('public.is_hr_admin()') is not null as is_hr_admin_exists,
  has_function_privilege('service_role', 'public.is_hr_admin()', 'EXECUTE') as service_role_execute;
