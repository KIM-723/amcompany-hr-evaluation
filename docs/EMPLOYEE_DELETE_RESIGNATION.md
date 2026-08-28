# 직원 삭제 / 퇴사 처리 정책

## 퇴사
퇴사는 삭제가 아닙니다.
직원 master와 기존 평가 History를 유지합니다.

- employees.employment_status = resigned
- employees.resignation_date 저장
- 주요 평가/진단 테이블에 subject_is_resigned / subject_resignation_date 동기화
- 기존 Snapshot JSON은 변경하지 않음
- 재직 복귀 시 퇴사자 operational flag 해제

## 영구삭제
HR 관리자 전용 위험기능입니다.

삭제되는 데이터:
- 해당 직원의 evaluation_assignment 및 하위 평가 전체
- 자기평가
- 1차/2차/최종 평가와 응답
- 평가결과
- Calibration/History
- 관찰일지
- 성장계획
- Leadership Red Flag
- 해당 직원이 평가자/Reviewer/Author/Observer로 작성한 관련 기록

보존되는 다른 직원 데이터:
- 다른 직원의 평가배정 자체
- 시스템 평가기간/Template/9-Block 설정
- 다른 직원 성장계획

다른 직원 기록에서 삭제 직원을 참조하는 평가자/리더/created_by 등은
삭제 또는 NULL 해제 방식으로 FK 무결성을 유지합니다.

연결된 Supabase Auth user 자체는 DB 함수에서 삭제하지 않습니다.
profile은 inactive 처리합니다.
