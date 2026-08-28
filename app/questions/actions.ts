'use server';

import { revalidatePath } from 'next/cache';
import { getEvaluationAccess, resolveActorEmployeeId, redirectMessage } from '@/lib/evaluation/access';
import { optionalText, requiredText, integerValue } from '@/lib/hr/utils';

export async function createTemplate(formData: FormData) {
  const { supabase, user } = await getEvaluationAccess();
  const actor = await resolveActorEmployeeId(supabase, user);
  const name = requiredText(formData.get('name'));
  if (!name) redirectMessage('/questions', 'error', 'Template 이름은 필수입니다.');

  const { error } = await supabase.from('evaluation_templates').insert({
    name,
    code: optionalText(formData.get('code')),
    description: optionalText(formData.get('description')),
    version: Math.max(1, integerValue(formData.get('version'), 1)),
    is_active: true,
    created_by: actor,
    updated_by: actor,
  });

  if (error) redirectMessage('/questions', 'error', error.message);
  revalidatePath('/questions');
  redirectMessage('/questions', 'success', '평가 Template을 생성했습니다.');
}

export async function createCategory(formData: FormData) {
  const { supabase } = await getEvaluationAccess();
  const templateId = requiredText(formData.get('template_id'));
  const name = requiredText(formData.get('name'));
  const code = requiredText(formData.get('code'));
  const weight = Number(formData.get('weight') ?? 0);

  const { error } = await supabase.from('evaluation_categories').insert({
    template_id: templateId,
    name,
    code,
    description: optionalText(formData.get('description')),
    weight: Number.isFinite(weight) ? weight : 0,
    sort_order: integerValue(formData.get('sort_order'), 0),
    is_required: true,
  });

  if (error) redirectMessage('/questions', 'error', error.message);
  revalidatePath('/questions');
  redirectMessage('/questions', 'success', '평가영역을 생성했습니다.');
}

export async function createQuestion(formData: FormData) {
  const { supabase } = await getEvaluationAccess();
  const templateId = requiredText(formData.get('template_id'));
  const categoryId = requiredText(formData.get('category_id'));

  const { data: question, error } = await supabase
    .from('evaluation_questions')
    .insert({
      template_id: templateId,
      category_id: categoryId,
      code: optionalText(formData.get('code')),
      competency: optionalText(formData.get('competency')),
      title: requiredText(formData.get('title')),
      question: requiredText(formData.get('question')),
      description: optionalText(formData.get('description')),
      behavior_examples: optionalText(formData.get('behavior_examples')),
      weight: Number(formData.get('weight') ?? 0),
      is_required: formData.get('is_required') === 'on',
      sort_order: integerValue(formData.get('sort_order'), 0),
      is_active: true,
    })
    .select('id')
    .single();

  if (error) redirectMessage('/questions', 'error', error.message);

  const coreValueIds = formData.getAll('core_value_ids').map(String).filter(Boolean);
  if (coreValueIds.length) {
    const { error: mappingError } = await supabase
      .from('evaluation_question_core_values')
      .insert(coreValueIds.map((coreValueId) => ({
        question_id: question.id,
        core_value_id: coreValueId,
      })));
    if (mappingError) redirectMessage('/questions', 'error', mappingError.message);
  }

  revalidatePath('/questions');
  redirectMessage('/questions', 'success', '평가문항을 생성했습니다.');
}

export async function updateQuestion(questionId: string, formData: FormData) {
  const { supabase } = await getEvaluationAccess();

  const { error } = await supabase
    .from('evaluation_questions')
    .update({
      competency: optionalText(formData.get('competency')),
      title: requiredText(formData.get('title')),
      question: requiredText(formData.get('question')),
      description: optionalText(formData.get('description')),
      behavior_examples: optionalText(formData.get('behavior_examples')),
      weight: Number(formData.get('weight') ?? 0),
      is_required: formData.get('is_required') === 'on',
      sort_order: integerValue(formData.get('sort_order'), 0),
      is_active: formData.get('is_active') === 'on',
      updated_at: new Date().toISOString(),
    })
    .eq('id', questionId);

  if (error) redirectMessage('/questions', 'error', error.message);

  await supabase.from('evaluation_question_job_levels').delete().eq('question_id', questionId);
  const levelIds = formData.getAll('apply_job_levels').map(String).filter(Boolean);
  if (levelIds.length) {
    await supabase.from('evaluation_question_job_levels').insert(
      levelIds.map((jobLevelId) => ({ question_id: questionId, job_level_id: jobLevelId })),
    );
  }

  await supabase.from('evaluation_question_positions').delete().eq('question_id', questionId);
  const positionIds = formData.getAll('apply_positions').map(String).filter(Boolean);
  if (positionIds.length) {
    await supabase.from('evaluation_question_positions').insert(
      positionIds.map((positionId) => ({ question_id: questionId, position_id: positionId })),
    );
  }

  for (const entry of formData.entries()) {
    const [key, value] = entry;
    if (!key.startsWith('standard_')) continue;
    const jobLevelId = key.replace('standard_', '');
    const expected = typeof value === 'string' ? value.trim() : '';
    if (!expected) continue;
    await supabase.from('evaluation_question_standards').upsert(
      {
        question_id: questionId,
        job_level_id: jobLevelId,
        expected_behavior: expected,
      },
      { onConflict: 'question_id,job_level_id' },
    );
  }

  revalidatePath('/questions');
  redirectMessage('/questions', 'success', '평가문항과 직급별 기준을 수정했습니다.');
}
