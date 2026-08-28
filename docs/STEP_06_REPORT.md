# STEP 6 완료 보고 - 평가기간 관리

## 구현한 내용

- 평가기간 목록 / 검색 / 상태 Filter
- 평가기간 신규 생성
- 평가기간 일정 수정
- 평가기간 복제
- 초안 → 예정 → 진행중 → Calibration → 종료 상태 전환
- 평가대상자 다중 지정
- 평가대상별 1차 평가자 / 2차 평가자 / Template 지정
- 평가 시작 시 대상자별 immutable Snapshot 자동 생성
- 진행 이후 평가자/Template 변경 및 대상 삭제 제한
- 기존 활성 평가기간에 신규 대상 추가 시 Snapshot 즉시 생성
- service_role 기반 FORCE_DEMO_LOGIN 개발모드 호환
- 평가기간 / 평가배정 Audit Log

## 변경/신규 파일

- app/periods/page.tsx
- app/periods/new/page.tsx
- app/periods/[id]/page.tsx
- app/periods/actions.ts
- components/evaluation-period/PeriodForm.tsx
- components/evaluation-period/PeriodStatusBadge.tsx
- types/database.ts
- supabase/migrations/009_step6_evaluation_period_management.sql
- supabase/migrations/010_step6_validation.sql

## DB 변경사항

evaluation_periods:
- description 추가
- copied_from_id 추가
- 상태/날짜 Index 추가
- 날짜 검증 Trigger 추가
- updated_at Trigger 적용

evaluation_assignments:
- 기존 JSON Snapshot 컬럼에 `{}` 기본값 추가

Function:
- activate_evaluation_period()
- close_evaluation_period()
- create_assignment_snapshot() search_path 보정

## Snapshot 원칙

평가기간을 `평가 시작`으로 전환하는 순간 아직 Snapshot이 없는 모든
evaluation_assignment에 대해 create_assignment_snapshot()을 호출합니다.

따라서 이후:
- 부서 변경
- 직급 변경
- 직책 변경
- 평가자 변경
- 문항 변경
- 행동기준 변경

이 발생하더라도 시작 당시 기준은 evaluation_snapshots에 보존됩니다.

## 권한/RLS

정상 로그인 환경:
- STEP 4의 HR 관리자 RLS 정책 사용

현재 개발용 FORCE_DEMO_LOGIN:
- 서버 전용 SUPABASE_SECRET_KEY / SUPABASE_SERVICE_ROLE_KEY 사용
- STEP 6에 필요한 테이블만 service_role GRANT

## 테스트 포인트

1. 평가기간 생성 후 새로고침 유지
2. 일정 수정
3. 평가기간 복제
4. 평가대상 2~3명 추가
5. 대상별 1차/2차 평가자 변경
6. 평가 시작
7. Snapshot 수가 평가대상 수와 일치하는지 확인
8. 평가 시작 이후 평가대상 삭제/평가자 직접 수정이 막히는지 확인
9. Calibration 전환
10. 평가 종료

## 다음 STEP

STEP 7 평가문항 관리:
- 평가영역
- 문항
- 세부역량
- 직급별 행동기준
- 핵심가치 연결
- 적용 직급/직책
- 가중치
- 활성상태
