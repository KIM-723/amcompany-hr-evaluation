# FORCE_DEMO_LOGIN 개발용 우회 모드

로그인/데모계정 설정 문제 때문에 개발이 중단되는 것을 막기 위한 임시 모드입니다.

## Vercel 환경변수

```text
FORCE_DEMO_LOGIN=true
```

Type은 Config로 설정합니다.

## 동작

- `/`
- `/login`
- `/demo-setup`

접속 시 자동으로 `/dashboard`로 이동합니다.

`getCurrentUserContext()`는 임시 HR 관리자 컨텍스트를 반환하므로 Sidebar의 HR 관리자 메뉴가 표시됩니다.

## 중요

이 모드는 **화면/UI 개발을 계속 진행하기 위한 임시 우회**입니다.

Supabase Auth 세션을 생성하는 방식이 아니기 때문에 RLS가 필요한 실제 DB 쓰기 기능은 별도로 인증 정상화가 필요할 수 있습니다.

실제 운영 전에는 반드시:

```text
FORCE_DEMO_LOGIN=false
```

또는 환경변수를 삭제하고 정상 Supabase Auth 방식으로 복귀해야 합니다.
