'use server';

import { revalidatePath } from 'next/cache';
import { getEvaluationAccess, resolveActorEmployeeId, redirectMessage } from '@/lib/evaluation/access';
import { optionalText } from '@/lib/hr/utils';

export async function startFirstEvaluation(assignmentId: string) {
  const { supabase, user } = await getEvaluationAccess();
  let evaluatorId = await resolveActorEmployeeId(supabase, user);

  const { data: assignment } = await supabase
    .from('evaluation_assignments')
    .select('first_evaluator_id')
    .eq('id', assignmentId)
    .single();

  evaluatorId = assignment?.first_evaluator_id ?? evaluatorId;
  if (!evaluatorId) {
    redirectMessage('/evaluations/first', 'error', '1차 평가자를 확인할 수 없습니다.');
  }

  const { error } = await supabase.from('evaluations').upsert(
    {
      assignment_id: assignmentId,
      evaluator_id: evaluatorId,
      stage: 'first',
      status: 'draft',
    },
    { onConflict: 'assignment_id,evaluator_id,stage' },
  );

  if (error) {
    redirectMessage('/evaluations/first', 'error', error.message);
  }

  await supabase
    .from('evaluation_assignments')
    .update({ status: 'first_in_progress', current_stage: 'first' })
    .eq('id', assignmentId);

  revalidatePath('/evaluations/first');
  redirectMessage(`/evaluations/first/${assignmentId}`, 'success', '1차 평가를 시작했습니다.');
}

export async function saveFirstEvaluation(assignmentId: string, formData: FormData) {
  const { supabase } = await getEvaluationAccess();
  const evaluationId = String(formData.get('evaluation_id') ?? '');
  const intent = String(formData.get('intent') ?? 'save');

  const questionIds = formData.getAll('question_ids').map(String).filter(Boolean);

  const { data: questions, error: questionError } = await supabase
    .from('evaluation_questions')
    .select('id,title,question,weight')
    .in('id', questionIds);

  if (questionError) {
    redirectMessage(`/evaluations/first/${assignmentId}`, 'error', questionError.message);
  }

  for (const q of questions ?? []) {
    const score = Number(formData.get(`score_${q.id}`));
    const comment = optionalText(formData.get(`comment_${q.id}`));
    const evidenceNote = optionalText(formData.get(`evidence_${q.id}`));

    if (!score || score < 1 || score > 5) {
      redirectMessage(
        `/evaluations/first/${assignmentId}`,
        'error',
        `${q.title}: 1~5점 점수를 입력해주세요.`,
      );
    }

    if ((score === 1 || score === 5) && !evidenceNote) {
      redirectMessage(
        `/evaluations/first/${assignmentId}`,
        'error',
        `${q.title}: 1점/5점은 근거가 필수입니다.`,
      );
    }

    const { data: response, error } = await supabase
      .from('evaluation_responses')
      .upsert(
        {
          evaluation_id: evaluationId,
          question_id: q.id,
          question_snapshot: q,
          score,
          comment,
          evidence_note: evidenceNote,
          evidence_required: score === 1 || score === 5,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'evaluation_id,question_id' },
      )
      .select('id')
      .single();

    if (error) {
      redirectMessage(`/evaluations/first/${assignmentId}`, 'error', error.message);
    }

    if (!response) {
      redirectMessage(
        `/evaluations/first/${assignmentId}`,
        'error',
        `${q.title}: 평가응답 저장 결과를 확인할 수 없습니다.`,
      );
    }

    const observationId = optionalText(formData.get(`observation_${q.id}`));

    if (observationId) {
      const { data: evaluation, error: evaluationError } = await supabase
        .from('evaluations')
        .select('evaluator_id')
        .eq('id', evaluationId)
        .single();

      if (evaluationError) {
        redirectMessage(
          `/evaluations/first/${assignmentId}`,
          'error',
          evaluationError.message,
        );
      }

      const { error: evidenceError } = await supabase
        .from('evaluation_evidence_links')
        .upsert(
          {
            response_id: response.id,
            observation_log_id: observationId,
            linked_by: evaluation?.evaluator_id ?? null,
          },
          { onConflict: 'response_id,observation_log_id' },
        );

      if (evidenceError) {
        redirectMessage(
          `/evaluations/first/${assignmentId}`,
          'error',
          evidenceError.message,
        );
      }
    }
  }

  const scores = (questions ?? [])
    .map((q) => Number(formData.get(`score_${q.id}`)))
    .filter((value) => Number.isFinite(value));

  const totalScore = scores.length
    ? scores.reduce((sum, value) => sum + value, 0) / scores.length
    : null;

  const status = intent === 'submit' ? 'submitted' : 'draft';

  const { error: evaluationError } = await supabase
    .from('evaluations')
    .update({
      status,
      strengths: optionalText(formData.get('strengths')),
      improvements: optionalText(formData.get('improvements')),
      next_expectations: optionalText(formData.get('next_expectations')),
      total_score: totalScore,
      submitted_at: intent === 'submit' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', evaluationId);

  if (evaluationError) {
    redirectMessage(`/evaluations/first/${assignmentId}`, 'error', evaluationError.message);
  }

  if (intent === 'submit') {
    const { error: assignmentError } = await supabase
      .from('evaluation_assignments')
      .update({ status: 'first_submitted', current_stage: 'second' })
      .eq('id', assignmentId);

    if (assignmentError) {
      redirectMessage(`/evaluations/first/${assignmentId}`, 'error', assignmentError.message);
    }
  }

  revalidatePath(`/evaluations/first/${assignmentId}`);
  redirectMessage(
    `/evaluations/first/${assignmentId}`,
    'success',
    intent === 'submit' ? '1차 평가를 제출했습니다.' : '1차 평가를 저장했습니다.',
  );
}
