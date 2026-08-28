'use server';

import { revalidatePath } from 'next/cache';
import { getEvaluationAccess, resolveActorEmployeeId, redirectMessage } from '@/lib/evaluation/access';
import { optionalText, requiredText } from '@/lib/hr/utils';

export async function createGrowthPlan(formData: FormData) {
  const { supabase, user } = await getEvaluationAccess();
  const actor = await resolveActorEmployeeId(supabase, user);

  const { error } = await supabase.from('growth_plans').insert({
    employee_id: requiredText(formData.get('employee_id')),
    source_assignment_id: optionalText(formData.get('source_assignment_id')),
    source_result_id: optionalText(formData.get('source_result_id')),
    competency: requiredText(formData.get('competency')),
    current_state: optionalText(formData.get('current_state')),
    expected_state: optionalText(formData.get('expected_state')),
    actions: requiredText(formData.get('actions')),
    leader_support: optionalText(formData.get('leader_support')),
    success_measure: optionalText(formData.get('success_measure')),
    due_date: optionalText(formData.get('due_date')),
    checkpoint_date: optionalText(formData.get('checkpoint_date')),
    status: 'planned',
    created_by: actor,
  });

  if (error) redirectMessage('/growth-plans', 'error', error.message);
  revalidatePath('/growth-plans');
  redirectMessage('/growth-plans', 'success', '성장계획을 생성했습니다.');
}

export async function updateGrowthPlanStatus(id:string, formData:FormData){
  const {supabase}=await getEvaluationAccess();
  const status=requiredText(formData.get('status'));
  const {error}=await supabase.from('growth_plans').update({status,updated_at:new Date().toISOString()}).eq('id',id);
  if(error)redirectMessage('/growth-plans','error',error.message);
  revalidatePath('/growth-plans');redirectMessage('/growth-plans','success','성장계획 상태를 변경했습니다.');
}

export async function addCheckpoint(planId:string,formData:FormData){
  const {supabase,user}=await getEvaluationAccess();const actor=await resolveActorEmployeeId(supabase,user);
  const {error}=await supabase.from('growth_plan_checkpoints').insert({growth_plan_id:planId,checkpoint_date:requiredText(formData.get('checkpoint_date')),progress_note:requiredText(formData.get('progress_note')),progress_percent:Number(formData.get('progress_percent')??0),created_by:actor});
  if(error)redirectMessage('/growth-plans','error',error.message);revalidatePath('/growth-plans');redirectMessage('/growth-plans','success','중간점검을 기록했습니다.');
}
