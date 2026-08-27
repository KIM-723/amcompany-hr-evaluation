# STEP 5 적용 순서

1. STEP 5 update ZIP의 파일을 GitHub 저장소 최상위에 업로드하고 Commit한다.
2. Supabase SQL Editor에서 `005_step5_employee_org_management.sql`을 실행한다.
3. 이어서 `006_step5_validation.sql`을 실행해 RLS/Index를 확인한다.
4. Vercel 최신 Deployment가 Ready인지 확인한다.
5. HR Demo 계정으로 로그인한다.
6. `/employees`, `/organization`, `/organization/job-levels`, `/organization/positions`에서 CRUD를 테스트한다.
7. 일반 직원 계정으로 `/employees`를 직접 입력했을 때 `/forbidden`으로 차단되는지 확인한다.
