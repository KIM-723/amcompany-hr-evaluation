# AMCOMPANY AI 핵심가치 Dashboard

## 목적

최종 완료된 인사진단의 업무 근거를 기반으로
AMCOMPANY 핵심가치와의 행동 Alignment를 분석합니다.

핵심가치:
- 성장
- 신뢰
- 전문성
- 감각

## AI 입력

AI에는 이름/사번을 보내지 않습니다.

전송:
- 부서
- 직무레벨
- 직책
- 최종 진단 요약
- 성장 포인트
- 본부장 성장 방향
- 기타 코멘트

AI 출력:
- 핵심가치별 0~100 점수
- 근거 부족 여부
- 신뢰도
- 판단 근거
- 성장 행동
- 핵심 강점
- 성장 영역
- 종합진단
- 추천 행동

## 근거 부족

진단 근거가 부족한 경우 AI가 억지로 점수를 생성하지 않습니다.

status = insufficient_evidence
score = null

조직 평균 계산에서도 null은 제외합니다.

## 대시보드

인사진단
→ AI 핵심가치 Dashboard

조직 Dashboard:
- 조직 종합 Alignment
- 성장/신뢰/전문성/감각 평균
- 레이더차트
- Alignment 분포
- 부서별 평균
- 개인별 점수
- 미분석/재분석 상태

개인 Dashboard:
- 종합 Alignment
- 4대 핵심가치
- AI 판단근거
- AI 신뢰도
- 강점
- 성장영역
- 성장행동

## 재분석

AI 분석 당시 personnel_diagnoses.updated_at을
source_diagnosis_updated_at에 저장합니다.

이후 부서장/본부장이 진단내용을 수정하면:
diagnosis.updated_at != source_diagnosis_updated_at

Dashboard:
`재분석 필요`

## AI 모델

기본:
gpt-5.6-terra

환경변수 OPENAI_MODEL로 변경할 수 있습니다.

AI 호출은 브라우저가 아니라 Next.js Server Action에서만 실행합니다.
OPENAI_API_KEY를 NEXT_PUBLIC_ 환경변수로 만들면 안 됩니다.

Responses API 요청에는 store=false를 사용합니다.

## 인사 운영 원칙

AI 분석은 육성/피드백 보조자료입니다.

AI 점수 하나만으로 아래 의사결정을 자동화하지 않습니다:
- 승진
- 보상
- 배치
- 징계
- 해고

사람이 진단근거와 맥락을 확인한 뒤 사용합니다.
