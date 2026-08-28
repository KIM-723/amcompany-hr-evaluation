'use server';

import { revalidatePath } from 'next/cache';
import { getEvaluationAccess, resolveActorEmployeeId, redirectMessage } from '@/lib/evaluation/access';

export async function saveNineBlockSettings(formData: FormData) {
  const { supabase, user } = await getEvaluationAccess();
  const actor = await resolveActorEmployeeId(supabase, user);
  const periodId = String(formData.get('period_id') ?? '') || null;

  const row = {
    period_id: periodId,
    name: '기본 9-Block 기준',
    performance_low_max: Number(formData.get('performance_low_max') ?? 2.7),
    performance_middle_max: Number(formData.get('performance_middle_max') ?? 3.7),
    competency_low_max: Number(formData.get('competency_low_max') ?? 2.7),
    competency_middle_max: Number(formData.get('competency_middle_max') ?? 3.7),
    is_active: true,
    created_by: actor,
    updated_at: new Date().toISOString(),
  };

  if (periodId) {
    await supabase.from('nine_block_settings').update({ is_active: false }).eq('period_id', periodId);
  }

  const { error } = await supabase.from('nine_block_settings').insert(row);
  if (error) redirectMessage(`/nine-block${periodId ? `?period=${periodId}` : ''}`, 'error', error.message);
  revalidatePath('/nine-block');
  redirectMessage(`/nine-block${periodId ? `?period=${periodId}` : ''}`, 'success', '9-Block 기준을 저장했습니다.');
}
