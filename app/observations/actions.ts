'use server';

import { revalidatePath } from 'next/cache';
import { getEvaluationAccess, resolveActorEmployeeId, redirectMessage } from '@/lib/evaluation/access';
import { optionalText, requiredText } from '@/lib/hr/utils';

export async function createObservation(formData: FormData) {
  const { supabase, user } = await getEvaluationAccess();
  const observerId = await resolveActorEmployeeId(supabase, user);
  if (!observerId) redirectMessage('/observations', 'error', '관찰자 직원정보를 확인할 수 없습니다.');

  const { error } = await supabase.from('observation_logs').insert({
    observer_id: observerId,
    subject_employee_id: requiredText(formData.get('subject_employee_id')),
    observed_date: requiredText(formData.get('observed_date')),
    related_work: optionalText(formData.get('related_work')),
    work_context: optionalText(formData.get('work_context')),
    situation: requiredText(formData.get('situation')),
    behavior: requiredText(formData.get('behavior')),
    impact_result: requiredText(formData.get('impact_result')),
    sentiment: requiredText(formData.get('sentiment')),
    core_value_id: optionalText(formData.get('core_value_id')),
    question_id: optionalText(formData.get('question_id')),
    period_id: optionalText(formData.get('period_id')),
    visibility: 'evaluator_hr',
  });

  if (error) redirectMessage('/observations', 'error', error.message);
  revalidatePath('/observations');
  redirectMessage('/observations', 'success', '관찰일지를 등록했습니다.');
}

export async function archiveObservation(id: string) {
  const { supabase } = await getEvaluationAccess();
  const { error } = await supabase.from('observation_logs').update({ is_archived: true }).eq('id', id);
  if (error) redirectMessage('/observations', 'error', error.message);
  revalidatePath('/observations');
  redirectMessage('/observations', 'success', '관찰일지를 보관 처리했습니다.');
}


export async function updateObservation(id: string, formData: FormData) {
  const { supabase } = await getEvaluationAccess();
  const { error } = await supabase.from('observation_logs').update({
    observed_date: requiredText(formData.get('observed_date')),
    related_work: optionalText(formData.get('related_work')),
    situation: requiredText(formData.get('situation')),
    behavior: requiredText(formData.get('behavior')),
    impact_result: requiredText(formData.get('impact_result')),
    sentiment: requiredText(formData.get('sentiment')),
    core_value_id: optionalText(formData.get('core_value_id')),
    question_id: optionalText(formData.get('question_id')),
    updated_at: new Date().toISOString(),
  }).eq('id', id);
  if (error) redirectMessage(`/observations/${id}`, 'error', error.message);
  revalidatePath('/observations');
  redirectMessage('/observations', 'success', '관찰일지를 수정했습니다.');
}
