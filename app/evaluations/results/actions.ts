'use server';
import {revalidatePath} from 'next/cache';
import {getEvaluationAccess,resolveActorEmployeeId,redirectMessage} from '@/lib/evaluation/access';

export async function finalizeResult(assignmentId:string){
 const {supabase,user}=await getEvaluationAccess();if(!user.roles.some(r=>['hr_admin','super_admin'].includes(r))) redirectMessage('/evaluations/results','error','결과 확정 권한이 없습니다.');const actor=await resolveActorEmployeeId(supabase,user);
 const {error}=await supabase.rpc('finalize_assignment_result',{p_assignment_id:assignmentId,p_actor_id:actor});
 if(error)redirectMessage('/evaluations/results','error',error.message);
 revalidatePath('/evaluations/results');redirectMessage('/evaluations/results','success','평가결과를 확정/재계산했습니다.');
}
export async function releaseResult(resultId:string){
 const {supabase,user}=await getEvaluationAccess();if(!user.roles.some(r=>['hr_admin','super_admin'].includes(r))) redirectMessage('/evaluations/results','error','결과 공개 권한이 없습니다.');const {error}=await supabase.from('evaluation_results').update({is_released:true,released_at:new Date().toISOString()}).eq('id',resultId);
 if(error)redirectMessage('/evaluations/results','error',error.message);revalidatePath('/evaluations/results');redirectMessage('/evaluations/results','success','결과를 공개했습니다.');
}
