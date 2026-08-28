# AMCOMPANY 인사진단 웹시스템

Next.js + TypeScript + Tailwind CSS + Supabase 기반 AMCOMPANY 인사진단 시스템입니다.

현재 개발단계: **STEP 4 · 로그인 및 권한관리**

## 현재 구현

- 전체 IA / Role별 Flow / Route 구조
- Supabase PostgreSQL Schema / Snapshot / History
- 38명 개발용 Sample Data
- Supabase Auth 로그인/로그아웃/세션 유지
- Role별 Sidebar
- Middleware URL 접근통제
- PostgreSQL RLS 권한통제
- 리더 조직 Scope
- 개발용 Demo Auth 계정 생성/삭제

## 환경변수

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_DEMO_MODE=true
DEMO_SETUP_ENABLED=true
DEMO_SETUP_SECRET=change-this-to-a-long-random-secret
```

Service Role Key와 Demo Setup Secret은 GitHub에 입력하지 말고 Vercel Environment Variables에만 저장합니다.

## Migration 적용 순서

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_step2_schema_hardening.sql`
3. `supabase/seed/002_step3_sample_data.sql`
4. `supabase/migrations/003_step4_auth_rls.sql`
5. `supabase/migrations/004_step4_validation.sql` (검증용)

## Demo Auth 계정 만들기

Vercel 환경변수 설정 후 `/demo-setup` 접속 → `DEMO_SETUP_SECRET` 입력 → Demo 계정 생성.

공통 비밀번호는 개발환경에서 `Amcompany!2026`입니다.

테스트 종료 후 `/demo-setup`에서 계정을 삭제하고:

- `DEMO_SETUP_ENABLED=false`
- `NEXT_PUBLIC_DEMO_MODE=false`

로 변경합니다.

상세 권한 구조: `docs/AUTH_RLS.md`


## STEP 5 — 직원 및 조직관리

직원 목록/검색/필터/등록/수정/재직상태 변경과 부서 조직 Tree, 직급/직책 Master CRUD를 Supabase 실제 DB에 연결했습니다. 적용 SQL은 `supabase/migrations/005_step5_employee_org_management.sql`이며 검증 SQL은 `006_step5_validation.sql`입니다. 상세 적용 순서는 `docs/STEP_05_APPLY.md`를 참고하세요.
