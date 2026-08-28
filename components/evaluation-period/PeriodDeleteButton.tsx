'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deleteEvaluationPeriodCompletely } from '@/app/periods/actions';

export function PeriodDeleteButton({
  periodId,
  periodName,
  assignmentCount,
}: {
  periodId: string;
  periodName: string;
  assignmentCount: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function remove() {
    const confirmed = window.confirm(
      `"${periodName}" 평가기간을 영구삭제합니다.\n\n` +
      `현재 평가대상: ${assignmentCount}명\n\n` +
      `함께 삭제되는 데이터:\n` +
      `• 평가대상 및 Snapshot\n` +
      `• 자기평가\n` +
      `• 1차/2차/최종 평가 및 평가응답\n` +
      `• 평가결과\n` +
      `• Calibration 및 평가 History\n` +
      `• 이 평가기간에 직접 연결된 관찰일지\n` +
      `• 이 기간의 평가결과에서 생성된 성장계획\n` +
      `• 해당 기간 Leadership Red Flag / 9-Block 설정\n\n` +
      `이 작업은 되돌릴 수 없습니다.\n계속하시겠습니까?`,
    );

    if (!confirmed) return;

    startTransition(async () => {
      const result = await deleteEvaluationPeriodCompletely(periodId);

      if (!result.ok) {
        window.alert(result.message);
        return;
      }

      window.alert(result.message);
      router.push('/periods');
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={remove}
      className="rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? '삭제 중...' : '평가기간 영구삭제'}
    </button>
  );
}
