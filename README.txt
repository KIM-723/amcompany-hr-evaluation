AMCOMPANY demo-setup route hotfix

1. GitHub 저장소의 루트 middleware.ts를 이 파일로 교체합니다.
2. Commit changes 합니다.
3. Vercel 새 배포가 Ready가 된 뒤 /demo-setup 접속을 확인합니다.

이 패치는 /login, /demo-setup, /env-check, /forbidden 경로를 Middleware matcher에서 완전히 제외합니다.
