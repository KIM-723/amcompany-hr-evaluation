'use server';
import { revalidatePath } from 'next/cache';
import { getEvaluationAccess, resolveActorEmployeeId, redirectMessage } from '@/lib/evaluation/access';
import { optionalText } from '@/lib/hr/utils';

export async function reviewFirstEvaluation(evaluationId:string, assignmentId:string, formData:FormData){
  const {supabase,user}=await getEvaluationAccess();
  const reviewerId=await resolveActorEmployeeId(supabase,user);
  if(!reviewerId) redirectMessage(`/evaluations/second/${assignmentId}`,'error','검토자 정보를 확인할 수 없습니다.');
  const decision=String(formData.get('decision')??'approved');
  const responseId=String(formData.get('response_id')??'') || null;
  const {error}=await supabase.from('evaluation_review_items').insert({
    evaluation_id:evaluationId,response_id:responseId,reviewer_id:reviewerId,decision,
    review_comment:optionalText(formData.get('review_comment')),
    requested_score:formData.get('requested_score')?Number(formData.get('requested_score')):null,
  });
  if(error) redirectMessage(`/evaluations/second/${assignmentId}`,'error',error.message);

  const status=decision==='revision_requested'?'revision_requested':decision==='calibration_required'?'calibration_required':'approved';
  await supabase.from('evaluations').update({status,approved_at:status==='approved'?new Date().toISOString():null}).eq('id',evaluationId);
  await supabase.from('evaluation_assignments').update({status:decision==='calibration_required'?'calibration':'second_review',current_stage:decision==='calibration_required'?'calibration':'second'}).eq('id',assignmentId);
  revalidatePath(`/evaluations/second/${assignmentId}`);
  redirectMessage(`/evaluations/second/${assignmentId}`,'success','2차 검토 의견을 저장했습니다.');
}
