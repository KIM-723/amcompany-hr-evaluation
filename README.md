# AMCOMPANY 인사진단 웹시스템

업무 관찰 → 근거 기록 → 평가 → 진단 → 피드백 → 성장계획을 연결하는 AMCOMPANY용 HR Evaluation System입니다.

## Stack
- Next.js + App Router
- TypeScript
- Tailwind CSS
- Supabase PostgreSQL / Auth / RLS
- Vercel

## 주요 메뉴
Dashboard, 인사진단, 관찰일지, 직원관리, 조직관리, 평가기간, 평가문항, Calibration, 9-Block, 성장계획, 통계, 설정

## 로컬 실행
```bash
cp .env.example .env.local
npm install
npm run dev
```

## Supabase
1. Supabase 프로젝트를 생성합니다.
2. `supabase/migrations/001_initial_schema.sql`을 적용합니다.
3. 개발 샘플이 필요하면 `supabase/seed/001_demo_seed.sql`을 적용합니다.
4. Supabase Auth 사용자 생성 후 `employees.user_id`를 연결합니다.

## 환경변수
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_DEMO_MODE=true
```
`SUPABASE_SERVICE_ROLE_KEY`는 서버 전용이며 브라우저 코드에 노출하지 않습니다.

## 평가 데이터 원칙
- 평가 시작 시 직원·조직·평가자·문항 기준을 JSON Snapshot으로 보존
- 평가 변경은 `evaluation_history`에 이력 보존
- 점수 Calibration은 기존/변경 점수, 변경자, 사유 보존
- 관찰일지와 평가응답은 `evaluation_evidence_links`로 연결
- 자기평가는 최종점수와 분리

## GitHub
```bash
git init
git add .
git commit -m "feat: initialize AMCOMPANY HR evaluation system"
git branch -M main
git remote add origin <GITHUB_REPOSITORY_URL>
git push -u origin main
```

## Vercel
GitHub Repository를 Import한 뒤 위 환경변수의 Production 값을 등록합니다. `main` branch push 시 자동 Build/Deploy됩니다.

## 검증
```bash
npm run typecheck
npm run build
```

## STEP 1 — IA & Project Structure

STEP 1의 화면 구조, Role별 Flow, 접근 원칙은 [`docs/IA.md`](docs/IA.md)를 기준으로 한다.

주요 코드 기준:

- `config/navigation.ts`: Sidebar IA와 Role별 메뉴 정의
- `config/ia.ts`: 화면별 URL, 사용자, 목적, 기능, 필요 데이터, Action, 접근권한
- `lib/permissions/route-access.ts`: 향후 STEP 4 Route Guard에 사용할 접근 판단 유틸리티
- `docs/STEP_01_REPORT.md`: STEP 1 완료 보고

현재 단계의 권한 정의는 설계 기준이며 실제 보안 통제는 아니다. 인증, 서버 접근통제, Supabase RLS는 STEP 4에서 구현한다.
