'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export function EvaluationRosterLiveRefresh({
  currentEmployeeCount,
  unassignedCount,
}: {
  currentEmployeeCount: number;
  unassignedCount: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const refresh = useCallback(() => {
    startTransition(() => {
      router.refresh();
      setLastRefresh(new Date());
    });
  }, [router]);

  useEffect(() => {
    const onFocus = () => refresh();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refresh();
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);

    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') refresh();
    }, 10000);

    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearInterval(timer);
    };
  }, [refresh]);

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
      <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700">
        직원목록 자동동기화
      </span>
      <span>현재 {currentEmployeeCount}명 · 미배정 {unassignedCount}명</span>
      {lastRefresh && <span>· 최근 갱신 {lastRefresh.toLocaleTimeString('ko-KR')}</span>}
      <button
        type="button"
        onClick={refresh}
        disabled={pending}
        className="rounded-lg border bg-white px-2.5 py-1 font-semibold text-slate-700 disabled:opacity-50"
      >
        {pending ? '갱신 중...' : '지금 새로고침'}
      </button>
    </div>
  );
}
