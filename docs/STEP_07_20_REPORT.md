# STEP 7~20 통합 구현 보고

## STEP 7 평가문항 관리
Template / 영역 / 문항 / 직급별 기대행동 / 핵심가치 / 가중치 / 활성상태 CRUD.

## STEP 8 관찰일지
SBI 입력, 대상자·평가기간·핵심가치·문항 연결, Filter 및 Evidence 활용.

## STEP 9 자기평가
성과·성장·부족·개선·지원·성과/역량/핵심가치 점수, 임시저장/제출.

## STEP 10 1차 평가
직급별 기대수준, 1~5점, 1/5 근거 필수, 관찰일지 Evidence 연결, 종합코멘트.

## STEP 11 2차 Review
승인/의견/재검토/Calibration 필요, 문항별 검토이력.

## STEP 12 결과
성과/역량/태도/리더십/종합점수, 핵심가치 Radar, 코멘트, 강점/성장필요.

## STEP 13 Calibration
극단점수·근거누락·평가자 편차 분석, 변경 전/후/사유/변경자 이력.

## STEP 14 9-Block
성과 × 역량, 기준변경, 부서/직급/평가기간 Filter, 비낙인성 육성가이드.

## STEP 15 성장계획
개선역량·현재/기대상태·행동·리더지원·예정일·중간점검 및 상태관리.

## STEP 16 Dashboard
실제 DB 기반 평가진행률, 핵심가치 평균, Calibration 주의 건수, 일정.

## STEP 17 Excel
6개 Sheet xlsx 다운로드.

## STEP 18 UI/UX
Loading / Error State 및 기존 Card 기반 일관 UI.

## STEP 19 보안
Security Health 화면, RLS 상태 점검 Function, 운영 전 FORCE_DEMO 경고.

## STEP 20 배포
README / .env.example / lint/typecheck/build scripts / GitHub-Vercel 운영기준.

## 알려진 개발모드 제한
`FORCE_DEMO_LOGIN=true`는 Auth/RLS 실제 사용자 검증을 우회합니다.
기능개발에는 사용할 수 있지만 실제 운영 완료 기준에는 포함될 수 없습니다.
운영 전 반드시 false로 전환 후 Role별 로그인 테스트를 다시 수행해야 합니다.
