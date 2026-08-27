# Demo Setup Route Hotfix

`/demo-setup`이 로그인 화면으로 리다이렉트되는 문제를 방지하기 위해 공개 경로를 단순 조건 분기가 아니라 Next.js Middleware matcher에서 완전히 제외합니다.

제외 경로:
- /login
- /demo-setup
- /env-check
- /forbidden
- /api/*
- Next.js 정적 자산
