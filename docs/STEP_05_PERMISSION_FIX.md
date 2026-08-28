# STEP 5 Permission Fix

## 증상

직원관리 화면에서:

```text
permission denied for table employees
```

가 나타나고 직원 수가 0명으로 표시됨.

## 원인

현재 `FORCE_DEMO_LOGIN=true`에서는 서버의 Supabase Secret/Service Role 키로
직원관리 CRUD를 실행합니다.

`service_role`은 RLS를 우회할 수 있지만, Postgres의 테이블-level GRANT까지
자동으로 보장되는 것은 아닙니다. 프로젝트의 기본 권한 설정에 따라
`employees` 등에 SQL privilege가 없으면 `permission denied`가 발생합니다.

## 해결

`007_step5_service_role_grants.sql`을 실행하여 STEP 5에서 필요한 HR 마스터
테이블에만 service_role 권한을 부여합니다.

그 다음 `008_step5_permission_validation.sql`을 실행하여 모든 값이 true인지
확인합니다.

운영 전에는 `FORCE_DEMO_LOGIN`을 제거하고 실제 Supabase Auth + RLS 경로로
복귀합니다.
