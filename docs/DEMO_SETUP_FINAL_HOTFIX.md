# Demo Setup 최종 라우팅 패치

`/demo-setup`, `/login`, `/env-check`, `/forbidden`, `/api/demo-setup`을 미들웨어 인증/환경변수 검사 전에 즉시 통과시킵니다.

이 패치는 matcher 제외 규칙에 의존하지 않고 middleware 함수 최상단에서 공개 경로를 강제로 허용합니다.
