insert into public.roles(code,name) values
('employee','직원'),('first_evaluator','1차 평가자'),('second_evaluator','2차 평가자'),('leader','리더'),('hr_admin','HR 관리자'),('super_admin','최고관리자')
on conflict do nothing;

insert into public.core_values(code,name,description,sort_order) values
('growth','성장','배우고 개선하며 더 높은 수준으로 나아간다',1),
('trust','신뢰','약속과 기준을 지키고 투명하게 협업한다',2),
('professionalism','전문성','직무 지식과 판단력으로 높은 완성도를 만든다',3),
('sense','감각','고객과 시장의 변화를 읽고 적절한 선택을 한다',4)
on conflict do nothing;

insert into public.job_levels(name,level_order) values
('주니어',1),('프로',2),('시니어',3),('베테랑',4),('마스터',5)
on conflict do nothing;

insert into public.positions(name,sort_order) values
('구성원',1),('리더',2),('부서장',3),('사업부대표',4)
on conflict do nothing;

insert into public.departments(name,code,sort_order) values
('국내섬유영업','DOM_SALES',1),('해외섬유영업','INT_SALES',2),('니트생산관리','KNIT',3),('우븐생산관리','WOVEN',4),('구매운영관리','PROC_OPS',5),('품질검사물류','QC_LOG',6),('브랜드마케팅','BRAND',7),('R&D','RND',8),('경영지원','MGMT',9),('패션디자인','FASHION',10)
on conflict do nothing;

insert into public.evaluation_periods(name,start_date,end_date,self_start_date,self_end_date,first_start_date,first_end_date,second_start_date,second_end_date,calibration_start_date,calibration_end_date,result_release_date,status)
values('2026 하반기','2026-09-01','2026-10-15','2026-09-01','2026-09-10','2026-09-11','2026-09-22','2026-09-23','2026-09-30','2026-10-01','2026-10-07','2026-10-15','scheduled')
on conflict do nothing;

insert into public.evaluation_templates(name,description,version,is_active)
select 'AMCOMPANY 기본 인사진단','성과·역량·태도&습관·리더십 및 핵심가치 진단',1,true
where not exists(select 1 from public.evaluation_templates where name='AMCOMPANY 기본 인사진단');

with t as (select id from public.evaluation_templates where name='AMCOMPANY 기본 인사진단' limit 1)
insert into public.evaluation_categories(template_id,code,name,weight,sort_order)
select t.id,x.code,x.name,x.weight,x.sort_order from t cross join (values
('performance','성과',0.40,1),('competency','역량',0.35,2),('attitude','태도 & 습관',0.25,3),('leadership','리더십',0.00,4)
) as x(code,name,weight,sort_order)
on conflict do nothing;

-- auth.users는 Supabase Auth에서 생성한 뒤 employees.user_id와 연결한다.
-- 아래 30명은 UI/DB 테스트용 비로그인 샘플 직원이다.
with d as (select array_agg(id order by sort_order) ids from public.departments),
     j as (select array_agg(id order by level_order) ids from public.job_levels),
     p as (select id from public.positions where name='구성원' limit 1)
insert into public.employees(employee_no,name,email,hire_date,department_id,job_level_id,position_id,is_leader)
select 'AM'||lpad(gs::text,3,'0'), '샘플직원'||lpad(gs::text,2,'0'), 'employee'||gs||'@amcompany.demo', date '2021-01-01'+(gs*31), d.ids[((gs-1)%10)+1], j.ids[((gs-1)%5)+1], p.id, false
from generate_series(1,30) gs, d,j,p
on conflict(employee_no) do nothing;
