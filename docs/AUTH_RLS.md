# STEP 4 Authentication / Authorization Architecture

## 인증

- Supabase Auth email/password 사용
- Browser: `lib/supabase/client.ts`
- Server: `lib/supabase/server.ts`
- Service Role: `lib/supabase/admin.ts` (Demo setup 등 서버 전용)
- `middleware.ts`에서 세션 갱신 및 페이지 접근을 1차 통제
- Supabase PostgreSQL RLS에서 실제 데이터 접근을 최종 통제

## Role

- employee
- first_evaluator
- second_evaluator
- leader
- hr_admin
- super_admin

한 명의 직원이 여러 Role을 동시에 가질 수 있다. 메뉴 접근은 보유 Role의 합집합으로 판단한다.

## 데이터 범위

### 직원
- 본인 직원정보
- 본인 평가배정
- 본인 자기평가
- 공개된 본인 최종결과
- 본인 성장계획
- `subject_visible` 관찰일지

### 1차 평가자
- 자신에게 배정된 대상자
- 자신에게 배정된 평가
- 해당 평가의 문항/응답/Evidence

### 2차 평가자
- 자신의 Review 대상 평가
- 1차 평가 및 Evidence
- Review item 등록/수정

### 리더
- `employee_role_assignments.scope_department_id`로 허용된 부서 범위
- 해당 부서 직원/평가/결과/성장계획

### HR 관리자 / 최고관리자
- 전체 HR 운영 데이터
- Master Data 쓰기
- Calibration / Red Flag / Audit 접근

## 방어 계층

1. Sidebar: 권한 없는 메뉴 미표시
2. Middleware: URL 직접 접근 차단
3. RLS: Browser에서 Supabase를 직접 호출해도 권한 범위 밖의 Row 차단
4. Service Role: 서버 전용. Client Component import 금지

## Demo 계정

`/demo-setup`에서 서버의 Service Role을 이용해 개발용 Auth 계정을 생성한다.

공통 비밀번호: `Amcompany!2026`

- employee@amcompany.demo → AM001
- first@amcompany.demo → AM004
- second@amcompany.demo → AM033
- leader@amcompany.demo → AM008
- hr@amcompany.demo → AM032
- admin@amcompany.demo → AM038

실제 운영 전 Demo 계정을 삭제하고 `DEMO_SETUP_ENABLED=false`, `NEXT_PUBLIC_DEMO_MODE=false`로 변경한다.
