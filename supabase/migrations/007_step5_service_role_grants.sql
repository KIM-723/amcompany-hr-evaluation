-- AMCOMPANY HR Evaluation System
-- STEP 5 hotfix: service_role grants for FORCE_DEMO_LOGIN development mode
-- No data is deleted.

begin;

-- Supabase Secret Key / legacy Service Role Key maps to the service_role
-- Postgres role. BYPASSRLS does not replace table-level SQL privileges.
grant usage on schema public to service_role;

grant select, insert, update, delete
on table
  public.employees,
  public.departments,
  public.job_levels,
  public.positions,
  public.audit_logs
to service_role;

-- Keep sequence access available for any serial/identity columns used now or later.
grant usage, select on all sequences in schema public to service_role;

-- STEP 5 uses helper/trigger functions from public.
grant execute on function public.set_updated_at() to service_role;
grant execute on function public.prevent_department_cycle() to service_role;
grant execute on function public.audit_hr_master_change() to service_role;

commit;
