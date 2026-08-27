# Login runtime env hotfix

## 원인
`/env-check`는 서버 런타임에서 환경변수를 읽어 연결됨으로 표시했지만, 로그인 Client Component가 브라우저 번들 안에서 환경변수를 다시 읽으면서 Vercel 환경에 따라 값이 비어 있는 상태가 발생했다.

## 수정
- `/login/page.tsx`가 서버에서 Supabase public URL/key를 읽는다.
- 공개 가능한 URL + Publishable/Anon key만 `LoginForm` props로 전달한다.
- Client Component는 전달받은 값으로 `createBrowserClient()`를 생성한다.
- 로그인 실패 시 Supabase 원본 오류 메시지를 화면에 표시해 다음 진단이 가능하도록 했다.

## 보안
Supabase URL 및 Publishable/Anon key는 브라우저 공개를 전제로 하는 값이다. Secret key/service role key는 절대 Client Component로 전달하지 않는다.
