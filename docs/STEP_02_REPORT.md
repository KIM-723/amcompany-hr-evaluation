# STEP 2 완료 보고

## 구현한 내용

- 기존 001 Schema를 삭제하지 않고 STEP 2 보강 Migration을 추가했다.
- Supabase `auth.users -> profiles -> employees` 인증/인사 분리 원칙을 유지했다.
- 평가기간별 Template 적용 규칙을 추가했다.
- 평가문항의 적용 직급/직책을 M:N 구조로 정규화했다.
- 평가 시작 후 기준변경이 과거평가에 영향을 주지 않도록 `evaluation_snapshots`와 Snapshot 생성 Function을 추가했다.
- 2차 평가 문항별 Review 구조를 추가했다.
- 평가 영역별 집계와 최종 결과 Snapshot 구조를 추가했다.
- 관찰 Evidence, 성장계획, Calibration, 9-Block 확장 Schema를 보강했다.
- 평가 핵심 Transaction 변경이 `evaluation_history`에 자동 기록되도록 Trigger를 추가했다.
- 주요 조회 패턴에 맞춘 Index를 추가했다.
- 새 테이블은 RLS를 Secure-by-default로 활성화했다.

## 변경한 파일

- `README.md`

## 새로 만든 파일

- `supabase/migrations/002_step2_schema_hardening.sql`
- `types/database.ts`
- `docs/ERD.md`
- `docs/DATABASE_SCHEMA.md`
- `docs/STEP_02_REPORT.md`

## DB 변경사항

### 신규 Table

- `evaluation_period_template_rules`
- `evaluation_question_job_levels`
- `evaluation_question_positions`
- `evaluation_snapshots`
- `evaluation_review_items`
- `evaluation_category_scores`
- `evaluation_results`
- `nine_block_settings`

### 기존 Table 보강

조직/직급/Role/직원, 평가기간/Template/문항, Assignment/Evaluation/Response, 관찰일지, 성장계획, Calibration/Audit에 운영용 Column과 Index를 추가했다.

### Function / Trigger

- `set_updated_at()`
- `log_evaluation_entity_change()`
- `create_assignment_snapshot(assignment_id, created_by)`
- 주요 Master/Transaction `updated_at` Trigger
- 평가 Transaction History Trigger

## 권한/RLS 변경사항

새 STEP 2 Table에 RLS를 활성화했다. 아직 허용 Policy는 생성하지 않았다. 따라서 anon/authenticated Client는 해당 신규 Table에 직접 접근할 수 없으며 STEP 4에서 Role별 Policy를 추가한다.

기존 001의 RLS 정책은 삭제하거나 완화하지 않았다.

## 테스트한 내용

- Migration을 기존 001 이후에 적용할 수 있도록 `IF NOT EXISTS`/조건부 Constraint 중심으로 작성했다.
- FK 생성 순서와 Trigger 대상 Table 존재 순서를 점검했다.
- Snapshot Function이 부서·직급·직책·평가자·Template·행동기준·핵심가치를 포함하도록 구성했다.
- Sample Data Insert는 포함하지 않았다.

## 발견된 문제 또는 제한사항

- 실제 Supabase 프로젝트에 Migration을 실행해야 최종 SQL 실행환경 검증이 가능하다.
- STEP 4 전까지 신규 RLS Table은 일반 로그인 사용자에게 차단된다. 이는 의도된 상태다.
- 기존 `evaluation_assignments`의 JSON Snapshot Column은 하위 호환 및 빠른 조회를 위해 유지하고, `evaluation_snapshots`를 역사적 Source of Truth로 사용한다.

## 다음 STEP 진행 시 주의사항

- STEP 3 Seed는 반드시 `001 -> 002` Migration이 모두 성공한 뒤 실행한다.
- Seed는 `auth.users`를 임의 생성하는 방식보다 Demo Auth 계정과 `profiles/employees` 매핑 전략을 분리해야 한다.
- Snapshot은 평가 Assignment가 활성화될 때 한 번만 생성해야 한다.
- STEP 4에서는 Frontend 메뉴 숨김이 아니라 Server Route와 Supabase RLS를 함께 구현해야 한다.
