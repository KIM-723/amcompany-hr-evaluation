# STEP 4 완료 보고

## 구현한 내용

- Supabase Auth email/password 로그인/로그아웃
- 쿠키 기반 세션 유지
- Middleware 세션 갱신
- Role 기반 Sidebar 필터링
- URL 직접 접근 차단 및 403 화면
- 사용자/직원/Role Context 조회
- Supabase RLS 전면 재정비
- 리더 부서 Scope 지원
- 평가대상/1차/2차/HR 권한 범위 분리
- 신규 STEP 2 테이블 RLS 정책 추가
- 개발용 Demo Auth 계정 생성/삭제 화면 및 서버 API

## 변경한 주요 파일

- `app/layout.tsx`
- `app/login/page.tsx`
- `components/layout/Sidebar.tsx`
- `components/layout/Header.tsx`
- `lib/permissions/route-access.ts`
- `.env.example`

## 새로 만든 파일

- `middleware.ts`
- `app/login/LoginForm.tsx`
- `app/forbidden/page.tsx`
- `app/demo-setup/page.tsx`
- `app/demo-setup/DemoSetupClient.tsx`
- `app/api/demo-setup/route.ts`
- `components/auth/LogoutButton.tsx`
- `lib/auth/roles.ts`
- `lib/auth/user-context.ts`
- `types/auth.ts`
- `supabase/migrations/003_step4_auth_rls.sql`
- `supabase/migrations/004_step4_validation.sql`
- `docs/AUTH_RLS.md`

## DB 변경사항

- 인증/권한 Helper Function 추가
- 모든 애플리케이션 테이블 RLS 활성화
- 기존 STEP 1 RLS 정책을 STEP 4 정책 세트로 교체
- 평가/조직/결과/성장계획/민감데이터별 정책 세분화
- STEP 2 Snapshot 함수의 pgcrypto search_path 수정

## 권한/RLS

Frontend 메뉴 숨김만 사용하지 않는다. Middleware와 PostgreSQL RLS에서 동일한 Role/Scope를 재검증한다.

## 제한사항

- 각 업무 화면의 CRUD는 이후 STEP에서 구현한다.
- Demo Setup은 개발환경 편의를 위한 기능이며 실운영에서는 반드시 비활성화한다.
- STEP 19에서 전체 권한 우회 테스트를 다시 수행한다.

## STEP 5 진행 시 주의사항

직원/조직 CRUD는 Service Role로 우회하지 말고 로그인 사용자 + RLS를 기본으로 사용한다. 관리자 전용 서버 작업에서만 Service Role 사용을 검토한다.
