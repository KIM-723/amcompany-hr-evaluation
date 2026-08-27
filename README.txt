AMCOMPANY 개발용 강제 HR 로그인 패치

1. 이 ZIP을 압축 해제합니다.
2. GitHub 저장소 루트에서 Add file -> Upload files.
3. middleware.ts, app, lib, docs를 업로드합니다.
4. Commit changes.
5. Vercel Environment Variables에 FORCE_DEMO_LOGIN=true를 추가합니다.
   - Type: Config
   - Environment: Production, Preview
6. Vercel에서 Redeploy 합니다.
7. 사이트 주소로 접속하면 /dashboard로 강제 진입합니다.

주의:
이 패치는 개발을 계속하기 위한 임시 우회입니다.
실제 운영 전에는 FORCE_DEMO_LOGIN을 제거하고 Supabase Auth/RLS를 정상화해야 합니다.
