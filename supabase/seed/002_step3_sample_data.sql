-- AMCOMPANY HR Evaluation System
-- STEP 3: Sample data for development/testing
-- Prerequisite: 001_initial_schema.sql + 002_step2_schema_hardening.sql
-- Safe to re-run. Demo users are NOT created in auth.users; that is handled in STEP 4.

begin;

-- -----------------------------------------------------------------------------
-- 1. Master data
-- -----------------------------------------------------------------------------
insert into public.roles(code, name, description, is_system, is_active)
values
  ('employee','직원','본인 평가와 성장계획을 사용하는 기본 역할',true,true),
  ('first_evaluator','1차 평가자','배정된 구성원의 1차 평가를 수행',true,true),
  ('second_evaluator','2차 평가자','1차 평가와 근거를 검토',true,true),
  ('leader','리더','허용된 조직의 구성원과 평가 현황을 확인',true,true),
  ('hr_admin','HR 관리자','평가 운영 및 전체 HR 관리',true,true),
  ('super_admin','최고관리자','시스템 전체 관리',true,true)
on conflict (code) do update
set name = excluded.name,
    description = excluded.description,
    is_active = true;

insert into public.core_values(code, name, description, sort_order, is_active)
values
  ('growth','성장','배우고 개선하며 더 높은 수준으로 나아간다',1,true),
  ('trust','신뢰','약속과 기준을 지키고 투명하게 협업한다',2,true),
  ('professionalism','전문성','직무 지식과 판단력으로 높은 완성도를 만든다',3,true),
  ('sense','감각','고객과 시장의 변화를 읽고 적절한 선택을 한다',4,true)
on conflict (code) do update
set name = excluded.name,
    description = excluded.description,
    sort_order = excluded.sort_order,
    is_active = true,
    updated_at = now();

insert into public.job_levels(name, level_order, description, code, is_active)
values
  ('주니어',1,'기본 업무를 학습하고 정확하게 수행하는 단계','JUNIOR',true),
  ('프로',2,'담당 업무를 독립적으로 완결하는 단계','PRO',true),
  ('시니어',3,'복잡한 문제를 해결하고 주변에 영향을 주는 단계','SENIOR',true),
  ('베테랑',4,'조직 차원의 기준과 개선을 주도하는 단계','VETERAN',true),
  ('마스터',5,'전문영역의 방향과 조직 역량을 끌어올리는 단계','MASTER',true)
on conflict (name) do update
set level_order = excluded.level_order,
    description = excluded.description,
    code = excluded.code,
    is_active = true,
    updated_at = now();

insert into public.positions(name, sort_order, code, description, is_active)
values
  ('구성원',1,'MEMBER','일반 구성원',true),
  ('리더',2,'LEADER','팀 또는 기능 단위 리더',true),
  ('부서장',3,'DEPT_HEAD','부서 책임자',true),
  ('사업부대표',4,'DIVISION_HEAD','사업 또는 조직 단위 최종 책임자',true)
on conflict (name) do update
set sort_order = excluded.sort_order,
    code = excluded.code,
    description = excluded.description,
    is_active = true,
    updated_at = now();

insert into public.departments(name, code, sort_order, description, is_active)
values
  ('국내섬유영업','DOM_SALES',1,'국내 섬유 고객 영업 및 거래관리',true),
  ('해외섬유영업','INT_SALES',2,'해외 섬유 고객 영업 및 수출 업무',true),
  ('니트생산관리','KNIT',3,'니트 생산 일정·품질·외주 관리',true),
  ('우븐생산관리','WOVEN',4,'우븐 생산 일정·품질·외주 관리',true),
  ('구매운영관리','PROC_OPS',5,'원부자재 구매와 운영 데이터 관리',true),
  ('품질검사물류','QC_LOG',6,'품질 검사·입출고·물류 운영',true),
  ('브랜드마케팅','BRAND',7,'브랜드 전략·콘텐츠·마케팅 실행',true),
  ('R&D','RND',8,'소재 연구·개발 및 신제품 제안',true),
  ('경영지원','MGMT',9,'인사·총무·회계·경영관리',true),
  ('패션디자인','FASHION',10,'패션 디자인·상품기획 지원',true)
on conflict (name) do update
set code = excluded.code,
    sort_order = excluded.sort_order,
    description = excluded.description,
    is_active = true,
    updated_at = now();

-- -----------------------------------------------------------------------------
-- 2. Evaluation period / template
-- -----------------------------------------------------------------------------
insert into public.evaluation_periods(
  name, code, start_date, end_date,
  self_start_date, self_end_date,
  first_start_date, first_end_date,
  second_start_date, second_end_date,
  calibration_start_date, calibration_end_date,
  result_release_date, status, settings
)
values(
  '2026 하반기','2026-H2','2026-07-01','2026-12-31',
  '2026-07-01','2026-07-15',
  '2026-07-16','2026-08-15',
  '2026-08-16','2026-09-05',
  '2026-09-06','2026-09-12',
  '2026-09-20','active',
  '{"score_min":1,"score_max":5,"score_3_label":"현재 직급에서 기대되는 수준을 안정적으로 충족","self_score_in_final":false}'::jsonb
)
on conflict (name) do update
set code = excluded.code,
    start_date = excluded.start_date,
    end_date = excluded.end_date,
    self_start_date = excluded.self_start_date,
    self_end_date = excluded.self_end_date,
    first_start_date = excluded.first_start_date,
    first_end_date = excluded.first_end_date,
    second_start_date = excluded.second_start_date,
    second_end_date = excluded.second_end_date,
    calibration_start_date = excluded.calibration_start_date,
    calibration_end_date = excluded.calibration_end_date,
    result_release_date = excluded.result_release_date,
    status = excluded.status,
    settings = excluded.settings,
    updated_at = now();

insert into public.evaluation_templates(name, description, version, is_active, code, effective_from)
select 'AMCOMPANY 기본 인사진단','성과·역량·태도&습관·리더십 및 핵심가치 진단',1,true,'AM_BASE','2026-01-01'
where not exists (
  select 1 from public.evaluation_templates where code='AM_BASE' and version=1
);

update public.evaluation_templates
set name='AMCOMPANY 기본 인사진단',
    description='성과·역량·태도&습관·리더십 및 핵심가치 진단',
    is_active=true,
    effective_from='2026-01-01',
    updated_at=now()
where code='AM_BASE' and version=1;

with t as (
  select id from public.evaluation_templates where code='AM_BASE' and version=1 limit 1
)
insert into public.evaluation_categories(template_id, code, name, weight, sort_order, description, is_required)
select t.id, x.code, x.name, x.weight, x.sort_order, x.description, x.is_required
from t
cross join (values
  ('performance','성과',40.000,1,'무엇을 달성했고 어떤 결과를 만들었는가',true),
  ('competency','역량',35.000,2,'업무를 수행하는 지식·기술·문제해결 방식',true),
  ('attitude','태도 & 습관',25.000,3,'지속적으로 반복되는 책임·협업·성장 행동',true),
  ('leadership','리더십',0.000,4,'리더 역할에서 방향·육성·책임을 만드는 행동',false)
) x(code,name,weight,sort_order,description,is_required)
on conflict (template_id, code) do update
set name=excluded.name,
    weight=excluded.weight,
    sort_order=excluded.sort_order,
    description=excluded.description,
    is_required=excluded.is_required,
    updated_at=now();

-- -----------------------------------------------------------------------------
-- 3. Evaluation questions
-- -----------------------------------------------------------------------------
with t as (
  select id from public.evaluation_templates where code='AM_BASE' and version=1 limit 1
), qdata as (
  select * from (values
    ('PERF_GOAL','performance','목표 및 핵심업무 달성','평가기간의 핵심 목표와 맡은 업무를 기대수준에 맞게 달성했는가?','결과의 크기뿐 아니라 난이도와 담당 범위를 함께 본다.','목표 진척을 정기적으로 점검하고 필요한 조치를 실행한다.','성과관리',34.000,1),
    ('PERF_QUALITY','performance','업무 품질과 완성도','결과물의 정확성·품질·납기 수준이 안정적인가?','재작업과 오류를 줄이고 약속한 기준을 지키는지를 본다.','검수 기준을 활용하고 문제 발생 시 원인을 확인한다.','업무완성도',33.000,2),
    ('PERF_IMPROVE','performance','개선 및 문제해결 성과','문제를 발견하고 더 나은 방식으로 개선해 실제 효과를 만들었는가?','단순 아이디어보다 실행과 결과를 중심으로 본다.','원인을 구조화하고 개선안을 실행한 뒤 결과를 확인한다.','개선성과',33.000,3),
    ('COMP_EXPERT','competency','직무 전문성','담당 업무에 필요한 지식과 기술을 적절히 활용하는가?','직급에 맞는 전문지식·판단력·정확성을 본다.','업무 기준과 데이터를 근거로 판단한다.','직무전문성',34.000,1),
    ('COMP_COLLAB','competency','협업 및 커뮤니케이션','필요한 정보를 적시에 공유하고 상대가 실행할 수 있도록 소통하는가?','일방 전달이 아니라 맥락·기준·기한을 명확히 하는지를 본다.','상대 관점을 확인하고 합의사항을 기록한다.','협업',33.000,2),
    ('COMP_EXEC','competency','실행력 및 우선순위','중요한 업무를 구분하고 끝까지 실행하여 결과로 연결하는가?','속도와 완결성, 이슈 발생 시 대응력을 함께 본다.','우선순위를 정하고 지연 요인을 선제적으로 공유한다.','실행력',33.000,3),
    ('ATT_TRUST','attitude','책임감과 신뢰','약속·기준·기한을 지키고 문제가 생기면 책임 있게 공유하는가?','숨기지 않고 사실을 투명하게 공유하는 습관을 본다.','실수나 지연 가능성을 조기에 알리고 해결에 참여한다.','책임과신뢰',34.000,1),
    ('ATT_GROWTH','attitude','학습과 성장 습관','피드백과 경험을 학습으로 전환하고 실제 업무방식을 개선하는가?','단순 교육 참여보다 행동 변화와 적용을 본다.','피드백을 기록하고 다음 업무에서 다른 행동을 시도한다.','성장습관',33.000,2),
    ('ATT_SENSE','attitude','고객·시장 감각','고객·시장·제품의 변화를 관찰하고 업무 판단에 반영하는가?','직무 특성에 맞는 감각과 관심의 수준을 본다.','현장·고객 반응을 수집하고 선택의 근거로 활용한다.','감각',33.000,3),
    ('LEAD_DIRECTION','leadership','방향 제시와 우선순위','구성원이 무엇에 집중해야 하는지 명확한 방향과 기준을 제시하는가?','리더가 우선순위와 기대결과를 구체화하는지를 본다.','목표·기준·기한·의사결정 범위를 명확히 설명한다.','방향제시',34.000,1),
    ('LEAD_GROW','leadership','피드백과 육성','구성원의 강점과 개선점을 관찰하고 성장으로 연결하는가?','지적 자체가 아니라 구체적 행동 변화까지 돕는지를 본다.','SBI 방식으로 피드백하고 후속 행동을 점검한다.','육성',33.000,2),
    ('LEAD_ACCOUNT','leadership','책임 있는 지적과 원팀','필요한 문제를 회피하지 않으면서 존중을 유지하고 조직의 결과에 책임지는가?','사람 공격이 아니라 기준·행동·결과를 다루는지를 본다.','문제를 직접 다루고 합의된 기준을 본인부터 준수한다.','책임리더십',33.000,3)
  ) v(code,category_code,title,question,description,behavior_examples,competency,weight,sort_order)
)
insert into public.evaluation_questions(
  template_id, category_id, competency, title, question, description, behavior_examples,
  weight, is_required, sort_order, is_active, code, question_type, min_score, max_score
)
select t.id, c.id, q.competency, q.title, q.question, q.description, q.behavior_examples,
       q.weight, true, q.sort_order, true, q.code, 'score', 1.0, 5.0
from t
join qdata q on true
join public.evaluation_categories c on c.template_id=t.id and c.code=q.category_code
where not exists (
  select 1 from public.evaluation_questions existing
  where existing.template_id=t.id and existing.code=q.code
);

with t as (
  select id from public.evaluation_templates where code='AM_BASE' and version=1 limit 1
), qdata as (
  select * from (values
    ('PERF_GOAL','performance','목표 및 핵심업무 달성','평가기간의 핵심 목표와 맡은 업무를 기대수준에 맞게 달성했는가?','성과관리',34.000,1),
    ('PERF_QUALITY','performance','업무 품질과 완성도','결과물의 정확성·품질·납기 수준이 안정적인가?','업무완성도',33.000,2),
    ('PERF_IMPROVE','performance','개선 및 문제해결 성과','문제를 발견하고 더 나은 방식으로 개선해 실제 효과를 만들었는가?','개선성과',33.000,3),
    ('COMP_EXPERT','competency','직무 전문성','담당 업무에 필요한 지식과 기술을 적절히 활용하는가?','직무전문성',34.000,1),
    ('COMP_COLLAB','competency','협업 및 커뮤니케이션','필요한 정보를 적시에 공유하고 상대가 실행할 수 있도록 소통하는가?','협업',33.000,2),
    ('COMP_EXEC','competency','실행력 및 우선순위','중요한 업무를 구분하고 끝까지 실행하여 결과로 연결하는가?','실행력',33.000,3),
    ('ATT_TRUST','attitude','책임감과 신뢰','약속·기준·기한을 지키고 문제가 생기면 책임 있게 공유하는가?','책임과신뢰',34.000,1),
    ('ATT_GROWTH','attitude','학습과 성장 습관','피드백과 경험을 학습으로 전환하고 실제 업무방식을 개선하는가?','성장습관',33.000,2),
    ('ATT_SENSE','attitude','고객·시장 감각','고객·시장·제품의 변화를 관찰하고 업무 판단에 반영하는가?','감각',33.000,3),
    ('LEAD_DIRECTION','leadership','방향 제시와 우선순위','구성원이 무엇에 집중해야 하는지 명확한 방향과 기준을 제시하는가?','방향제시',34.000,1),
    ('LEAD_GROW','leadership','피드백과 육성','구성원의 강점과 개선점을 관찰하고 성장으로 연결하는가?','육성',33.000,2),
    ('LEAD_ACCOUNT','leadership','책임 있는 지적과 원팀','필요한 문제를 회피하지 않으면서 존중을 유지하고 조직의 결과에 책임지는가?','책임리더십',33.000,3)
  ) v(code,category_code,title,question,competency,weight,sort_order)
)
update public.evaluation_questions q
set category_id=c.id,
    competency=d.competency,
    title=d.title,
    question=d.question,
    weight=d.weight,
    sort_order=d.sort_order,
    is_active=true,
    updated_at=now()
from t
join qdata d on true
join public.evaluation_categories c on c.template_id=t.id and c.code=d.category_code
where q.template_id=t.id and q.code=d.code;

-- All questions are associated with all job levels; leadership questions are additionally
-- restricted to leadership positions by evaluation_question_positions.
insert into public.evaluation_question_job_levels(question_id, job_level_id)
select q.id, jl.id
from public.evaluation_questions q
join public.evaluation_templates t on t.id=q.template_id and t.code='AM_BASE' and t.version=1
cross join public.job_levels jl
where jl.is_active=true
on conflict do nothing;

insert into public.evaluation_question_positions(question_id, position_id)
select q.id, p.id
from public.evaluation_questions q
join public.evaluation_templates t on t.id=q.template_id and t.code='AM_BASE' and t.version=1
join public.evaluation_categories c on c.id=q.category_id and c.code='leadership'
cross join public.positions p
where p.name in ('리더','부서장','사업부대표')
on conflict do nothing;

-- Level-specific expected behaviors.
insert into public.evaluation_question_standards(question_id, job_level_id, expected_behavior)
select q.id, jl.id,
  case jl.name
    when '주니어' then '기본 기준과 절차를 이해하고 도움을 받아 해당 행동을 일관되게 수행한다. 문항: ' || q.title
    when '프로' then '담당 범위에서 스스로 판단하고 안정적으로 결과를 만든다. 문항: ' || q.title
    when '시니어' then '복잡한 상황에서도 기준을 적용하고 주변 구성원의 실행 수준까지 높인다. 문항: ' || q.title
    when '베테랑' then '부서 단위의 문제를 구조화하고 재현 가능한 기준·프로세스로 개선한다. 문항: ' || q.title
    when '마스터' then '조직 차원의 방향과 기준을 만들고 전문성을 전파하여 지속적인 성과 구조를 만든다. 문항: ' || q.title
  end
from public.evaluation_questions q
join public.evaluation_templates t on t.id=q.template_id and t.code='AM_BASE' and t.version=1
cross join public.job_levels jl
on conflict (question_id, job_level_id) do update
set expected_behavior=excluded.expected_behavior;

-- Question ↔ AMCOMPANY core value mapping.
with mappings(question_code, value_code) as (
  values
    ('PERF_GOAL','professionalism'),('PERF_GOAL','trust'),
    ('PERF_QUALITY','professionalism'),('PERF_QUALITY','trust'),
    ('PERF_IMPROVE','growth'),('PERF_IMPROVE','professionalism'),
    ('COMP_EXPERT','professionalism'),
    ('COMP_COLLAB','trust'),
    ('COMP_EXEC','professionalism'),('COMP_EXEC','trust'),
    ('ATT_TRUST','trust'),
    ('ATT_GROWTH','growth'),
    ('ATT_SENSE','sense'),
    ('LEAD_DIRECTION','professionalism'),('LEAD_DIRECTION','trust'),
    ('LEAD_GROW','growth'),('LEAD_GROW','trust'),
    ('LEAD_ACCOUNT','trust'),('LEAD_ACCOUNT','professionalism')
)
insert into public.evaluation_question_core_values(question_id, core_value_id)
select q.id, cv.id
from mappings m
join public.evaluation_templates t on t.code='AM_BASE' and t.version=1
join public.evaluation_questions q on q.template_id=t.id and q.code=m.question_code
join public.core_values cv on cv.code=m.value_code
on conflict do nothing;

insert into public.evaluation_period_template_rules(period_id, template_id, priority, is_active)
select p.id, t.id, 100, true
from public.evaluation_periods p
join public.evaluation_templates t on t.code='AM_BASE' and t.version=1
where p.code='2026-H2'
  and not exists (
    select 1 from public.evaluation_period_template_rules r
    where r.period_id=p.id and r.template_id=t.id
      and r.job_level_id is null and r.position_id is null and r.department_id is null
  );

-- -----------------------------------------------------------------------------
-- 4. 38 sample employees (37 evaluation targets + 1 top reviewer/admin)
-- -----------------------------------------------------------------------------
with e(employee_no,name,email,hire_date,dept_code,level_name,position_name,is_leader,employment_type) as (
  values
    ('AM001','김도윤','demo001@amcompany.example','2025-03-10','DOM_SALES','주니어','구성원',false,'regular'),
    ('AM002','이서준','demo002@amcompany.example','2023-09-04','DOM_SALES','프로','구성원',false,'regular'),
    ('AM003','박하린','demo003@amcompany.example','2021-02-15','DOM_SALES','시니어','구성원',false,'regular'),
    ('AM004','최민석','demo004@amcompany.example','2018-06-01','DOM_SALES','베테랑','리더',true,'regular'),
    ('AM005','정유진','demo005@amcompany.example','2025-01-06','INT_SALES','주니어','구성원',false,'regular'),
    ('AM006','한지우','demo006@amcompany.example','2023-05-22','INT_SALES','프로','구성원',false,'regular'),
    ('AM007','윤태경','demo007@amcompany.example','2020-11-02','INT_SALES','시니어','구성원',false,'regular'),
    ('AM008','강서연','demo008@amcompany.example','2017-04-17','INT_SALES','베테랑','리더',true,'regular'),
    ('AM009','오현우','demo009@amcompany.example','2025-04-01','KNIT','주니어','구성원',false,'regular'),
    ('AM010','임채원','demo010@amcompany.example','2022-08-08','KNIT','프로','구성원',false,'regular'),
    ('AM011','송준혁','demo011@amcompany.example','2020-03-16','KNIT','시니어','구성원',false,'regular'),
    ('AM012','류나연','demo012@amcompany.example','2016-09-05','KNIT','베테랑','리더',true,'regular'),
    ('AM013','배지훈','demo013@amcompany.example','2024-06-03','WOVEN','주니어','구성원',false,'regular'),
    ('AM014','문서아','demo014@amcompany.example','2022-01-10','WOVEN','프로','구성원',false,'regular'),
    ('AM015','신동욱','demo015@amcompany.example','2019-07-15','WOVEN','시니어','구성원',false,'regular'),
    ('AM016','장예린','demo016@amcompany.example','2015-02-02','WOVEN','베테랑','리더',true,'regular'),
    ('AM017','권민재','demo017@amcompany.example','2025-02-03','PROC_OPS','주니어','구성원',false,'regular'),
    ('AM018','서가은','demo018@amcompany.example','2022-10-17','PROC_OPS','프로','구성원',false,'regular'),
    ('AM019','홍성민','demo019@amcompany.example','2019-05-13','PROC_OPS','시니어','구성원',false,'regular'),
    ('AM020','노지민','demo020@amcompany.example','2014-08-11','PROC_OPS','베테랑','리더',true,'regular'),
    ('AM021','전우진','demo021@amcompany.example','2024-03-04','QC_LOG','주니어','구성원',false,'regular'),
    ('AM022','백수아','demo022@amcompany.example','2021-11-01','QC_LOG','프로','구성원',false,'regular'),
    ('AM023','남도현','demo023@amcompany.example','2019-01-07','QC_LOG','시니어','구성원',false,'regular'),
    ('AM024','심예나','demo024@amcompany.example','2013-06-10','QC_LOG','마스터','리더',true,'regular'),
    ('AM025','유재현','demo025@amcompany.example','2024-07-01','BRAND','주니어','구성원',false,'regular'),
    ('AM026','고은채','demo026@amcompany.example','2022-04-18','BRAND','프로','구성원',false,'regular'),
    ('AM027','마준호','demo027@amcompany.example','2020-06-22','BRAND','시니어','구성원',false,'regular'),
    ('AM028','차세린','demo028@amcompany.example','2016-01-04','BRAND','베테랑','리더',true,'regular'),
    ('AM029','조승우','demo029@amcompany.example','2023-02-13','RND','프로','구성원',false,'regular'),
    ('AM030','안유나','demo030@amcompany.example','2019-09-09','RND','시니어','구성원',false,'regular'),
    ('AM031','도현석','demo031@amcompany.example','2012-05-14','RND','마스터','리더',true,'regular'),
    ('AM032','김다인','demo032@amcompany.example','2024-01-08','MGMT','프로','구성원',false,'regular'),
    ('AM033','이정훈','demo033@amcompany.example','2019-03-11','MGMT','시니어','구성원',false,'regular'),
    ('AM034','박세아','demo034@amcompany.example','2013-01-07','MGMT','마스터','부서장',true,'regular'),
    ('AM035','최유찬','demo035@amcompany.example','2023-07-03','FASHION','프로','구성원',false,'regular'),
    ('AM036','정소민','demo036@amcompany.example','2019-12-02','FASHION','시니어','구성원',false,'regular'),
    ('AM037','한태윤','demo037@amcompany.example','2014-04-21','FASHION','베테랑','리더',true,'regular'),
    ('AM038','윤지원','demo038@amcompany.example','2010-01-04','MGMT','마스터','사업부대표',true,'regular')
)
insert into public.employees(
  employee_no,name,email,hire_date,employment_status,employment_type,
  department_id,job_level_id,position_id,is_leader
)
select e.employee_no,e.name,e.email,e.hire_date::date,'active',e.employment_type,
       d.id,jl.id,p.id,e.is_leader
from e
join public.departments d on d.code=e.dept_code
join public.job_levels jl on jl.name=e.level_name
join public.positions p on p.name=e.position_name
on conflict (employee_no) do update
set name=excluded.name,
    email=excluded.email,
    hire_date=excluded.hire_date,
    employment_status='active',
    employment_type=excluded.employment_type,
    department_id=excluded.department_id,
    job_level_id=excluded.job_level_id,
    position_id=excluded.position_id,
    is_leader=excluded.is_leader,
    updated_at=now();

-- Leader relationship by department; leaders report to the division head AM038.
with leader_map(dept_code, leader_no) as (
  values
    ('DOM_SALES','AM004'),('INT_SALES','AM008'),('KNIT','AM012'),('WOVEN','AM016'),
    ('PROC_OPS','AM020'),('QC_LOG','AM024'),('BRAND','AM028'),('RND','AM031'),
    ('MGMT','AM034'),('FASHION','AM037')
)
update public.employees e
set leader_id = case
  when e.employee_no='AM038' then null
  when e.is_leader then (select id from public.employees where employee_no='AM038')
  else l.id
end,
updated_at=now()
from public.departments d
join leader_map lm on lm.dept_code=d.code
join public.employees l on l.employee_no=lm.leader_no
where e.department_id=d.id
  and e.employee_no between 'AM001' and 'AM038';

-- -----------------------------------------------------------------------------
-- 5. Role assignments
-- -----------------------------------------------------------------------------
insert into public.employee_role_assignments(employee_id, role_id, valid_from)
select e.id, r.id, '2026-01-01'
from public.employees e
join public.roles r on r.code='employee'
where e.employee_no between 'AM001' and 'AM038'
  and not exists (
    select 1 from public.employee_role_assignments x
    where x.employee_id=e.id and x.role_id=r.id and x.valid_to is null
  );

insert into public.employee_role_assignments(employee_id, role_id, scope_department_id, valid_from)
select e.id, r.id, e.department_id, '2026-01-01'
from public.employees e
join public.roles r on r.code='leader'
where e.employee_no in ('AM004','AM008','AM012','AM016','AM020','AM024','AM028','AM031','AM034','AM037','AM038')
  and not exists (
    select 1 from public.employee_role_assignments x
    where x.employee_id=e.id and x.role_id=r.id
      and x.scope_department_id is not distinct from e.department_id and x.valid_to is null
  );

insert into public.employee_role_assignments(employee_id, role_id, scope_department_id, valid_from)
select e.id, r.id, e.department_id, '2026-01-01'
from public.employees e
join public.roles r on r.code='first_evaluator'
where e.employee_no in ('AM004','AM008','AM012','AM016','AM020','AM024','AM028','AM031','AM034','AM037','AM038')
  and not exists (
    select 1 from public.employee_role_assignments x
    where x.employee_id=e.id and x.role_id=r.id
      and x.scope_department_id is not distinct from e.department_id and x.valid_to is null
  );

insert into public.employee_role_assignments(employee_id, role_id, valid_from)
select e.id, r.id, '2026-01-01'
from public.employees e
join public.roles r on r.code='second_evaluator'
where e.employee_no in ('AM034','AM038')
  and not exists (
    select 1 from public.employee_role_assignments x
    where x.employee_id=e.id and x.role_id=r.id and x.valid_to is null
  );

insert into public.employee_role_assignments(employee_id, role_id, valid_from)
select e.id, r.id, '2026-01-01'
from public.employees e
join public.roles r on r.code='hr_admin'
where e.employee_no='AM034'
  and not exists (
    select 1 from public.employee_role_assignments x
    where x.employee_id=e.id and x.role_id=r.id and x.valid_to is null
  );

insert into public.employee_role_assignments(employee_id, role_id, valid_from)
select e.id, r.id, '2026-01-01'
from public.employees e
join public.roles r on r.code='super_admin'
where e.employee_no='AM038'
  and not exists (
    select 1 from public.employee_role_assignments x
    where x.employee_id=e.id and x.role_id=r.id and x.valid_to is null
  );

-- -----------------------------------------------------------------------------
-- 6. Evaluation assignments: deliberately mixed progress states
-- -----------------------------------------------------------------------------
with ctx as (
  select p.id period_id, t.id template_id,
         (select id from public.employees where employee_no='AM038') top_reviewer_id
  from public.evaluation_periods p
  join public.evaluation_templates t on t.code='AM_BASE' and t.version=1
  where p.code='2026-H2'
), targets as (
  select e.*,
         substring(e.employee_no from 3)::int as n
  from public.employees e
  where substring(e.employee_no from 3)::int between 1 and 37
)
insert into public.evaluation_assignments(
  period_id, employee_id, first_evaluator_id, second_evaluator_id, template_id,
  status, current_stage, employee_snapshot, evaluator_snapshot, template_snapshot, assigned_at
)
select ctx.period_id,
       e.id,
       case when e.is_leader then ctx.top_reviewer_id else e.leader_id end,
       case
         when e.is_leader and e.employee_no='AM034' then ctx.top_reviewer_id
         when e.is_leader then (select id from public.employees where employee_no='AM034')
         else ctx.top_reviewer_id
       end,
       ctx.template_id,
       case
         when e.n between 1 and 4 then 'not_started'
         when e.n between 5 and 8 then 'self_draft'
         when e.n between 9 and 14 then 'self_submitted'
         when e.n between 15 and 20 then 'first_draft'
         when e.n between 21 and 27 then 'first_submitted'
         when e.n between 28 and 33 then 'second_review'
         else 'finalized'
       end,
       case
         when e.n between 1 and 4 then 'not_started'
         when e.n between 5 and 14 then 'self'
         when e.n between 15 and 27 then 'first'
         when e.n between 28 and 33 then 'second'
         else 'final'
       end,
       '{}'::jsonb,'{}'::jsonb,'{}'::jsonb,'2026-07-01 09:00:00+09'::timestamptz
from targets e
cross join ctx
on conflict (period_id, employee_id) do update
set first_evaluator_id=excluded.first_evaluator_id,
    second_evaluator_id=excluded.second_evaluator_id,
    template_id=excluded.template_id,
    status=excluded.status,
    current_stage=excluded.current_stage,
    updated_at=now();

-- Create immutable snapshots once. Re-runs do not overwrite snapshots.
do $$
declare
  r record;
begin
  for r in
    select a.id
    from public.evaluation_assignments a
    join public.evaluation_periods p on p.id=a.period_id and p.code='2026-H2'
    left join public.evaluation_snapshots s on s.assignment_id=a.id
    where s.id is null
  loop
    perform public.create_assignment_snapshot(r.id, null);
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- 7. Self evaluations
-- -----------------------------------------------------------------------------
with targets as (
  select a.id assignment_id, e.employee_no, e.name, substring(e.employee_no from 3)::int n
  from public.evaluation_assignments a
  join public.evaluation_periods p on p.id=a.period_id and p.code='2026-H2'
  join public.employees e on e.id=a.employee_id
  where substring(e.employee_no from 3)::int between 5 and 37
)
insert into public.self_evaluations(
  assignment_id, achievements, growth_area, gaps, next_improvement, support_needed,
  performance_score, competency_score, core_value_scores, status, submitted_at
)
select t.assignment_id,
       '핵심업무의 우선순위를 정리하고 담당 업무를 계획에 맞춰 진행했습니다. ' || t.name || '의 개발용 자기평가 예시입니다.',
       '업무 과정에서 피드백을 기록하고 반복되는 문제의 원인을 확인하는 습관이 좋아졌습니다.',
       case when mod(t.n,3)=0 then '협업 시 상대가 필요한 맥락까지 충분히 설명하는 부분이 부족했습니다.' else '복잡한 업무에서 사전 리스크 점검을 더 체계화할 필요가 있습니다.' end,
       '다음 기간에는 핵심업무별 완료 기준과 점검 주기를 명확히 하고 개선 결과를 수치로 확인하겠습니다.',
       case when mod(t.n,2)=0 then '리더와 월 1회 우선순위 및 성장 피드백 점검이 필요합니다.' else '직무 사례 공유와 데이터 접근 지원이 필요합니다.' end,
       round((2.8 + mod(t.n,15) * 0.10)::numeric,2),
       round((2.7 + mod(t.n+4,16) * 0.10)::numeric,2),
       jsonb_build_object(
         'growth', round((2.8 + mod(t.n,14)*0.10)::numeric,1),
         'trust', round((2.9 + mod(t.n+2,13)*0.10)::numeric,1),
         'professionalism', round((2.7 + mod(t.n+5,15)*0.10)::numeric,1),
         'sense', round((2.6 + mod(t.n+7,16)*0.10)::numeric,1)
       ),
       case when t.n between 5 and 8 then 'draft' else 'submitted' end,
       case when t.n between 5 and 8 then null else ('2026-07-' || lpad((5 + mod(t.n,9))::text,2,'0') || ' 18:00:00+09')::timestamptz end
from targets t
on conflict (assignment_id) do update
set achievements=excluded.achievements,
    growth_area=excluded.growth_area,
    gaps=excluded.gaps,
    next_improvement=excluded.next_improvement,
    support_needed=excluded.support_needed,
    performance_score=excluded.performance_score,
    competency_score=excluded.competency_score,
    core_value_scores=excluded.core_value_scores,
    status=excluded.status,
    submitted_at=excluded.submitted_at,
    updated_at=now();

-- -----------------------------------------------------------------------------
-- 8. First evaluations / responses
-- -----------------------------------------------------------------------------
with targets as (
  select a.*, e.employee_no, substring(e.employee_no from 3)::int n
  from public.evaluation_assignments a
  join public.evaluation_periods p on p.id=a.period_id and p.code='2026-H2'
  join public.employees e on e.id=a.employee_id
  where substring(e.employee_no from 3)::int between 15 and 37
)
insert into public.evaluations(
  assignment_id, evaluator_id, stage, status,
  strengths, improvements, next_expectations, total_score, submitted_at, approved_at
)
select t.id, t.first_evaluator_id, 'first',
       case when t.n between 15 and 20 then 'draft'
            when t.n between 21 and 33 then 'submitted'
            else 'approved' end,
       '맡은 업무를 끝까지 추적하고 필요한 정보를 빠르게 정리하는 점이 강점입니다.',
       case when mod(t.n,2)=0 then '업무 근거를 수치와 사례로 더 명확하게 남길 필요가 있습니다.' else '협업 상대에게 목적과 완료 기준을 더 선명하게 전달할 필요가 있습니다.' end,
       '다음 기간에는 한 단계 높은 난도의 과제를 맡되 진행과정의 근거를 정기적으로 기록하기를 기대합니다.',
       null,
       case when t.n between 15 and 20 then null else '2026-08-10 18:00:00+09'::timestamptz end,
       case when t.n >=34 then '2026-08-20 15:00:00+09'::timestamptz else null end
from targets t
on conflict (assignment_id, evaluator_id, stage) do update
set status=excluded.status,
    strengths=excluded.strengths,
    improvements=excluded.improvements,
    next_expectations=excluded.next_expectations,
    submitted_at=excluded.submitted_at,
    approved_at=excluded.approved_at,
    updated_at=now();

with eval_ctx as (
  select ev.id evaluation_id, ev.evaluator_id, a.employee_id, e.employee_no,
         substring(e.employee_no from 3)::int n, e.position_id, a.template_id
  from public.evaluations ev
  join public.evaluation_assignments a on a.id=ev.assignment_id
  join public.evaluation_periods ep on ep.id=a.period_id and ep.code='2026-H2'
  join public.employees e on e.id=a.employee_id
  where ev.stage='first'
), qs as (
  select q.id question_id, q.code, q.title, q.sort_order, q.category_id, c.code category_code,
         row_number() over(order by c.sort_order, q.sort_order, q.code) seq
  from public.evaluation_questions q
  join public.evaluation_categories c on c.id=q.category_id
  join public.evaluation_templates t on t.id=q.template_id and t.code='AM_BASE' and t.version=1
  where q.is_active=true
)
insert into public.evaluation_responses(
  evaluation_id, question_id, question_snapshot, standard_snapshot,
  score, comment, evidence_required, evidence_note, updated_by
)
select ec.evaluation_id, q.question_id,
       jsonb_build_object('code',q.code,'title',q.title,'category_code',q.category_code),
       coalesce((
         select to_jsonb(s)
         from public.evaluation_question_standards s
         join public.employees se on se.id=ec.employee_id
         where s.question_id=q.question_id and s.job_level_id=se.job_level_id
         limit 1
       ), '{}'::jsonb),
       (1 + mod(ec.n + q.seq::int * 2, 5))::numeric(2,1),
       case (1 + mod(ec.n + q.seq::int * 2, 5))
         when 1 then '기대수준과 차이가 확인되어 구체적인 개선 행동과 점검이 필요합니다.'
         when 2 then '일부 상황에서 기대수준에 미치지 못해 반복적인 보완이 필요합니다.'
         when 3 then '현재 직급에서 기대되는 수준을 안정적으로 충족하고 있습니다.'
         when 4 then '기대수준을 넘어 주변 업무에도 긍정적인 영향을 주고 있습니다.'
         when 5 then '탁월한 수준의 결과와 행동이 반복적으로 관찰되어 근거 사례를 확인했습니다.'
       end,
       (1 + mod(ec.n + q.seq::int * 2, 5)) in (1,5),
       case when (1 + mod(ec.n + q.seq::int * 2, 5)) in (1,5)
            then '극단점수 근거: 실제 업무 상황과 결과를 관찰일지 Evidence로 연결합니다.'
            else null end,
       ec.evaluator_id
from eval_ctx ec
join qs q on true
join public.positions pos on pos.id=ec.position_id
where q.category_code <> 'leadership' or pos.name in ('리더','부서장','사업부대표')
on conflict (evaluation_id, question_id) do update
set question_snapshot=excluded.question_snapshot,
    standard_snapshot=excluded.standard_snapshot,
    score=excluded.score,
    comment=excluded.comment,
    evidence_required=excluded.evidence_required,
    evidence_note=excluded.evidence_note,
    updated_by=excluded.updated_by,
    updated_at=now();

-- First-evaluation core-value scores.
with eval_ctx as (
  select ev.id evaluation_id, substring(e.employee_no from 3)::int n
  from public.evaluations ev
  join public.evaluation_assignments a on a.id=ev.assignment_id
  join public.evaluation_periods ep on ep.id=a.period_id and ep.code='2026-H2'
  join public.employees e on e.id=a.employee_id
  where ev.stage='first'
)
insert into public.evaluation_core_values(evaluation_id, core_value_id, score, comment)
select ec.evaluation_id, cv.id,
       (2.5 + mod(ec.n + cv.sort_order*3, 26)*0.1)::numeric(2,1),
       cv.name || ' 관련 행동 사례를 평가문항과 관찰일지에서 함께 확인했습니다.'
from eval_ctx ec
cross join public.core_values cv
where cv.is_active=true
on conflict (evaluation_id, core_value_id) do update
set score=excluded.score,
    comment=excluded.comment;

-- -----------------------------------------------------------------------------
-- 9. Observation logs / evidence
-- -----------------------------------------------------------------------------
with subjects as (
  select a.id assignment_id, a.period_id, a.first_evaluator_id observer_id,
         e.id employee_id, e.employee_no, substring(e.employee_no from 3)::int n
  from public.evaluation_assignments a
  join public.evaluation_periods p on p.id=a.period_id and p.code='2026-H2'
  join public.employees e on e.id=a.employee_id
  where substring(e.employee_no from 3)::int between 9 and 37
), obs as (
  select s.*, x.kind
  from subjects s cross join (values (1),(2)) x(kind)
)
insert into public.observation_logs(
  observer_id, subject_employee_id, observed_date, work_context, related_work,
  situation, behavior, impact_result, sentiment, core_value_id, question_id, period_id, visibility
)
select o.observer_id, o.employee_id,
       ('2026-07-01'::date + ((o.n*3 + o.kind*5) % 50)),
       case when o.kind=1 then '주간 핵심업무 진행' else '부서 간 협업 및 이슈 대응' end,
       case when o.kind=1 then '담당 업무 일정·품질 점검' else '협업 요청과 문제 해결' end,
       case when o.kind=1 then '마감이 임박한 핵심업무의 진행상황을 점검하는 상황이었습니다.' else '다른 부서와 일정 및 업무기준을 맞춰야 하는 상황이었습니다.' end,
       case
         when o.kind=1 and mod(o.n,4)<>0 then '진행 상태를 항목별로 정리하고 지연 가능성을 사전에 공유했습니다.'
         when o.kind=1 then '문제가 발생한 이후에야 지연 사실을 공유하여 대응 시간이 부족했습니다.'
         when o.kind=2 and mod(o.n,3)<>0 then '상대 부서가 필요한 정보와 완료 기준을 함께 정리해 전달했습니다.'
         else '요청 내용만 전달하고 배경과 우선순위를 충분히 설명하지 않았습니다.'
       end,
       case
         when o.kind=1 and mod(o.n,4)<>0 then '리더가 우선순위를 빠르게 조정할 수 있었고 마감 일정이 유지되었습니다.'
         when o.kind=1 then '추가 확인과 재조정이 발생하여 후속 업무가 지연되었습니다.'
         when o.kind=2 and mod(o.n,3)<>0 then '협업 부서가 별도 재확인 없이 실행할 수 있어 처리시간이 줄었습니다.'
         else '추가 질문과 수정 요청이 발생하여 업무가 한 차례 반복되었습니다.'
       end,
       case when (o.kind=1 and mod(o.n,4)=0) or (o.kind=2 and mod(o.n,3)=0) then 'improvement' else 'positive' end,
       case when o.kind=1 then (select id from public.core_values where code='professionalism')
            else (select id from public.core_values where code='trust') end,
       case when o.kind=1 then (select q.id from public.evaluation_questions q join public.evaluation_templates t on t.id=q.template_id where t.code='AM_BASE' and q.code='PERF_QUALITY' limit 1)
            else (select q.id from public.evaluation_questions q join public.evaluation_templates t on t.id=q.template_id where t.code='AM_BASE' and q.code='COMP_COLLAB' limit 1) end,
       o.period_id,'evaluator_hr'
from obs o
where o.observer_id is not null
  and not exists (
    select 1 from public.observation_logs existing
    where existing.subject_employee_id=o.employee_id
      and existing.observer_id=o.observer_id
      and existing.observed_date=('2026-07-01'::date + ((o.n*3 + o.kind*5) % 50))
      and existing.work_context=case when o.kind=1 then '주간 핵심업무 진행' else '부서 간 협업 및 이슈 대응' end
  );

-- Link matching observations to first-evaluation responses.
insert into public.evaluation_evidence_links(response_id, observation_log_id, linked_by, note)
select r.id, o.id, ev.evaluator_id, 'STEP 3 개발용 Evidence 연결'
from public.evaluation_responses r
join public.evaluations ev on ev.id=r.evaluation_id and ev.stage='first'
join public.evaluation_assignments a on a.id=ev.assignment_id
join public.observation_logs o on o.subject_employee_id=a.employee_id
  and o.period_id=a.period_id
  and o.question_id=r.question_id
where not exists (
  select 1 from public.evaluation_evidence_links x
  where x.response_id=r.id and x.observation_log_id=o.id
);

-- -----------------------------------------------------------------------------
-- 10. Category scores for submitted/approved evaluations
-- -----------------------------------------------------------------------------
insert into public.evaluation_category_scores(
  evaluation_id, category_id, category_code, category_name, raw_score, weighted_score, weight
)
select ev.id, c.id, c.code, c.name,
       round(avg(r.score)::numeric,2),
       round((avg(r.score) * c.weight / 100.0)::numeric,2),
       c.weight
from public.evaluations ev
join public.evaluation_responses r on r.evaluation_id=ev.id
join public.evaluation_questions q on q.id=r.question_id
join public.evaluation_categories c on c.id=q.category_id
where ev.stage='first' and ev.status in ('submitted','approved','finalized')
group by ev.id,c.id,c.code,c.name,c.weight
on conflict (evaluation_id, category_code) do update
set raw_score=excluded.raw_score,
    weighted_score=excluded.weighted_score,
    weight=excluded.weight,
    calculated_at=now();

update public.evaluations ev
set total_score = s.total_score,
    updated_at=now()
from (
  select evaluation_id, round(sum(coalesce(weighted_score,0))::numeric,2) total_score
  from public.evaluation_category_scores
  where category_code <> 'leadership'
  group by evaluation_id
) s
where ev.id=s.evaluation_id;

-- -----------------------------------------------------------------------------
-- 11. Second-review sample decisions
-- -----------------------------------------------------------------------------
with review_targets as (
  select ev.id evaluation_id, a.second_evaluator_id reviewer_id, e.employee_no,
         row_number() over(partition by ev.id order by r.score desc, r.id) rn,
         r.id response_id, r.score
  from public.evaluations ev
  join public.evaluation_assignments a on a.id=ev.assignment_id
  join public.evaluation_periods p on p.id=a.period_id and p.code='2026-H2'
  join public.employees e on e.id=a.employee_id
  join public.evaluation_responses r on r.evaluation_id=ev.id
  where ev.stage='first' and substring(e.employee_no from 3)::int between 28 and 33
)
insert into public.evaluation_review_items(
  evaluation_id,response_id,reviewer_id,decision,reason_code,review_comment,requested_score,resolved_at
)
select rt.evaluation_id, rt.response_id, rt.reviewer_id,
       case
         when substring(rt.employee_no from 3)::int in (29,32) then 'revision_requested'
         when substring(rt.employee_no from 3)::int in (30,33) then 'calibration_required'
         else 'approved'
       end,
       case
         when substring(rt.employee_no from 3)::int in (29,32) then 'evidence_insufficient'
         when substring(rt.employee_no from 3)::int in (30,33) then 'extreme_score'
         else 'evidence_aligned'
       end,
       case
         when substring(rt.employee_no from 3)::int in (29,32) then '점수에 비해 구체적인 관찰사례가 부족하여 근거 보완을 요청합니다.'
         when substring(rt.employee_no from 3)::int in (30,33) then '평가자 평균 대비 편차가 커 Calibration에서 함께 검토합니다.'
         else '근거와 점수의 방향이 일치하여 승인합니다.'
       end,
       case when substring(rt.employee_no from 3)::int in (29,32) then greatest(1,rt.score-1) else null end,
       case when substring(rt.employee_no from 3)::int in (28,31) then '2026-08-23 14:00:00+09'::timestamptz else null end
from review_targets rt
where rt.rn=1
  and not exists (
    select 1 from public.evaluation_review_items x
    where x.evaluation_id=rt.evaluation_id and x.response_id=rt.response_id and x.reviewer_id=rt.reviewer_id
  );

-- -----------------------------------------------------------------------------
-- 12. Finalized evaluations / result snapshots
-- -----------------------------------------------------------------------------
with targets as (
  select a.id assignment_id, a.second_evaluator_id evaluator_id, e.employee_no
  from public.evaluation_assignments a
  join public.evaluation_periods p on p.id=a.period_id and p.code='2026-H2'
  join public.employees e on e.id=a.employee_id
  where substring(e.employee_no from 3)::int between 34 and 37
)
insert into public.evaluations(
  assignment_id,evaluator_id,stage,status,strengths,improvements,next_expectations,total_score,submitted_at,finalized_at
)
select t.assignment_id,
       (select id from public.employees where employee_no='AM038'),
       'final','finalized',
       '성과와 핵심가치 행동을 함께 고려할 때 반복적으로 확인되는 강점이 있습니다.',
       '다음 역할 수준을 준비하기 위해 보완할 역량을 성장계획으로 연결합니다.',
       '다음 평가기간에는 성장계획의 중간점검 결과를 함께 확인합니다.',
       case t.employee_no when 'AM034' then 4.12 when 'AM035' then 3.76 when 'AM036' then 3.29 else 4.46 end,
       '2026-08-25 16:00:00+09'::timestamptz,
       '2026-08-25 16:30:00+09'::timestamptz
from targets t
on conflict (assignment_id, evaluator_id, stage) do update
set status='finalized',
    strengths=excluded.strengths,
    improvements=excluded.improvements,
    next_expectations=excluded.next_expectations,
    total_score=excluded.total_score,
    submitted_at=excluded.submitted_at,
    finalized_at=excluded.finalized_at,
    updated_at=now();

with f as (
  select a.id assignment_id, ev.id final_evaluation_id, e.employee_no
  from public.evaluation_assignments a
  join public.evaluation_periods p on p.id=a.period_id and p.code='2026-H2'
  join public.employees e on e.id=a.employee_id
  join public.evaluations ev on ev.assignment_id=a.id and ev.stage='final'
  where e.employee_no in ('AM034','AM035','AM036','AM037')
)
insert into public.evaluation_results(
  assignment_id,final_evaluation_id,performance_score,competency_score,attitude_score,leadership_score,total_score,
  core_value_scores,strengths,growth_needs,result_snapshot,is_released,released_at,finalized_at
)
select f.assignment_id,f.final_evaluation_id,
       case f.employee_no when 'AM034' then 4.20 when 'AM035' then 3.90 when 'AM036' then 2.60 else 4.50 end,
       case f.employee_no when 'AM034' then 4.10 when 'AM035' then 3.40 when 'AM036' then 4.00 else 4.60 end,
       case f.employee_no when 'AM034' then 4.00 when 'AM035' then 4.10 when 'AM036' then 3.50 else 4.20 end,
       case f.employee_no when 'AM034' then 4.30 when 'AM035' then null when 'AM036' then null else 4.40 end,
       case f.employee_no when 'AM034' then 4.12 when 'AM035' then 3.76 when 'AM036' then 3.29 else 4.46 end,
       case f.employee_no
         when 'AM034' then '{"growth":4.0,"trust":4.4,"professionalism":4.2,"sense":3.9}'::jsonb
         when 'AM035' then '{"growth":4.1,"trust":3.8,"professionalism":3.6,"sense":4.0}'::jsonb
         when 'AM036' then '{"growth":3.9,"trust":3.4,"professionalism":4.1,"sense":3.7}'::jsonb
         else '{"growth":4.5,"trust":4.4,"professionalism":4.7,"sense":4.3}'::jsonb
       end,
       '["업무 완결성","협업 신뢰","학습 적용"]'::jsonb,
       case f.employee_no
         when 'AM036' then '["성과 목표 구체화","우선순위 관리","성과 근거 기록"]'::jsonb
         else '["상위 역할 준비","후배 육성","업무 기준 문서화"]'::jsonb
       end,
       jsonb_build_object('period','2026 하반기','employee_no',f.employee_no,'snapshot_source','STEP3_SAMPLE'),
       true,'2026-08-26 09:00:00+09'::timestamptz,'2026-08-25 16:30:00+09'::timestamptz
from f
on conflict (assignment_id) do update
set final_evaluation_id=excluded.final_evaluation_id,
    performance_score=excluded.performance_score,
    competency_score=excluded.competency_score,
    attitude_score=excluded.attitude_score,
    leadership_score=excluded.leadership_score,
    total_score=excluded.total_score,
    core_value_scores=excluded.core_value_scores,
    strengths=excluded.strengths,
    growth_needs=excluded.growth_needs,
    result_snapshot=excluded.result_snapshot,
    is_released=excluded.is_released,
    released_at=excluded.released_at,
    finalized_at=excluded.finalized_at,
    updated_at=now();

update public.evaluation_assignments a
set finalized_at='2026-08-25 16:30:00+09'::timestamptz,
    status='finalized',current_stage='final',updated_at=now()
from public.employees e, public.evaluation_periods p
where a.employee_id=e.id and a.period_id=p.id and p.code='2026-H2'
  and e.employee_no in ('AM034','AM035','AM036','AM037');

-- -----------------------------------------------------------------------------
-- 13. Growth plans
-- -----------------------------------------------------------------------------
with gp(employee_no,competency,current_state,expected_state,actions,leader_support,due_date,checkpoint_date,status,success_measure) as (
  values
    ('AM021','업무 근거 기록','결과는 있으나 과정 근거가 분산되어 있음','주요 판단과 결과가 하나의 기록으로 연결됨','주간업무마다 판단 근거와 결과 수치를 1건 이상 기록한다.','월 1회 리더가 기록 품질을 피드백한다.','2026-11-30','2026-09-30','in_progress','주간업무 기록 80% 이상에서 근거와 결과 확인'),
    ('AM026','협업 커뮤니케이션','요청 전달은 빠르나 배경 설명이 부족함','목적·기준·기한을 포함해 상대가 바로 실행할 수 있음','협업 요청 시 목적/완료기준/기한 3요소를 반드시 작성한다.','리더가 주요 협업 3건을 샘플 점검한다.','2026-10-31','2026-09-15','checkpoint','재확인 요청 건수 30% 감소'),
    ('AM029','직무 전문성','개별 사례 중심으로 판단함','데이터와 기준을 활용해 일관된 판단을 함','월 2건의 업무사례를 기준·데이터와 함께 정리한다.','관련 직무 선배와 월 1회 사례 리뷰한다.','2026-12-15','2026-10-15','planned','사례 리뷰 6건 완료'),
    ('AM034','후배 육성','필요 시 피드백하나 후속 점검이 일정하지 않음','구성원별 성장과제를 정하고 정기적으로 추적함','월 1회 1:1에서 성장과제 진행상황과 다음 행동을 기록한다.','최고관리자가 분기별 육성 현황을 함께 검토한다.','2026-12-31','2026-10-31','in_progress','팀원별 성장과제 1건 이상 및 2회 이상 점검'),
    ('AM036','성과 목표 구체화','열심히 수행하나 성과 완료 기준이 모호할 때가 있음','업무 시작 전 결과물과 완료 기준을 명확히 정의함','주요 업무 시작 시 기대 결과와 완료 기준을 사전에 기록한다.','리더가 주간회의에서 우선순위와 완료 기준을 확인한다.','2026-11-30','2026-09-30','in_progress','핵심업무 90% 이상 완료기준 사전 정의'),
    ('AM037','업무 기준 문서화','개인 경험에 의존하는 노하우가 많음','팀이 반복 활용할 수 있는 업무 기준으로 전환됨','반복 업무 3개를 체크리스트와 판단기준으로 문서화한다.','월 1회 문서 적용성과를 점검한다.','2026-12-20','2026-10-20','planned','표준업무 3개 문서화 및 팀 적용')
)
insert into public.growth_plans(
  employee_id,source_assignment_id,source_result_id,competency,current_state,expected_state,actions,leader_support,
  due_date,checkpoint_date,status,created_by,success_measure
)
select e.id,a.id,r.id,gp.competency,gp.current_state,gp.expected_state,gp.actions,gp.leader_support,
       gp.due_date::date,gp.checkpoint_date::date,gp.status,e.leader_id,gp.success_measure
from gp
join public.employees e on e.employee_no=gp.employee_no
join public.evaluation_periods p on p.code='2026-H2'
join public.evaluation_assignments a on a.employee_id=e.id and a.period_id=p.id
left join public.evaluation_results r on r.assignment_id=a.id
where not exists (
  select 1 from public.growth_plans existing
  where existing.employee_id=e.id and existing.source_assignment_id=a.id and existing.competency=gp.competency
);

insert into public.growth_plan_checkpoints(growth_plan_id,checkpoint_date,progress_note,progress_percent,created_by)
select gp.id,gp.checkpoint_date,'초기 계획을 확인하고 첫 실행 항목을 시작했습니다.',25,gp.created_by
from public.growth_plans gp
join public.employees e on e.id=gp.employee_id
where e.employee_no in ('AM021','AM026','AM034','AM036')
  and not exists (
    select 1 from public.growth_plan_checkpoints c
    where c.growth_plan_id=gp.id and c.checkpoint_date=gp.checkpoint_date
  );

-- -----------------------------------------------------------------------------
-- 14. Leadership red flags
-- -----------------------------------------------------------------------------
with rf(employee_no,category,severity,description,status) as (
  values
    ('AM004','feedback_style','medium','피드백 시 기준 설명보다 결론이 먼저 전달되는 사례가 반복되어 관찰 필요','reviewing'),
    ('AM012','delegation','low','업무 위임 후 중간 확인 기준이 명확하지 않은 사례가 있어 개선관찰 필요','open'),
    ('AM028','team_trust','medium','업무 우선순위 변경 시 팀원에게 배경 공유가 늦는 사례가 확인됨','reviewing'),
    ('AM037','leadership_consistency','high','구성원별 피드백 강도 차이가 커 평가 일관성 Calibration 검토 필요','open')
)
insert into public.leadership_red_flags(employee_id,period_id,category,severity,description,status)
select e.id,p.id,rf.category,rf.severity,rf.description,rf.status
from rf
join public.employees e on e.employee_no=rf.employee_no
join public.evaluation_periods p on p.code='2026-H2'
where not exists (
  select 1 from public.leadership_red_flags x
  where x.employee_id=e.id and x.period_id=p.id and x.category=rf.category
);

-- -----------------------------------------------------------------------------
-- 15. Calibration anomaly samples (review records; no automatic score change)
-- -----------------------------------------------------------------------------
with candidates as (
  select distinct on (e.employee_no)
         a.id assignment_id, ev.id evaluation_id, r.id response_id, r.score, e.employee_no
  from public.evaluation_assignments a
  join public.evaluation_periods p on p.id=a.period_id and p.code='2026-H2'
  join public.employees e on e.id=a.employee_id and e.employee_no in ('AM028','AM029','AM030','AM031','AM032','AM033')
  join public.evaluations ev on ev.assignment_id=a.id and ev.stage='first'
  join public.evaluation_responses r on r.evaluation_id=ev.id
  where r.score in (1,5)
  order by e.employee_no, abs(r.score-3) desc, r.id
)
insert into public.calibration_logs(
  assignment_id,response_id,evaluation_id,old_score,new_score,changed_by,reason,anomaly_rule
)
select c.assignment_id,c.response_id,c.evaluation_id,c.score,c.score,
       (select id from public.employees where employee_no='AM034'),
       '이상치 검토 대상으로 등록했습니다. 자동 점수 변경은 하지 않았습니다.',
       case when c.score=5 then 'EXTREME_HIGH_WITH_REVIEW' else 'EXTREME_LOW_WITH_REVIEW' end
from candidates c
where not exists (
  select 1 from public.calibration_logs x
  where x.assignment_id=c.assignment_id and x.response_id=c.response_id and x.anomaly_rule in ('EXTREME_HIGH_WITH_REVIEW','EXTREME_LOW_WITH_REVIEW')
);

-- -----------------------------------------------------------------------------
-- 16. 9-Block settings
-- -----------------------------------------------------------------------------
insert into public.nine_block_settings(
  period_id,name,performance_low_max,performance_middle_max,competency_low_max,competency_middle_max,
  block_guidance,is_active,created_by
)
select p.id,'2026 하반기 기본 9-Block 기준',2.70,3.70,2.70,3.70,
  '{
    "high_high":"상위 역할 또는 높은 난도 업무 검토",
    "high_middle":"성과 강점을 유지하며 역량 폭 확장",
    "high_low":"성과 재현을 위한 핵심역량 보완",
    "middle_high":"더 큰 성과 책임을 맡길 기회 검토",
    "middle_middle":"핵심역량 한 가지를 정해 집중 성장",
    "middle_low":"직무 기본기와 수행방식 집중 지원",
    "low_high":"성과목표와 역할 적합성 재점검",
    "low_middle":"우선순위·실행환경·지원요인 진단",
    "low_low":"역할 적합성 및 집중 육성계획 검토"
  }'::jsonb,
  true,(select id from public.employees where employee_no='AM034')
from public.evaluation_periods p
where p.code='2026-H2'
  and not exists (
    select 1 from public.nine_block_settings n where n.period_id=p.id and n.is_active=true
  );

-- -----------------------------------------------------------------------------
-- 17. Projects and employee-project links
-- -----------------------------------------------------------------------------
insert into public.projects(name,start_date,end_date,is_active)
select x.name,x.start_date::date,x.end_date::date,true
from (values
  ('2026 원가·구매 데이터 표준화','2026-07-01','2026-10-31'),
  ('신소재 개발 파일럿','2026-06-15','2026-11-30'),
  ('브랜드 콘텐츠 운영 개선','2026-07-10','2026-09-30')
) x(name,start_date,end_date)
where not exists (select 1 from public.projects p where p.name=x.name);

insert into public.employee_projects(employee_id,project_id,role_name)
select e.id,p.id,x.role_name
from (values
  ('AM018','2026 원가·구매 데이터 표준화','구매 데이터 담당'),
  ('AM019','2026 원가·구매 데이터 표준화','운영 프로세스 담당'),
  ('AM032','2026 원가·구매 데이터 표준화','회계 검증'),
  ('AM029','신소재 개발 파일럿','R&D 담당'),
  ('AM030','신소재 개발 파일럿','테스트 담당'),
  ('AM011','신소재 개발 파일럿','니트 생산 연계'),
  ('AM015','신소재 개발 파일럿','우븐 생산 연계'),
  ('AM025','브랜드 콘텐츠 운영 개선','콘텐츠 기획'),
  ('AM026','브랜드 콘텐츠 운영 개선','운영'),
  ('AM035','브랜드 콘텐츠 운영 개선','디자인 연계')
) x(employee_no,project_name,role_name)
join public.employees e on e.employee_no=x.employee_no
join public.projects p on p.name=x.project_name
on conflict (employee_id,project_id) do update set role_name=excluded.role_name;

commit;
