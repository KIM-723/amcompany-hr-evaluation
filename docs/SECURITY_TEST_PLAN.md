# STEP 19 권한 및 보안 테스트 계획

정상 Supabase Auth 복귀 후 아래 계정별로 테스트합니다.

1. 직원이 다른 직원 평가 URL 직접 접근 → 차단
2. 1차 평가자가 배정되지 않은 대상 접근 → 차단
3. 2차 평가자가 권한 없는 Review 접근 → 차단
4. 리더가 다른 부서 직원/결과 접근 → 차단
5. 일반 사용자가 관리자 직원/조직/문항 API 호출 → 차단
6. Excel Export 권한 우회 → 403
7. anon key로 직접 민감테이블 조회 → RLS 차단
8. Service/Secret Key가 브라우저 Bundle 또는 GitHub에 없는지 확인
9. XSS 입력 문자열 저장/렌더 시 React escaping 확인
10. 변경행위가 audit/evaluation_history/calibration_logs에 남는지 확인
11. 세션 로그아웃 후 보호 URL 접근 → /login
12. FORCE_DEMO_LOGIN=false 확인

`FORCE_DEMO_LOGIN=true`인 상태에서는 1~7의 실제 RLS 보안 테스트 결과를 인정하지 않습니다.
