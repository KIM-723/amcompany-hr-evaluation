# Auth Middleware Hotfix

## 수정 목적

Vercel Edge Middleware가 Supabase 환경변수 오류 또는 인증 요청 예외로 인해 500 `MIDDLEWARE_INVOCATION_FAILED`를 발생시키지 않도록 보강합니다.

## 변경 내용

- `/login`, `/demo-setup`, `/forbidden`은 인증 미들웨어 우회
- Supabase URL 형식 검증
- anon key 공백/누락 검증
- `auth.getUser()` 및 Role RPC 오류 처리
- Middleware 전체 try/catch
- Browser/Server Supabase client 생성 시 잘못된 URL 방어

## 환경변수 형식

- `NEXT_PUBLIC_SUPABASE_URL`: `https://<project-ref>.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anon/public key 또는 현재 프로젝트의 publishable key
- `SUPABASE_SERVICE_ROLE_KEY`: 서버 전용 Secret
