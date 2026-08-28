import Link from 'next/link';
import { PageShell } from '@/components/ui/PageShell';
import { Card } from '@/components/ui/Card';
import { Notice } from '@/components/hr/Notice';
import { createObservation, archiveObservation } from './actions';
import { getEvaluationAccess } from '@/lib/evaluation/access';
import { stringParam } from '@/lib/hr/utils';

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function ObservationsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const { supabase } = await getEvaluationAccess();
  const subject = stringParam(sp.subject);
  const period = stringParam(sp.period);
  const sentiment = stringParam(sp.sentiment);

  const [
    { data: employees },
    { data: periods },
    { data: coreValues },
    { data: questions },
  ] = await Promise.all([
    supabase.from('employees').select('id,employee_no,name').neq('employment_status', 'resigned').order('employee_no'),
    supabase.from('evaluation_periods').select('id,name').order('start_date', { ascending: false }),
    supabase.from('core_values').select('id,name').eq('is_active', true).order('sort_order'),
    supabase.from('evaluation_questions').select('id,title').eq('is_active', true).order('sort_order'),
  ]);

  let query = supabase
    .from('observation_logs')
    .select('id,observed_date,subject_employee_id,related_work,situation,behavior,impact_result,sentiment,core_value_id,question_id,period_id')
    .eq('is_archived', false)
    .order('observed_date', { ascending: false })
    .limit(100);
  if (subject) query = query.eq('subject_employee_id', subject);
  if (period) query = query.eq('period_id', period);
  if (sentiment) query = query.eq('sentiment', sentiment);
  const { data: logs, error } = await query;

  const employeeMap = new Map<string, any>((employees ?? []).map((e:any) => [e.id, e]));
  const coreMap = new Map<string, string>((coreValues ?? []).map((x:any) => [x.id, x.name]));
  const questionMap = new Map<string, string>((questions ?? []).map((x:any) => [x.id, x.title]));

  return (
    <PageShell title="관찰일지" description="SBI 방식으로 실제 업무행동과 결과를 기록하여 평가 Evidence로 활용합니다.">
      <Notice success={stringParam(sp.success)} error={stringParam(sp.error) || error?.message} />

      <Card>
        <h2 className="font-bold">SBI 관찰 등록</h2>
        <form action={createObservation} className="mt-4 grid gap-4 lg:grid-cols-3">
          <label className="text-sm">날짜<input type="date" name="observed_date" required defaultValue={new Date().toISOString().slice(0,10)} className="mt-1 w-full rounded-lg border px-3 py-2"/></label>
          <label className="text-sm">대상자<select name="subject_employee_id" required className="mt-1 w-full rounded-lg border px-3 py-2"><option value="">선택</option>{(employees ?? []).map(e=><option key={e.id} value={e.id}>{e.employee_no} · {e.name}</option>)}</select></label>
          <label className="text-sm">평가기간<select name="period_id" className="mt-1 w-full rounded-lg border px-3 py-2"><option value="">미지정</option>{(periods ?? []).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
          <label className="text-sm lg:col-span-2">관련 업무<input name="related_work" placeholder="예: 2026 원가 데이터 표준화" className="mt-1 w-full rounded-lg border px-3 py-2"/></label>
          <label className="text-sm">긍정/개선<select name="sentiment" required className="mt-1 w-full rounded-lg border px-3 py-2"><option value="positive">긍정</option><option value="improvement">개선 필요</option></select></label>
          <label className="text-sm lg:col-span-3">Situation<textarea name="situation" required className="mt-1 w-full rounded-lg border px-3 py-2" placeholder="어떤 상황이었는가?"/></label>
          <label className="text-sm lg:col-span-3">Behavior<textarea name="behavior" required className="mt-1 w-full rounded-lg border px-3 py-2" placeholder="대상자가 실제로 무엇을 했는가?"/></label>
          <label className="text-sm lg:col-span-3">Impact / Result<textarea name="impact_result" required className="mt-1 w-full rounded-lg border px-3 py-2" placeholder="행동이 어떤 결과/영향을 만들었는가?"/></label>
          <label className="text-sm">핵심가치<select name="core_value_id" className="mt-1 w-full rounded-lg border px-3 py-2"><option value="">미지정</option>{(coreValues ?? []).map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</select></label>
          <label className="text-sm lg:col-span-2">평가항목<select name="question_id" className="mt-1 w-full rounded-lg border px-3 py-2"><option value="">미지정</option>{(questions ?? []).map(q=><option key={q.id} value={q.id}>{q.title}</option>)}</select></label>
          <div className="lg:col-span-3 flex justify-end"><button className="rounded-lg bg-navy-900 px-5 py-2.5 text-sm font-semibold text-white">관찰 등록</button></div>
        </form>
      </Card>

      <Card>
        <form className="grid gap-3 md:grid-cols-4">
          <select name="subject" defaultValue={subject} className="rounded-lg border px-3 py-2"><option value="">전체 대상자</option>{(employees ?? []).map(e=><option key={e.id} value={e.id}>{e.name}</option>)}</select>
          <select name="period" defaultValue={period} className="rounded-lg border px-3 py-2"><option value="">전체 평가기간</option>{(periods ?? []).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>
          <select name="sentiment" defaultValue={sentiment} className="rounded-lg border px-3 py-2"><option value="">전체 유형</option><option value="positive">긍정</option><option value="improvement">개선 필요</option></select>
          <button className="rounded-lg border px-4 py-2 font-semibold">Filter</button>
        </form>
      </Card>

      <div className="space-y-3">
        {(logs ?? []).map(log => (
          <Card key={log.id}>
            <div className="flex justify-between gap-4">
              <div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="font-semibold">{log.observed_date}</span>
                  <span>{employeeMap.get(log.subject_employee_id)?.name ?? '-'}</span>
                  <span className={log.sentiment === 'positive' ? 'text-emerald-700' : 'text-amber-700'}>{log.sentiment === 'positive' ? '긍정' : '개선 필요'}</span>
                  {log.core_value_id && <span>{coreMap.get(log.core_value_id)}</span>}
                  {log.question_id && <span>{questionMap.get(log.question_id)}</span>}
                </div>
                {log.related_work && <div className="mt-2 text-sm font-semibold">{log.related_work}</div>}
                <div className="mt-3 grid gap-3 md:grid-cols-3 text-sm"><div><b>S</b><p>{log.situation}</p></div><div><b>B</b><p>{log.behavior}</p></div><div><b>I/R</b><p>{log.impact_result}</p></div></div>
              </div>
              <div className="flex gap-2"><Link href={`/observations/${log.id}`} className="text-xs text-blue-600">수정</Link><form action={archiveObservation.bind(null, log.id)}><button className="text-xs text-slate-400">보관</button></form></div>
            </div>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}
