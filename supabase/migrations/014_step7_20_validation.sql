-- AMCOMPANY STEP 7~20 integrated validation

select 'templates' as item,count(*)::text as value from public.evaluation_templates
union all select 'questions',count(*)::text from public.evaluation_questions
union all select 'observations',count(*)::text from public.observation_logs
union all select 'assignments',count(*)::text from public.evaluation_assignments
union all select 'self_evaluations',count(*)::text from public.self_evaluations
union all select 'first_evaluations',count(*)::text from public.evaluations where stage='first'
union all select 'results',count(*)::text from public.evaluation_results
union all select 'growth_plans',count(*)::text from public.growth_plans
union all select 'calibration_logs',count(*)::text from public.calibration_logs;

select
  has_function_privilege('service_role','public.finalize_assignment_result(uuid,uuid)','EXECUTE') as finalize_execute,
  has_function_privilege('service_role','public.apply_calibration_score(uuid,numeric,text,uuid)','EXECUTE') as calibration_execute,
  has_function_privilege('service_role','public.get_nine_block_rows(uuid,uuid,uuid)','EXECUTE') as nine_block_execute,
  has_function_privilege('service_role','public.security_health_check()','EXECUTE') as security_health_execute;

select
  has_table_privilege('service_role','public.evaluation_questions','SELECT') as questions_select,
  has_table_privilege('service_role','public.observation_logs','INSERT') as observation_insert,
  has_table_privilege('service_role','public.self_evaluations','UPDATE') as self_update,
  has_table_privilege('service_role','public.evaluation_responses','UPDATE') as response_update,
  has_table_privilege('service_role','public.growth_plans','INSERT') as growth_insert,
  has_table_privilege('service_role','public.calibration_logs','INSERT') as calibration_insert;

select * from public.security_health_check();
