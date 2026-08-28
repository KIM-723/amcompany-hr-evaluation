# 조직정보 자동반영

데이터 변경과 화면 갱신은 구분됩니다.

- 데이터: Server Action 실행 시 Supabase DB에 즉시 저장
- 캐시: 변경 Action에서 `revalidatePath()`로 자동 무효화
- 화면: 다음 렌더링에서 현재 DB 정보를 조회

수동 새로고침 버튼이나 polling은 사용하지 않습니다.

예외적으로 이미 열려 있던 다른 브라우저 탭 또는 Back/Forward Cache 화면은
`focus`, `visibilitychange`, `pageshow` 이벤트에서 `router.refresh()`를 자동 실행합니다.

이 동작은 사용자에게 노출되지 않습니다.
