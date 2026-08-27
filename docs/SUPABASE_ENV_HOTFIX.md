# Supabase 환경변수 호환 패치

이 패치는 Supabase의 현재 Publishable/Secret Key 체계와 기존 anon/service_role 체계를 모두 지원합니다.

## 권장 Vercel 환경변수

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`
- `NEXT_PUBLIC_DEMO_MODE=true`
- `DEMO_SETUP_ENABLED=true`
- `DEMO_SETUP_SECRET`

기존 키를 사용 중이라면 아래 이름도 계속 지원합니다.

- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## 점검 페이지

배포 후 `/env-check`에 접속하면 실제 값 노출 없이 각 환경변수 연결 여부를 확인할 수 있습니다.
