# AMCOMPANY 인사진단 DB ERD — STEP 2

```mermaid
erDiagram
  AUTH_USERS ||--o| PROFILES : authenticates
  PROFILES ||--o| EMPLOYEES : maps
  DEPARTMENTS ||--o{ DEPARTMENTS : parent
  DEPARTMENTS ||--o{ EMPLOYEES : belongs_to
  JOB_LEVELS ||--o{ EMPLOYEES : has
  POSITIONS ||--o{ EMPLOYEES : has
  EMPLOYEES ||--o{ EMPLOYEE_ROLE_ASSIGNMENTS : receives
  ROLES ||--o{ EMPLOYEE_ROLE_ASSIGNMENTS : grants

  EVALUATION_PERIODS ||--o{ EVALUATION_PERIOD_TEMPLATE_RULES : configures
  EVALUATION_TEMPLATES ||--o{ EVALUATION_PERIOD_TEMPLATE_RULES : applies
  EVALUATION_TEMPLATES ||--o{ EVALUATION_CATEGORIES : contains
  EVALUATION_CATEGORIES ||--o{ EVALUATION_QUESTIONS : contains
  EVALUATION_QUESTIONS ||--o{ EVALUATION_QUESTION_STANDARDS : defines
  JOB_LEVELS ||--o{ EVALUATION_QUESTION_STANDARDS : expects
  EVALUATION_QUESTIONS ||--o{ EVALUATION_QUESTION_CORE_VALUES : maps
  CORE_VALUES ||--o{ EVALUATION_QUESTION_CORE_VALUES : maps

  EVALUATION_PERIODS ||--o{ EVALUATION_ASSIGNMENTS : creates
  EMPLOYEES ||--o{ EVALUATION_ASSIGNMENTS : subject
  EVALUATION_TEMPLATES ||--o{ EVALUATION_ASSIGNMENTS : uses
  EVALUATION_ASSIGNMENTS ||--|| EVALUATION_SNAPSHOTS : freezes
  EVALUATION_ASSIGNMENTS ||--o| SELF_EVALUATIONS : self
  EVALUATION_ASSIGNMENTS ||--o{ EVALUATIONS : evaluates
  EVALUATIONS ||--o{ EVALUATION_RESPONSES : answers
  EVALUATIONS ||--o{ EVALUATION_REVIEW_ITEMS : reviews
  EVALUATIONS ||--o{ EVALUATION_CATEGORY_SCORES : aggregates
  EVALUATION_ASSIGNMENTS ||--o| EVALUATION_RESULTS : finalizes

  EMPLOYEES ||--o{ OBSERVATION_LOGS : observes
  EMPLOYEES ||--o{ OBSERVATION_LOGS : subject
  OBSERVATION_LOGS ||--o{ EVALUATION_EVIDENCE_LINKS : evidence
  EVALUATION_RESPONSES ||--o{ EVALUATION_EVIDENCE_LINKS : supported_by

  EVALUATION_ASSIGNMENTS ||--o{ EVALUATION_HISTORY : history
  EVALUATION_ASSIGNMENTS ||--o{ CALIBRATION_LOGS : calibrates
  EVALUATION_RESULTS ||--o{ GROWTH_PLANS : creates
  GROWTH_PLANS ||--o{ GROWTH_PLAN_CHECKPOINTS : tracks
  EVALUATION_PERIODS ||--o{ NINE_BLOCK_SETTINGS : configures
```

## 핵심 설계 원칙

1. `auth.users`는 인증 원천이고 `profiles`는 앱 계정, `employees`는 인사정보다.
2. 평가 시작 시 `evaluation_snapshots`에 직원·조직·직급·직책·평가자·문항·행동기준·핵심가치를 JSON으로 동결한다.
3. 현재 Master Data가 변경되어도 과거 평가는 Snapshot 기준으로 재현한다.
4. 평가 작성/수정은 `evaluation_history`에 자동 기록한다.
5. 최종 확정값은 `evaluation_results`로 별도 Materialize하여 향후 계산식 변경과 분리한다.
6. 2차 평가 검토는 `evaluation_review_items`에 문항별로 기록한다.
7. 관찰근거는 `evaluation_evidence_links`로 평가응답과 직접 연결한다.
8. STEP 2에서 새로 생성된 테이블은 RLS를 활성화하되 허용 정책은 만들지 않는다. 세부 정책은 STEP 4에서 구현한다.
