-- Validation only.

select
  to_regclass('public.core_value_ai_analyses') is not null
    as ai_analysis_table,
  to_regclass('public.core_value_ai_analysis_history') is not null
    as ai_analysis_history_table;

select
  has_table_privilege(
    'service_role',
    'public.core_value_ai_analyses',
    'SELECT,INSERT,UPDATE,DELETE'
  ) as service_role_ai_access,
  has_table_privilege(
    'service_role',
    'public.core_value_ai_analysis_history',
    'SELECT,INSERT'
  ) as service_role_history_access;

select
  column_name,
  data_type
from information_schema.columns
where table_schema='public'
  and table_name='core_value_ai_analyses'
  and column_name in (
    'growth_score',
    'trust_score',
    'professionalism_score',
    'sense_score',
    'overall_alignment_score',
    'core_values',
    'source_diagnosis_updated_at',
    'prompt_version',
    'model',
    'analysis_revision'
  )
order by column_name;

select
  tgname
from pg_trigger
where tgrelid='public.core_value_ai_analyses'::regclass
  and not tgisinternal
order by tgname;
