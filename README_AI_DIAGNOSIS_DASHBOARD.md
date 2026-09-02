# AMCOMPANY AI 인사진단 개인 대시보드

이 패키지는 기존 AMCOMPANY 인사진단 시스템에 붙일 수 있도록 만든 **개인별 AI 진단 결과 대시보드**입니다.

반영한 구조:

- 성과 / 역량 / 태도&습관 진단을 바탕으로 AI가 핵심가치를 분석
- 핵심가치: 성장 / 신뢰 / 전문성 / 감각
- AI가 근거 없는 평가를 억지로 만들지 않도록 `근거 충분도` 표시
- AI 제안점수 / 부서장 평가 / 최종 확정점수를 분리
- AI 판단근거와 성장방향을 함께 표시
- 강점 TOP 3 / 성장 TOP 3
- 최종 성장 방향
- 레이더 차트
- 개인 대시보드 인쇄/PDF 기능
- AI는 평가보조 역할, 최종 판단은 평가자가 확정하는 구조

---

## 1. GitHub에 올릴 파일

압축을 풀면 다음 구조입니다.

```text
app/
  diagnosis/
    [employeeId]/
      page.tsx

  api/
    diagnosis/
      [employeeId]/
        route.ts

supabase/
  ai_diagnosis_results.sql
```

현재 GitHub Repository의 동일한 위치에 업로드하세요.

---

## 2. 필요한 패키지

이미 설치되어 있다면 다시 설치할 필요 없습니다.

```bash
npm install recharts @supabase/supabase-js
```

---

## 3. Vercel 환경변수

Vercel 프로젝트 > Settings > Environment Variables에서 확인합니다.

```text
NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

기존 프로젝트에서 `SUPABASE_SECRET_KEY`를 사용하고 있다면 그것도 지원하도록 코드를 작성했습니다.

### 매우 중요

`SUPABASE_SERVICE_ROLE_KEY` 또는 `SUPABASE_SECRET_KEY`는 브라우저 코드에 넣지 않습니다.

이번 패키지는 `app/api/.../route.ts` 서버에서만 이 키를 사용합니다.

---

## 4. Supabase 테이블 생성

Supabase SQL Editor에서 다음 파일 내용을 실행합니다.

```text
supabase/ai_diagnosis_results.sql
```

프로젝트에서 employees.id가 UUID가 아니라 text/int 타입이라면:

```sql
employee_id uuid not null
```

부분을 기존 employees.id 타입에 맞게 변경하세요.

---

## 5. AI 결과 JSON 저장 규격

`values_json`에는 아래 구조로 저장합니다.

```json
{
  "growth": {
    "ai_score": 4.2,
    "manager_score": 4.0,
    "final_score": 4.0,
    "confidence": "높음",
    "summary": "새로운 업무를 스스로 학습하고 실제 업무에 적용하는 행동이 확인됨.",
    "strengths": [
      "자기주도적 학습",
      "피드백 수용 후 개선"
    ],
    "evidence": [
      "신규 업무에 필요한 자료를 직접 조사하여 완료",
      "피드백 후 체크리스트를 만들어 동일 오류 재발 방지"
    ],
    "direction": "개인 학습을 팀 지식으로 확장하는 행동이 다음 성장과제."
  },

  "trust": {
    "ai_score": 3.4,
    "manager_score": 3.0,
    "final_score": 3.0,
    "confidence": "보통",
    "summary": "마감 준수는 안정적이나 선제적 정보 공유는 보완 필요.",
    "strengths": [
      "마감 준수",
      "문제 발생 시 책임 회피하지 않음"
    ],
    "evidence": [
      "월간 자료 제출기한 준수",
      "진행상황 공유가 늦어진 사례 존재"
    ],
    "direction": "문제가 확정되기 전 이해관계자에게 선제적으로 공유하는 습관 강화."
  },

  "professional": {
    "ai_score": 4.3,
    "manager_score": 4.0,
    "final_score": 4.0,
    "confidence": "높음",
    "summary": "업무 정확성과 문제 원인 분석 역량이 안정적으로 확인됨.",
    "strengths": [
      "업무 정확성",
      "원인 분석",
      "프로세스 개선"
    ],
    "evidence": [
      "단가 오류 사전 발견",
      "반복 오류의 원인을 분석해 검증절차 추가"
    ],
    "direction": "개인 전문성을 팀의 표준과 성과로 확장."
  },

  "sense": {
    "ai_score": 3.3,
    "manager_score": 3.0,
    "final_score": 3.0,
    "confidence": "보통",
    "summary": "세부 이상 징후 발견은 강점이나 우선순위 판단은 추가 관찰 필요.",
    "strengths": [
      "세부 데이터 차이 인지"
    ],
    "evidence": [
      "거래처별 단가 차이 이상값 발견"
    ],
    "direction": "중요도·긴급도·사업영향도를 먼저 판단하는 습관 강화."
  }
}
```

근거가 부족한 경우에는 예를 들어:

```json
{
  "ai_score": null,
  "manager_score": null,
  "final_score": null,
  "confidence": "판단불가",
  "summary": "현재 기록만으로는 판단할 수 있는 구체적 근거가 부족함.",
  "strengths": [],
  "evidence": [],
  "direction": "추가 관찰 후 진단."
}
```

처럼 저장하는 것을 권장합니다.

---

## 6. 페이지 접속 주소

예를 들어 직원 ID가:

```text
550e8400-e29b-41d4-a716-446655440000
```

이면:

```text
https://내도메인/diagnosis/550e8400-e29b-41d4-a716-446655440000
```

로 접속합니다.

---

## 7. 기존 DB 컬럼명이 다른 경우

`app/api/diagnosis/[employeeId]/route.ts` 안에:

```ts
.from("employees")
.select("id, name, department, position")
```

가 있습니다.

현재 프로젝트의 직원 테이블/컬럼명이 다르면 이 부분만 기존 DB에 맞춰 수정하세요.

예:

```ts
.select("id, employee_name, department_name, job_title")
```

등.

---

## 8. 다음 연결 단계

이 패키지는 **AI 진단 결과를 보여주는 개인 대시보드**입니다.

다음 단계에서 연결하면 좋은 흐름:

```text
부서장 진단 작성
      ↓
AI 분석 실행
      ↓
성장 / 신뢰 / 전문성 / 감각 분류
      ↓
근거 적합성 확인
      ↓
AI 제안점수 + 진단요약 + 성장방향
      ↓
부서장 검토/수정
      ↓
본부장 성장 방향 제안
      ↓
최종 확정
      ↓
ai_diagnosis_results 저장
      ↓
개인별 대시보드 출력
```

이 구조에서는 AI가 최종 평가자가 아니라 **평가 근거를 구조화하고 평가자의 판단을 보조하는 역할**을 합니다.

---

## 9. 기존 AMCOMPANY 인사진단 요구사항과의 연결

향후 아래 기능도 자연스럽게 연결 가능합니다.

- 자기평가 ↔ 부서장평가 차이
- 1차 평가 ↔ 2차 평가 비교
- Calibration 전/후 점수
- 9-Block
- 신규입사자 6개월 진단
- Red Flag
- 핵심가치 레이더차트
- 평가자 편차
- 개인별 반기/연간 성장 추이
- PDF 출력
- Excel 다운로드
- 본부장 성장 방향 제안
