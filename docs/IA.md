# AMCOMPANY 인사진단 웹시스템 — STEP 1 IA

## 1. 설계 원칙

이 시스템은 단순 점수 입력기가 아니라 아래 흐름을 지원한다.

**업무 관찰 → 근거 기록 → 자기평가 → 1차 평가 → 2차 Review → Calibration → 결과 → 성장계획**

핵심가치 **성장 · 신뢰 · 전문성 · 감각**은 평가문항, 관찰일지, 결과 화면에서 연결될 수 있도록 설계한다.

STEP 1에서는 URL, 화면 책임, Role별 사용 흐름, 디렉터리 책임을 확정한다. 실제 인증과 RLS는 STEP 4에서 구현한다.

---

## 2. Sidebar IA

- Dashboard
- 인사진단
  - 자기평가
  - 1차 평가
  - 2차 Review
  - 평가결과
- 관찰일지
- 직원관리
- 조직관리
  - 조직 Tree
  - 직급관리
- 평가기간
- 평가문항
- Calibration
- 9-Block
- 성장계획
- 통계
- 설정
  - 시스템 설정
  - Role / 권한

---

## 3. Role별 Flow

### 직원
1. 로그인
2. Dashboard에서 평가 일정/내 할 일 확인
3. 인사진단 → 자기평가 작성/제출
4. 결과 공개 후 인사진단 → 평가결과 확인
5. 성장계획 작성 및 진행상태 확인

### 1차 평가자
1. 로그인
2. Dashboard에서 배정 대상자/마감 확인
3. 관찰일지에서 업무 Evidence 기록
4. 인사진단 → 1차 평가에서 대상자 평가
5. 자기평가와 비교하고 Evidence 연결
6. 종합코멘트 작성 후 제출
7. 재검토 요청이 있으면 수정 후 재제출
8. 확정 후 결과/성장계획 Follow-up

### 2차 평가자
1. 로그인
2. Dashboard에서 Review 대상 확인
3. 인사진단 → 2차 Review
4. 1차 평가 근거와 점수 일관성 검토
5. 승인 / 의견 추가 / 재검토 요청 / Calibration 필요 처리
6. 필요한 경우 결과 및 성장계획 Follow-up

### 리더
1. 로그인
2. Dashboard에서 허용 조직의 평가 진행현황 확인
3. 필요 시 관찰일지 기록
4. 배정에 따라 1차/2차 평가 수행
5. Calibration에서 조직 편차와 이상 가능성 검토
6. 9-Block에서 성과 × 역량 분포 확인
7. 성장계획 지원 및 점검
8. 통계에서 조직 단위 추세 확인

### HR 관리자
1. 로그인
2. 직원관리 / 조직관리 / 직급관리 기준 점검
3. 평가문항과 직급별 행동기준 관리
4. 평가기간 생성
5. 평가대상·1차·2차 평가자 지정
6. 평가 시작 시 기준 Snapshot 생성
7. Dashboard에서 전체 진행률 관리
8. Calibration 운영
9. 결과 공개 및 9-Block/통계 확인
10. 성장계획 운영 점검
11. Excel Export / Audit 점검

### 최고관리자
1. 로그인
2. 전사 Dashboard 및 평가 운영상태 확인
3. HR 관리자 기능 전체 접근
4. 전사 Calibration / 9-Block / 통계 확인
5. 시스템 설정 및 Role 정책 최종 확인

---

## 4. 주요 화면 정의

화면 정의의 단일 기준은 `config/ia.ts`의 `SCREEN_DEFINITIONS`이다. 향후 Route Guard, 테스트 케이스, 운영 문서가 동일한 URL과 Role 정의를 참조하도록 한다.

| 화면 | URL | 주요 사용자 | 목적 | 구현 STEP |
|---|---|---|---|---:|
| Dashboard | `/dashboard` | 전체 Role | 역할별 진행현황/할 일 | 16 |
| 인사진단 Hub | `/evaluations` | 전체 Role | 평가 흐름 진입 | 9~12 |
| 자기평가 | `/evaluations/self` | 평가 대상자 | 자기평가 작성/제출 | 9 |
| 1차 평가 | `/evaluations/first` | 1차 평가자 등 | Evidence 기반 평가 | 10 |
| 2차 Review | `/evaluations/second` | 2차 평가자 등 | 1차 평가 검토 | 11 |
| 평가결과 | `/evaluations/results` | 권한 사용자 | 개인 결과/근거 조회 | 12 |
| 관찰일지 | `/observations` | 평가자/리더/HR | SBI Evidence 기록 | 8 |
| 직원관리 | `/employees` | HR/최고관리자 | 직원 정보 관리 | 5 |
| 조직관리 | `/organization` | HR/최고관리자 | 조직 Tree 관리 | 5 |
| 직급관리 | `/organization/job-levels` | HR/최고관리자 | 직급 데이터 관리 | 5 |
| 평가기간 | `/periods` | HR/최고관리자 | 평가 일정/대상 운영 | 6 |
| 평가문항 | `/questions` | HR/최고관리자 | 문항/기준/가중치 관리 | 7 |
| Calibration | `/calibration` | 리더/HR/최고관리자 | 분포/이상치 검토 | 13 |
| 9-Block | `/nine-block` | 리더/HR/최고관리자 | 성과×역량 분포 | 14 |
| 성장계획 | `/growth-plans` | 전체 Role | 평가→성장 연결 | 15 |
| 통계 | `/stats` | 리더/HR/최고관리자 | 분석/Drill-down | 16 |
| 설정 | `/settings` | HR/최고관리자 | 운영 기준 관리 | 18 |
| Role / 권한 | `/settings/roles` | HR/최고관리자 | Role 정책 운영 | 4 |

---

## 5. 접근 권한 원칙

### 직원
- 본인 평가, 본인 결과, 본인 성장계획 중심
- 타 직원 평가 URL 직접 접근 차단

### 1차 평가자
- `evaluation_assignments`에서 자신이 1차 평가자로 지정된 대상만 접근

### 2차 평가자
- 자신이 2차 평가자로 지정된 Review 대상만 접근

### 리더
- 별도의 조직 범위 데이터로 허용된 조직만 접근

### HR 관리자
- 평가 운영을 위한 전사 접근
- 개인정보/감사로그 등 민감 기능은 목적에 따라 추가 세분화 가능

### 최고관리자
- 전사 운영 접근

**중요:** STEP 1의 `config/navigation.ts`와 `lib/permissions/route-access.ts`는 권한 설계를 코드로 표현한 것이다. 보안 통제가 완료된 것은 아니다. STEP 4에서 Next.js 서버 접근 통제 + Supabase RLS를 동시에 적용한다.

---

## 6. Directory Structure

```text
app/
  dashboard/
  evaluations/
    self/
    first/
    second/
    results/
  observations/
  employees/
  organization/
    job-levels/
  periods/
  questions/
  calibration/
  nine-block/
  growth-plans/
  stats/
  settings/
    roles/

components/
  layout/        # Sidebar, Header 등 전체 화면 구조
  ui/            # Card, PageShell, Placeholder 등 공통 UI

config/
  system.ts      # 시스템명, 핵심가치 등 전역 설정
  navigation.ts  # Sidebar IA + Role별 메뉴 정의
  ia.ts          # 화면별 URL/사용자/목적/데이터/Action 정의

lib/
  permissions/   # Route/Role 접근 판단 공통 로직
  supabase/      # Supabase browser/server/admin client

services/        # STEP 5 이후 업무 도메인별 서버 데이터 접근 계층
hooks/           # STEP 4 이후 Client-side 공통 hooks
types/           # 공통 TypeScript domain type
supabase/
  migrations/    # DB migration
  seed/          # 개발용 seed

docs/            # IA, 운영, 개발 단계 문서
```

### 디렉터리 사용 규칙

- `app/`: Routing과 화면 조합. 복잡한 DB 로직을 직접 넣지 않는다.
- `components/`: 재사용 UI와 화면 조각.
- `config/`: 코드에서 공유하는 변경 가능성이 낮은 시스템 구조 정의.
- `lib/`: 기술 인프라, 권한 유틸리티 등.
- `services/`: 직원, 평가, 관찰일지 등 업무 도메인별 DB 접근. STEP 5부터 확장.
- `types/`: DB/domain 타입 정의.
- `supabase/migrations/`: Schema 변경 SQL. 기존 migration을 수정하기보다 새 migration을 추가한다.
- `docs/`: 개발자가 아닌 HR 운영자도 구조를 이해할 수 있는 문서.

---

## 7. STEP 2 연결 시 주의사항

1. `auth.users`를 인증 원천으로 사용하고 앱 사용자 프로필은 `profiles` 등의 public schema 테이블로 분리한다.
2. 평가 시작 후 기준 변경이 과거 평가를 바꾸지 않도록 Snapshot 구조를 최우선으로 설계한다.
3. 부서/직급/직책/평가자 당시 정보를 평가 Snapshot에 보존한다.
4. 평가값 수정은 덮어쓰기만 하지 말고 History/Audit을 남긴다.
5. `config/ia.ts`의 requiredData는 STEP 2 Schema 검토 체크리스트로 사용한다.
