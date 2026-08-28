'use server';

import { revalidatePath } from 'next/cache';
import { getEvaluationAccess, redirectMessage } from '@/lib/evaluation/access';
import { optionalText } from '@/lib/hr/utils';

export async function saveSelfEvaluation(assignmentId: string, formData: FormData) {
  const { supabase } = await getEvaluationAccess();
  const intent = String(formData.get('intent') ?? 'save');
  const row = {
    assignment_id: assignmentId,
    achievements: optionalText(formData.get('achievements')),
    growth_area: optionalText(formData.get('growth_area')),
    gaps: optionalText(formData.get('gaps')),
    next_improvement: optionalText(formData.get('next_improvement')),
    support_needed: optionalText(formData.get('support_needed')),
    performance_score: formData.get('performance_score') ? Number(formData.get('performance_score')) : null,
    competency_score: formData.get('competency_score') ? Number(formData.get('competency_score')) : null,
    core_value_scores: {
      성장: Number(formData.get('core_growth') ?? 0),
      신뢰: Number(formData.get('core_trust') ?? 0),
      전문성: Number(formData.get('core_professionalism') ?? 0),
      감각: Number(formData.get('core_sense') ?? 0),
    },
    status: intent === 'submit' ? 'submitted' : 'draft',
    submitted_at: intent === 'submit' ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('self_evaluations').upsert(row, { onConflict: 'assignment_id' });
  if (error) redirectMessage(`/evaluations/self?assignment=${assignmentId}`, 'error', error.message);

  if (intent === 'submit') {
    await supabase.from('evaluation_assignments').update({
      status: 'self_submitted',
      current_stage: 'first',
      updated_at: new Date().toISOString(),
    }).eq('id', assignmentId);
  }

  revalidatePath('/evaluations/self');
  redirectMessage(`/evaluations/self?assignment=${assignmentId}`, 'success', intent === 'submit' ? '자기평가를 제출했습니다.' : '임시저장했습니다.');
}


export async function reopenSelfEvaluation(assignmentId: string) {
  const { supabase, user } = await getEvaluationAccess();
  if (!user.roles.some((r) => ['hr_admin','super_admin'].includes(r))) {
    redirectMessage(`/evaluations/self?assignment=${assignmentId}`, 'error', '자기평가 재오픈 권한이 없습니다.');
  }
  const { error } = await supabase.from('self_evaluations').update({
    status: 'reopened',
    submitted_at: null,
    updated_at: new Date().toISOString(),
  }).eq('assignment_id', assignmentId);
  if (error) redirectMessage(`/evaluations/self?assignment=${assignmentId}`, 'error', error.message);
  revalidatePath('/evaluations/self');
  redirectMessage(`/evaluations/self?assignment=${assignmentId}`, 'success', '자기평가를 재오픈했습니다.');
}
