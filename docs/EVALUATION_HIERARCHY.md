# 평가자 자동배정 규칙

## 일반 구성원
- 대상: 직책 evaluation_role = none
- 1차: 같은 department_id의 leader
- 2차: executive

## 리더
- 대상: 직책 evaluation_role = leader 또는 기존 is_leader
- 1차: division_head
- 조건: 리더의 department_id가 본부장 department_id의 하위 조직이어야 함
- 2차: executive

## 조직 예시
섬유본부 (본부장)
- 국내섬유영업부 (리더)
- 해외섬유영업부 (리더)
- 생산관리부 (리더)

본부장을 선택하면 위 3개 하위부서의 리더가 자동조회됩니다.
재귀 하위조직을 사용하므로 부서 단계가 더 깊어져도 동작합니다.
