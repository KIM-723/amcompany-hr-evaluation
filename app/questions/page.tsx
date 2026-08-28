import { PageShell } from '@/components/ui/PageShell';
import { Card } from '@/components/ui/Card';
import { Notice } from '@/components/hr/Notice';
import { createCategory, createQuestion, createTemplate, updateQuestion } from './actions';
import { getEvaluationAccess } from '@/lib/evaluation/access';
import { stringParam } from '@/lib/hr/utils';

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function QuestionsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const { supabase } = await getEvaluationAccess();

  const [
    { data: templates },
    { data: categories },
    { data: questions },
    { data: jobLevels },
    { data: coreValues },
    { data: standards },
    { data: positions },
    { data: questionLevels },
    { data: questionPositions },
  ] = await Promise.all([
    supabase.from('evaluation_templates').select('*').order('created_at'),
    supabase.from('evaluation_categories').select('*').order('sort_order'),
    supabase.from('evaluation_questions').select('*').order('sort_order'),
    supabase.from('job_levels').select('id,name').eq('is_active', true).order('level_order'),
    supabase.from('core_values').select('id,name').eq('is_active', true).order('sort_order'),
    supabase.from('evaluation_question_standards').select('*'),
    supabase.from('positions').select('id,name').eq('is_active', true).order('sort_order'),
    supabase.from('evaluation_question_job_levels').select('*'),
    supabase.from('evaluation_question_positions').select('*'),
  ]);

  const selectedTemplate = stringParam(sp.template) || templates?.[0]?.id || '';
  const templateCategories = (categories ?? []).filter((x) => x.template_id === selectedTemplate);
  const templateQuestions = (questions ?? []).filter((x) => x.template_id === selectedTemplate);

  return (
    <PageShell
      title="평가문항"
      description="성과·역량·태도&습관·리더십 문항과 직급별 기대행동, 핵심가치를 관리합니다."
    >
      <Notice success={stringParam(sp.success)} error={stringParam(sp.error)} />

      <Card>
        <form className="flex flex-wrap items-end gap-3">
          <label className="text-sm font-semibold">
            Template
            <select name="template" defaultValue={selectedTemplate} className="ml-3 rounded-lg border px-3 py-2">
              {(templates ?? []).map((t) => <option key={t.id} value={t.id}>{t.name} v{t.version}</option>)}
            </select>
          </label>
          <button className="rounded-lg border px-4 py-2 text-sm font-semibold">조회</button>
        </form>
      </Card>

      <div className="grid gap-5 xl:grid-cols-3">
        <Card>
          <h2 className="font-bold">Template 생성</h2>
          <form action={createTemplate} className="mt-4 space-y-3">
            <input name="name" required placeholder="Template명" className="w-full rounded-lg border px-3 py-2" />
            <input name="code" placeholder="코드 (예: AM_2027)" className="w-full rounded-lg border px-3 py-2" />
            <input name="version" type="number" min="1" defaultValue="1" className="w-full rounded-lg border px-3 py-2" />
            <textarea name="description" placeholder="설명" className="w-full rounded-lg border px-3 py-2" />
            <button className="w-full rounded-lg bg-navy-900 px-4 py-2 text-sm font-semibold text-white">생성</button>
          </form>
        </Card>

        <Card>
          <h2 className="font-bold">평가영역 생성</h2>
          <form action={createCategory} className="mt-4 space-y-3">
            <select name="template_id" required defaultValue={selectedTemplate} className="w-full rounded-lg border px-3 py-2">
              {(templates ?? []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <input name="name" required placeholder="예: 성과" className="w-full rounded-lg border px-3 py-2" />
            <input name="code" required placeholder="performance" className="w-full rounded-lg border px-3 py-2" />
            <input name="weight" type="number" min="0" max="100" step="0.1" placeholder="가중치" className="w-full rounded-lg border px-3 py-2" />
            <input name="sort_order" type="number" defaultValue="0" className="w-full rounded-lg border px-3 py-2" />
            <button className="w-full rounded-lg bg-navy-900 px-4 py-2 text-sm font-semibold text-white">생성</button>
          </form>
        </Card>

        <Card>
          <h2 className="font-bold">문항 생성</h2>
          <form action={createQuestion} className="mt-4 space-y-3">
            <input type="hidden" name="template_id" value={selectedTemplate} />
            <select name="category_id" required className="w-full rounded-lg border px-3 py-2">
              <option value="">평가영역 선택</option>
              {templateCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input name="title" required placeholder="문항명" className="w-full rounded-lg border px-3 py-2" />
            <input name="competency" placeholder="세부 역량" className="w-full rounded-lg border px-3 py-2" />
            <textarea name="question" required placeholder="질문" className="w-full rounded-lg border px-3 py-2" />
            <textarea name="behavior_examples" placeholder="행동예시" className="w-full rounded-lg border px-3 py-2" />
            <input name="weight" type="number" min="0" max="100" step="0.1" placeholder="가중치" className="w-full rounded-lg border px-3 py-2" />
            <div className="grid grid-cols-2 gap-2">
              {(coreValues ?? []).map((cv) => (
                <label key={cv.id} className="text-xs"><input type="checkbox" name="core_value_ids" value={cv.id} /> {cv.name}</label>
              ))}
            </div>
            <label className="text-sm"><input type="checkbox" name="is_required" defaultChecked /> 필수 문항</label>
            <button className="w-full rounded-lg bg-navy-900 px-4 py-2 text-sm font-semibold text-white">문항 생성</button>
          </form>
        </Card>
      </div>

      <div className="space-y-4">
        {templateQuestions.map((q) => {
          const category = templateCategories.find((c) => c.id === q.category_id);
          return (
            <Card key={q.id}>
              <form action={updateQuestion.bind(null, q.id)} className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">{category?.name ?? '-'}</span>
                  <input name="title" defaultValue={q.title} className="min-w-72 flex-1 rounded-lg border px-3 py-2 font-semibold" />
                  <input name="competency" defaultValue={q.competency ?? ''} placeholder="세부역량" className="rounded-lg border px-3 py-2" />
                  <input name="weight" type="number" defaultValue={q.weight} className="w-24 rounded-lg border px-3 py-2" />
                </div>
                <textarea name="question" defaultValue={q.question} className="w-full rounded-lg border px-3 py-2" />
                <textarea name="description" defaultValue={q.description ?? ''} placeholder="설명" className="w-full rounded-lg border px-3 py-2" />
                <textarea name="behavior_examples" defaultValue={q.behavior_examples ?? ''} placeholder="행동예시" className="w-full rounded-lg border px-3 py-2" />
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <div className="mb-2 text-xs font-bold text-slate-600">적용 직급</div>
                    <div className="flex flex-wrap gap-3">
                      {(jobLevels ?? []).map((jl) => (
                        <label key={jl.id} className="text-xs">
                          <input
                            type="checkbox"
                            name="apply_job_levels"
                            value={jl.id}
                            defaultChecked={(questionLevels ?? []).some((x:any)=>x.question_id===q.id&&x.job_level_id===jl.id)}
                          /> {jl.name}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="mb-2 text-xs font-bold text-slate-600">적용 직책</div>
                    <div className="flex flex-wrap gap-3">
                      {(positions ?? []).map((pos) => (
                        <label key={pos.id} className="text-xs">
                          <input
                            type="checkbox"
                            name="apply_positions"
                            value={pos.id}
                            defaultChecked={(questionPositions ?? []).some((x:any)=>x.question_id===q.id&&x.position_id===pos.id)}
                          /> {pos.name}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-5">
                  {(jobLevels ?? []).map((jl) => {
                    const standard = (standards ?? []).find((s) => s.question_id === q.id && s.job_level_id === jl.id);
                    return (
                      <label key={jl.id} className="text-xs font-semibold text-slate-600">
                        {jl.name}
                        <textarea
                          name={`standard_${jl.id}`}
                          defaultValue={standard?.expected_behavior ?? ''}
                          className="mt-1 h-28 w-full rounded-lg border px-2 py-2 text-xs font-normal"
                        />
                      </label>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-x-4 text-sm">
                    <label><input type="checkbox" name="is_required" defaultChecked={q.is_required} /> 필수</label>
                    <label><input type="checkbox" name="is_active" defaultChecked={q.is_active} /> 활성</label>
                  </div>
                  <button className="rounded-lg border px-4 py-2 text-sm font-semibold">저장</button>
                </div>
              </form>
            </Card>
          );
        })}
      </div>
    </PageShell>
  );
}
