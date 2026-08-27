# STEP 3 완료 보고 — Sample Data

## 구현한 내용
- AMCOMPANY 유사 조직 10개 부서
- 직급 5단계, 직책 4종, Role 6종
- 개발용 직원 38명 생성(평가대상 37명)
- 부서별 리더 / 1차·2차 평가자 관계 설정
- 2026 하반기 평가기간 및 기본 평가 Template 구성
- 성과·역량·태도&습관·리더십 평가문항 12개 구성
- 5개 직급별 기대행동 기준 생성
- 핵심가치 성장·신뢰·전문성·감각 연결
- 평가상태를 미시작부터 최종확정까지 다양하게 구성
- 자기평가 / 1차 평가 / 평가응답 / 핵심가치 점수 생성
- SBI 관찰일지 및 Evidence 연결 생성
- 2차 Review 샘플(승인/재검토/Calibration 필요) 생성
- 최종결과 4건 및 9-Block용 점수 생성
- 성장계획 / 중간점검 / Leadership Red Flag / Calibration 이상치 생성
- 개발용 프로젝트 및 구성원 참여관계 생성
- Seed 재실행 시 중복을 최소화하도록 Upsert/존재확인 적용

## 변경한 파일
- `README.md`

## 새로 만든 파일
- `supabase/seed/002_step3_sample_data.sql`
- `supabase/seed/003_step3_validation.sql`
- `docs/STEP_03_REPORT.md`

## DB 변경사항
Schema 변경은 없음. STEP 2 Schema에 개발용 Sample Data만 입력한다.

## 권한/RLS 변경사항
없음. STEP 4에서 Auth Demo Account 및 세부 RLS를 구현한다.

## 샘플 데이터 상태 분포
- AM001~AM004: 평가 미시작
- AM005~AM008: 자기평가 작성중
- AM009~AM014: 자기평가 제출완료
- AM015~AM020: 1차 평가 작성중
- AM021~AM027: 1차 평가 제출완료
- AM028~AM033: 2차 Review / Calibration 검토
- AM034~AM037: 최종확정
- AM038: 최고관리자/최종 Review 역할(평가대상 제외)

## 테스트한 내용
`003_step3_validation.sql`로 아래를 확인할 수 있도록 구성했다.
- 직원 수
- 평가대상 수
- 평가문항 수
- 관찰일지 수
- 성장계획 수
- Calibration 로그 수
- 최종결과 수
- 상태별 평가 진행현황
- 평가자 관계
- 최종결과 점수

## 발견된 문제 또는 제한사항
- Sample 직원은 아직 `auth.users`와 연결되어 있지 않다.
- 따라서 실제 Role별 로그인 테스트는 STEP 4에서 진행한다.
- STEP 3은 개발/테스트 전용 데이터이며 운영 DB에는 적용하지 않는 것을 원칙으로 한다.

## STEP 4 진행 시 주의사항
- Supabase Auth Demo Account 6종을 생성한다.
- 해당 Auth User를 `profiles`와 `employees.user_id`에 연결한다.
- 현재 Role Assignment를 활용해 실제 메뉴/Route/API/RLS 권한을 검증한다.
- Production에서는 Demo Account 및 `NEXT_PUBLIC_DEMO_MODE`를 비활성화할 수 있어야 한다.
