# AMCOMPANY 인사진단 웹시스템

Next.js + TypeScript + Tailwind CSS + Supabase + Vercel 기반의 AMCOMPANY 맞춤형 인사진단 시스템입니다.

## 핵심 흐름

업무 관찰 → 근거 기록 → 자기평가 → 1차 평가 → 2차 Review → Calibration → 결과 → 9-Block → 성장계획

## 핵심가치

- 성장
- 신뢰
- 전문성
- 감각

## 기술스택

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase PostgreSQL / Auth / RLS
- Recharts
- xlsx
- GitHub + Vercel

## 환경변수

`.env.example` 참고.

운영환경에서는 반드시 다음을 지킵니다.

- `FORCE_DEMO_LOGIN=false`
- `DEMO_SETUP_ENABLED=false`
- `NEXT_PUBLIC_DEMO_MODE=false`
- `SUPABASE_SECRET_KEY` / `SUPABASE_SERVICE_ROLE_KEY`는 서버 전용
- Secret Key에 `NEXT_PUBLIC_` 접두사 사용 금지

## Migration

기존 STEP 1~6 적용 후 통합 패키지에서는 순서대로 실행:

1. `011_step7_12_core_evaluation.sql`
2. `012_step13_17_analytics_growth_export.sql`
3. `013_step18_20_security_hardening.sql`
4. `014_step7_20_validation.sql`

## 운영 전 필수검증

```bash
npm run lint
npm run typecheck
npm run build
```

그리고 `/settings/security`에서 보안 상태를 확인합니다.

## GitHub → Vercel

GitHub main branch에 Commit하면 Vercel Production 자동 배포가 실행됩니다.

## Excel

`/api/export/evaluations`

현재 사용자 권한 범위 내 데이터를 대상으로 6개 Sheet를 생성합니다.

## 주의

개발 중 `FORCE_DEMO_LOGIN=true`는 정상 Auth를 우회하기 위한 임시모드입니다.
실제 인사데이터를 운영하기 전 반드시 정상 Supabase Auth + RLS로 전환해야 합니다.
