# AMCOMPANY 인사진단 Database Schema — STEP 2

## 1. Identity / Organization

| Table | 핵심 목적 | 주요 Key / Index |
|---|---|---|
| `profiles` | Supabase `auth.users`와 앱 프로필 1:1 연결 | PK/FK `id -> auth.users.id` |
| `departments` | 계층형 조직 | `name` unique, `parent_id`, parent/sort index |
| `positions` | 직책/보직 Master | `name` unique, optional `code` unique |
| `job_levels` | 주니어~마스터 등 직급 Master | `name`, `level_order` unique, optional `code` unique |
| `roles` | 시스템 Role Master | `code`, `name` unique |
| `employees` | 직원 인사 Master | `employee_no` unique, `user_id` unique, 부서/직급 index |
| `employee_role_assignments` | 직원별 Role과 조직 Scope / 유효기간 | employee/date index |

## 2. Evaluation configuration

| Table | 핵심 목적 | 주요 관계 |
|---|---|---|
| `core_values` | 성장·신뢰·전문성·감각 Master | 질문/평가 핵심가치와 연결 |
| `evaluation_periods` | 평가기간 및 단계별 일정 | assignment 1:N |
| `evaluation_templates` | 평가양식 Version Master | category 1:N |
| `evaluation_period_template_rules` | 평가기간별 직급/직책/부서 적용 Template 규칙 | period/template FK |
| `evaluation_categories` | 성과·역량·태도·리더십 영역 | template FK |
| `evaluation_questions` | 실제 평가문항 | template/category FK |
| `evaluation_question_standards` | 직급별 기대 행동 | question/job_level unique |
| `evaluation_question_job_levels` | 문항 적용 직급 | M:N |
| `evaluation_question_positions` | 문항 적용 직책 | M:N |
| `evaluation_question_core_values` | 문항-핵심가치 연결 | M:N |

## 3. Evaluation transaction

| Table | 핵심 목적 | 주요 관계/보존 원칙 |
|---|---|---|
| `evaluation_assignments` | 평가대상자와 1·2차 평가자 배정 | period/employee unique |
| `evaluation_snapshots` | 평가 시작 당시 기준 전체 동결 | assignment 1:1, 변경 후 과거평가 영향 차단 |
| `self_evaluations` | 직원 자기평가 | assignment 1:1, 최종점수와 분리 |
| `evaluations` | 1차/2차/최종 평가 Header | assignment/evaluator/stage unique |
| `evaluation_responses` | 문항별 점수·코멘트 | score 1~5, question snapshot 포함 |
| `evaluation_comments` | 리뷰/종합 의견 | evaluation FK |
| `evaluation_review_items` | 2차 검토 결정 및 재검토 요청 | evaluation/response/reviewer FK |
| `evaluation_category_scores` | 제출 시점 영역별 집계값 | evaluation/category code unique |
| `evaluation_core_values` | 평가별 핵심가치 점수 | evaluation/core_value unique |
| `evaluation_results` | 최종결과 Snapshot | assignment 1:1, 결과 화면/Excel/9-Block 기준 |

## 4. Evidence / Growth / Calibration / Audit

| Table | 핵심 목적 |
|---|---|
| `observation_logs` | SBI 관찰일지 Evidence |
| `evaluation_evidence_links` | 평가응답과 관찰일지 연결 |
| `growth_plans` | 평가결과 → 성장계획 |
| `growth_plan_checkpoints` | 중간점검 이력 |
| `calibration_logs` | Calibration 점수변경 전/후 및 사유 |
| `evaluation_history` | 평가 Insert/Update/Delete 이력 |
| `leadership_red_flags` | 리더십 Red Flag |
| `nine_block_settings` | 평가기간별 9-Block 기준값 |
| `projects` / `employee_projects` | 프로젝트 기반 관찰·성과 확장용 |
| `audit_logs` | 보안/관리자 행위 감사로그 |

## 5. Snapshot JSON 구성

`evaluation_snapshots`는 다음을 보존한다.

- `period_snapshot`: 평가명, 일정, 상태 등
- `employee_snapshot`: 사번, 이름, 입사일 등
- `organization_snapshot`: 당시 부서·직급·직책
- `evaluator_snapshot`: 당시 1차·2차 평가자
- `template_snapshot`: 영역, 문항, 가중치, 직급별 행동기준, 문항-핵심가치 연결
- `core_values_snapshot`: 당시 핵심가치 Master
- `snapshot_checksum`: 기준변경 여부 검증용 SHA-256

## 6. History 정책

`evaluation_assignments`, `self_evaluations`, `evaluations`, `evaluation_responses`의 변경은 Trigger를 통해 `evaluation_history`에 남는다.

- `before_data`: 변경 전 Row JSON
- `after_data`: 변경 후 Row JSON
- `changed_by`: `auth.uid()`와 연결된 직원
- `changed_at`: 변경시각
- `source`: 기본 `db_trigger`

최종 결과는 `evaluation_results`에 별도로 저장하여 Master Data 또는 계산식이 변경되어도 당시 결과가 유지되도록 한다.

## 7. RLS 상태

STEP 1에서 존재한 핵심 테이블의 기존 RLS는 유지한다.

STEP 2에서 추가한 다음 테이블은 RLS를 켜고 정책을 만들지 않아 기본 차단 상태로 둔다.

- `evaluation_period_template_rules`
- `evaluation_question_job_levels`
- `evaluation_question_positions`
- `evaluation_snapshots`
- `evaluation_review_items`
- `evaluation_category_scores`
- `evaluation_results`
- `nine_block_settings`

실제 Role별 Select/Insert/Update/Delete 정책은 STEP 4에서 구현한다.
