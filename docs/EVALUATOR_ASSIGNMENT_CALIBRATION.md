# 평가자 자동배정 / Calibration 재실행

## 평가자 기준

### 1차 평가자
직책관리에서 `1차평가 리더`로 설정된 직책 또는 기존 직원관리의 `리더 여부=Y`.

평가기간에서 리더를 선택하면:
- employees.leader_id = 선택 리더 ID
- 아직 해당 평가기간에 등록되지 않은 구성원

만 자동 조회합니다.

조회된 구성원은 최초에 모두 체크됩니다.
필요하면 일부 체크를 해제한 뒤 등록할 수 있습니다.

DB Trigger에서도:
- 1차평가자가 실제 리더인지
- 대상 직원의 leader_id와 동일한지

재검증합니다.

### 2차 평가자
직책관리에서 `2차평가 임원`으로 설정된 직책의 재직자만 선택할 수 있습니다.

## Calibration

평가기간 상태:

active
→ Calibration 1차
→ Calibration 해제
→ active
→ Calibration 2차 다시 시작
→ Calibration 해제
→ ...

Calibration 해제는 기존 변경점수를 원복하지 않습니다.
모든 점수 변경이력은 calibration_logs에 남고 각 이력에 calibration_round가 기록됩니다.

점수를 원래 값으로 되돌리고 싶다면 다음 Calibration 차수에서 해당 점수로 다시 변경하고 사유를 기록합니다.
