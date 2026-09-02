'use server';

import { revalidatePath } from 'next/cache';
import {
  getEvaluationAccess,
  redirectMessage,
  resolveActorEmployeeId,
} from '@/lib/evaluation/access';
import { firstRelation } from '@/lib/diagnosis/utils';
import {
  analyzeCoreValues,
  calculateOverallScore,
  CORE_VALUE_PROMPT_VERSION,
} from '@/lib/ai/core-value-analysis';

function isAdmin(roles: readonly string[]) {
  return roles.some((role) => ['hr_admin', 'super_admin'].includes(role));
}

function safeReturnTo(value: string) {
  return value.startsWith('/diagnoses/ai-dashboard')
    ? value
    : '/diagnoses/ai-dashboard';
}

async function analyzeAndSave(
  supabase: any,
  actorId: string | null,
  diagnosisId: string,
) {
  const { data: diagnosis, error } = await supabase
    .from('personnel_diagnoses')
    .select(
      'id,period_id,employee_id,status,diagnosis_summary,growth_points,growth_directions,other_comment,updated_at,employees:employees!personnel_diagnoses_employee_id_fkey(departments(name),job_levels(name),positions(name))',
    )
    .eq('id', diagnosisId)
    .single();

  if (error || !diagnosis) {
    throw new Error(error?.message ?? '인사진단을 찾을 수 없습니다.');
  }

  if (diagnosis.status !== 'completed') {
    throw new Error(
      'AI 핵심가치 분석은 인사진단이 최종 완료된 뒤 실행할 수 있습니다.',
    );
  }

  const employee = firstRelation(diagnosis.employees);
  const department = firstRelation(employee?.departments);
  const jobLevel = firstRelation(employee?.job_levels);
  const position = firstRelation(employee?.positions);

  const { result, model, responseId } = await analyzeCoreValues({
    diagnosis_id: diagnosis.id,
    department: department?.name ?? '',
    job_level: jobLevel?.name ?? '',
    position: position?.name ?? '',
    diagnosis_summary: diagnosis.diagnosis_summary,
    growth_points: diagnosis.growth_points,
    growth_directions: diagnosis.growth_directions,
    other_comment: diagnosis.other_comment,
  });

  const overallScore = calculateOverallScore(result);

  const { data: current } = await supabase
    .from('core_value_ai_analyses')
    .select('analysis_revision')
    .eq('diagnosis_id', diagnosis.id)
    .maybeSingle();

  const analysisRevision = Number(current?.analysis_revision ?? 0) + 1;

  const { error: saveError } = await supabase
    .from('core_value_ai_analyses')
    .upsert(
      {
        diagnosis_id: diagnosis.id,
        period_id: diagnosis.period_id,
        employee_id: diagnosis.employee_id,

        growth_score: result.values.growth.score,
        trust_score: result.values.trust.score,
        professionalism_score: result.values.professionalism.score,
        sense_score: result.values.sense.score,
        overall_alignment_score: overallScore,

        core_values: result.values,
        strengths: result.strengths,
        growth_areas: result.growth_areas,
        overall_summary: result.overall_summary,
        recommended_actions: result.recommended_actions,

        analysis_revision: analysisRevision,
        prompt_version: CORE_VALUE_PROMPT_VERSION,
        model,
        openai_response_id: responseId,
        source_diagnosis_updated_at: diagnosis.updated_at,
        analyzed_by: actorId,
        analyzed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'diagnosis_id',
      },
    );

  if (saveError) {
    throw new Error(saveError.message);
  }

  return result;
}

export async function analyzeDiagnosisAction(
  diagnosisId: string,
  returnTo = '/diagnoses/ai-dashboard',
) {
  const target = safeReturnTo(returnTo);
  const { supabase, user } = await getEvaluationAccess();

  if (!isAdmin(user.roles)) {
    redirectMessage(target, 'error', 'AI 분석은 HR 관리자만 실행할 수 있습니다.');
  }

  const actorId = await resolveActorEmployeeId(supabase, user);

  try {
    await analyzeAndSave(supabase, actorId, diagnosisId);
  } catch (error) {
    redirectMessage(
      target,
      'error',
      error instanceof Error ? error.message : 'AI 분석 중 오류가 발생했습니다.',
    );
  }

  revalidatePath('/diagnoses/ai-dashboard');
  revalidatePath(`/diagnoses/ai-dashboard/${diagnosisId}`);

  redirectMessage(target, 'success', 'AI 핵심가치 분석을 완료했습니다.');
}

export async function analyzePeriodBatchAction(
  periodId: string,
  returnTo = '/diagnoses/ai-dashboard',
) {
  const target = safeReturnTo(returnTo);
  const { supabase, user } = await getEvaluationAccess();

  if (!isAdmin(user.roles)) {
    redirectMessage(target, 'error', 'AI 분석은 HR 관리자만 실행할 수 있습니다.');
  }

  const actorId = await resolveActorEmployeeId(supabase, user);

  const [
    { data: diagnoses, error: diagnosisError },
    { data: analyses, error: analysisError },
  ] = await Promise.all([
    supabase
      .from('personnel_diagnoses')
      .select('id,updated_at')
      .eq('period_id', periodId)
      .eq('status', 'completed')
      .order('updated_at', { ascending: true }),
    supabase
      .from('core_value_ai_analyses')
      .select('diagnosis_id,source_diagnosis_updated_at')
      .eq('period_id', periodId),
  ]);

  const initialError = diagnosisError || analysisError;

  if (initialError) {
    redirectMessage(target, 'error', initialError.message);
  }

  const analysisMap = new Map(
    (analyses ?? []).map((analysis: any) => [
      analysis.diagnosis_id,
      analysis.source_diagnosis_updated_at,
    ]),
  );

  const pending = (diagnoses ?? []).filter((diagnosis: any) => {
    const analyzedSource = analysisMap.get(diagnosis.id);
    return !analyzedSource || analyzedSource !== diagnosis.updated_at;
  });

  if (pending.length === 0) {
    redirectMessage(
      target,
      'success',
      '현재 평가기간의 모든 최종 진단이 최신 AI 분석 상태입니다.',
    );
  }

  // Server Action 실행시간을 안정적으로 관리하기 위해 한 번에 최대 5명.
  const batch = pending.slice(0, 5);
  let completed = 0;
  const errors: string[] = [];

  for (const diagnosis of batch) {
    try {
      await analyzeAndSave(supabase, actorId, diagnosis.id);
      completed += 1;
    } catch (error) {
      errors.push(
        error instanceof Error ? error.message : '알 수 없는 분석 오류',
      );
    }
  }

  revalidatePath('/diagnoses/ai-dashboard');

  if (errors.length > 0) {
    redirectMessage(
      target,
      'error',
      `${completed}명 분석 완료 · ${errors.length}명 오류 · ${errors[0]}`,
    );
  }

  const remaining = Math.max(0, pending.length - completed);

  redirectMessage(
    target,
    'success',
    remaining > 0
      ? `${completed}명 AI 분석 완료 · 아직 ${remaining}명이 남았습니다. 버튼을 다시 누르면 계속 분석합니다.`
      : `${completed}명 AI 분석을 모두 완료했습니다.`,
  );
}
export type AIAnalysisProgressResult = {
  ok: boolean;
  message: string;
};

export async function analyzeDiagnosisProgressAction(
  diagnosisId: string,
): Promise<AIAnalysisProgressResult> {
  const { supabase, user } = await getEvaluationAccess();

  if (!isAdmin(user.roles)) {
    return {
      ok: false,
      message: 'AI 분석은 HR 관리자만 실행할 수 있습니다.',
    };
  }

  const actorId = await resolveActorEmployeeId(supabase, user);

  try {
    await analyzeAndSave(supabase, actorId, diagnosisId);

    revalidatePath('/diagnoses/ai-dashboard');
    revalidatePath(`/diagnoses/ai-dashboard/${diagnosisId}`);

    return {
      ok: true,
      message: 'AI 핵심가치 분석을 완료했습니다.',
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : 'AI 분석 중 오류가 발생했습니다.',
    };
  }
}
