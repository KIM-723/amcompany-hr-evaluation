-- STEP 3 sample-data validation queries
-- Run after 002_step3_sample_data.sql.

select 'employees' as item, count(*)::text as value
from public.employees where employee_no between 'AM001' and 'AM038'
union all
select 'departments', count(*)::text from public.departments where is_active=true
union all
select 'questions', count(*)::text
from public.evaluation_questions q join public.evaluation_templates t on t.id=q.template_id
where t.code='AM_BASE' and t.version=1
union all
select 'assignments', count(*)::text
from public.evaluation_assignments a join public.evaluation_periods p on p.id=a.period_id
where p.code='2026-H2'
union all
select 'observations', count(*)::text
from public.observation_logs o join public.evaluation_periods p on p.id=o.period_id
where p.code='2026-H2'
union all
select 'growth_plans', count(*)::text
from public.growth_plans gp join public.evaluation_assignments a on a.id=gp.source_assignment_id
join public.evaluation_periods p on p.id=a.period_id where p.code='2026-H2'
union all
select 'calibration_logs', count(*)::text
from public.calibration_logs c join public.evaluation_assignments a on a.id=c.assignment_id
join public.evaluation_periods p on p.id=a.period_id where p.code='2026-H2'
union all
select 'final_results', count(*)::text
from public.evaluation_results r join public.evaluation_assignments a on a.id=r.assignment_id
join public.evaluation_periods p on p.id=a.period_id where p.code='2026-H2';

-- Expected: 38 sample employees and 37 evaluation assignments.
select a.status, a.current_stage, count(*)
from public.evaluation_assignments a
join public.evaluation_periods p on p.id=a.period_id and p.code='2026-H2'
group by a.status,a.current_stage
order by min(a.assigned_at),a.status;

-- Evaluator relationship sample.
select target.employee_no,
       target.name as employee_name,
       d.name as department,
       first_eval.name as first_evaluator,
       second_eval.name as second_evaluator,
       a.status
from public.evaluation_assignments a
join public.evaluation_periods ep on ep.id=a.period_id and ep.code='2026-H2'
join public.employees target on target.id=a.employee_id
left join public.departments d on d.id=target.department_id
left join public.employees first_eval on first_eval.id=a.first_evaluator_id
left join public.employees second_eval on second_eval.id=a.second_evaluator_id
order by target.employee_no;

-- Final results / 9-block source scores.
select e.employee_no,e.name,r.performance_score,r.competency_score,r.total_score,r.core_value_scores
from public.evaluation_results r
join public.evaluation_assignments a on a.id=r.assignment_id
join public.employees e on e.id=a.employee_id
order by e.employee_no;
