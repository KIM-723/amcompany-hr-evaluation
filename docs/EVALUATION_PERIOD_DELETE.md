# 평가기간 영구삭제

평가기간 상세 화면 하단 `위험 영역`에서 삭제합니다.

삭제 대상:
- evaluation_period
- evaluation_period_template_rules
- evaluation_assignments
- evaluation_snapshots
- self_evaluations
- evaluations
- evaluation_responses
- evaluation_comments
- evaluation_evidence_links
- evaluation_core_values
- evaluation_review_items
- evaluation_category_scores
- evaluation_results
- calibration_logs
- evaluation_history
- period_id가 연결된 observation_logs
- period_id가 연결된 leadership_red_flags
- 해당 기간 평가/결과/응답에서 파생된 growth_plans와 checkpoints
- 해당 기간 nine_block_settings

보존:
- 직원 master
- 평가 Template / 문항 master
- 다른 평가기간
- 다른 평가기간의 평가/진단 데이터
- 시스템 Audit Log

복제된 다른 평가기간의 `copied_from_id`가 삭제 기간을 가리키는 경우
복제 기간 자체는 보존하고 `copied_from_id`만 NULL 처리합니다.

영구삭제는 되돌릴 수 없습니다.
