'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

/**
 * 사용자에게 새로고침 UI를 노출하지 않는다.
 *
 * 조직/직원 정보의 실제 DB 변경은 각 Server Action에서 즉시 완료되고,
 * 관련 경로도 revalidatePath()로 무효화한다.
 *
 * 이 컴포넌트는 브라우저의 뒤로가기 캐시나 다른 탭에서 수정 후 복귀하는
 * 경우에만 조용히 router.refresh()를 실행한다.
 */
export function EvaluationRosterLiveRefresh({
  currentEmployeeCount: _currentEmployeeCount,
  unassignedCount: _unassignedCount,
}: {
  currentEmployeeCount: number;
  unassignedCount: number;
}) {
  const router = useRouter();
  const lastRefreshAt = useRef(0);

  const syncCurrentData = useCallback(() => {
    const now = Date.now();

    // focus + visibilitychange 등이 동시에 발생할 때 중복 요청 방지
    if (now - lastRefreshAt.current < 700) return;

    lastRefreshAt.current = now;
    router.refresh();
  }, [router]);

  useEffect(() => {
    const onFocus = () => syncCurrentData();

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncCurrentData();
      }
    };

    // 브라우저 Back/Forward Cache에서 이전 화면이 복원된 경우
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        syncCurrentData();
      }
    };

    window.addEventListener('focus', onFocus);
    window.addEventListener('pageshow', onPageShow);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('pageshow', onPageShow);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [syncCurrentData]);

  // 화면에는 아무것도 표시하지 않는다.
  return null;
}
