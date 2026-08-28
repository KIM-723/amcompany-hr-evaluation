# STEP 5 - FORCE_DEMO_LOGIN 호환 메모

현재 개발환경에서 `FORCE_DEMO_LOGIN=true`를 사용하면 실제 Supabase Auth session이 없습니다.

따라서 일반 Supabase client를 사용하면 RLS에 의해 직원/조직 CRUD가 차단될 수 있습니다.

STEP 5 패키지는 개발 중에만 다음 방식으로 동작합니다.

- `FORCE_DEMO_LOGIN=true`
  - `SUPABASE_SECRET_KEY` 또는 `SUPABASE_SERVICE_ROLE_KEY`를 사용하는 서버 전용 Admin Client로 직원/조직 CRUD 수행
- 정상 Auth 사용 시
  - 기존 로그인 세션 + RLS 방식 사용

운영 전에는 `FORCE_DEMO_LOGIN`을 제거하고 정상 Auth/RLS 경로로 복귀해야 합니다.
