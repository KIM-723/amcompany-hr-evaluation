'use server';

import { revalidatePath } from 'next/cache';
import { getEvaluationAccess, resolveActorEmployeeId, redirectMessage } from '@/lib/evaluation/access';

export async function applyCalibration(responseId: string, formData: FormData) {
  const { supabase, user } = await getEvaluationAccess();
  if (!user.roles.some((r) => ['hr_admin','super_admin'].includes(r))) redirectMessage('/calibration','error','Calibration 변경 권한이 없습니다.');
  const actor = await resolveActorEmployeeId(supabase, user);
  if (!actor) redirectMessage('/calibration', 'error', '변경자 정보를 확인할 수 없습니다.');

  const newScore = Number(formData.get('new_score'));
  const reason = String(formData.get('reason') ?? '').trim();

  if (!Number.isFinite(newScore) || newScore < 1 || newScore > 5) {
    redirectMessage('/calibration', 'error', '변경점수는 1~5 범위여야 합니다.');
  }
  if (!reason) redirectMessage('/calibration', 'error', '변경사유는 필수입니다.');

  const { error } = await supabase.rpc('apply_calibration_score', {
    p_response_id: responseId,
    p_new_score: newScore,
    p_reason: reason,
    p_actor_id: actor,
  });

  if (error) redirectMessage('/calibration', 'error', error.message);

  revalidatePath('/calibration');
  revalidatePath('/evaluations/results');
  redirectMessage('/calibration', 'success', 'Calibration 점수 변경을 기록했습니다.');
}
