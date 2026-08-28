import { PageShell } from '@/components/ui/PageShell';
import { Card } from '@/components/ui/Card';
import { Notice } from '@/components/hr/Notice';
import { ScoreSelect } from '@/components/evaluation/ScoreSelect';
import { saveSelfEvaluation, reopenSelfEvaluation } from './actions';
import { getEvaluationAccess, resolveActorEmployeeId } from '@/lib/evaluation/access';
import { stringParam } from '@/lib/hr/utils';

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function SelfEvaluationPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const { supabase, user, forced } = await getEvaluationAccess();
  const actorId = await resolveActorEmployeeId(supabase, user);
  const selected = stringParam(sp.assignment);

  let query = supabase.from('evaluation_assignments').select('id,period_id,employee_id,status,current_stage').order('assigned_at', { ascending: false });
  if (!forced && actorId) query = query.eq('employee_id', actorId);
  const { data: assignments } = await query;

  const employeeIds = [...new Set((assignments ?? []).map(a => a.employee_id))];
  const periodIds = [...new Set((assignments ?? []).map(a => a.period_id))];
  const [{ data: employees }, { data: periods }] = await Promise.all([
    employeeIds.length ? supabase.from('employees').select('id,employee_no,name').in('id', employeeIds) : Promise.resolve({ data: [] as any[] }),
    periodIds.length ? supabase.from('evaluation_periods').select('id,name').in('id', periodIds) : Promise.resolve({ data: [] as any[] }),
  ]);
  const em = new Map<string, any>((employees ?? []).map((x:any) => [x.id, x]));
  const pm = new Map<string, string>((periods ?? []).map((x:any) => [x.id, x.name]));
  const assignmentId = selected || assignments?.[0]?.id || '';
  const assignment = (assignments ?? []).find(a => a.id === assignmentId);
  const { data: self } = assignmentId
    ? await supabase.from('self_evaluations').select('*').eq('assignment_id', assignmentId).maybeSingle()
    : { data: null };

  const locked = self?.status === 'submitted';
  const canReopen = user.roles.some((r) => ['hr_admin','super_admin'].includes(r));

  return (
    <PageShell title="자기평가" description="자기평가는 평가자 판단과 비교하기 위한 진단자료이며 최종점수에는 직접 반영하지 않습니다.">
      <Notice success={stringParam(sp.success)} error={stringParam(sp.error)} />
      <Card>
        <form className="flex gap-3">
          <select name="assignment" defaultValue={assignmentId} className="min-w-80 rounded-lg border px-3 py-2">
            {(assignments ?? []).map(a => <option key={a.id} value={a.id}>{pm.get(a.period_id)} · {em.get(a.employee_id)?.name ?? '-'} · {a.status}</option>)}
          </select>
          <button className="rounded-lg border px-4 py-2 font-semibold">조회</button>
        </form>
      </Card>

      {!assignment ? (
        <Card><div className="py-12 text-center text-slate-500">작성 가능한 평가가 없습니다.</div></Card>
      ) : (
        <Card>
          <form action={saveSelfEvaluation.bind(null, assignment.id)} className="space-y-5">
            {[
              ['achievements','주요 성과'],
              ['growth_area','가장 성장한 부분'],
              ['gaps','부족했던 부분'],
              ['next_improvement','다음 기간 개선영역'],
              ['support_needed','회사 또는 리더에게 필요한 지원'],
            ].map(([name,label]) => (
              <label key={name} className="block text-sm font-semibold">{label}<textarea name={name} disabled={locked} defaultValue={self?.[name] ?? ''} className="mt-1 min-h-24 w-full rounded-lg border px-3 py-2 disabled:bg-slate-50"/></label>
            ))}
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-sm font-semibold">성과 자기점수<ScoreSelect name="performance_score" defaultValue={self?.performance_score} /></label>
              <label className="text-sm font-semibold">역량 자기점수<ScoreSelect name="competency_score" defaultValue={self?.competency_score} /></label>
            </div>
            <div>
              <div className="mb-2 text-sm font-semibold">핵심가치 자기평가</div>
              <div className="grid gap-3 md:grid-cols-4">
                {[
                  ['core_growth','성장'],
                  ['core_trust','신뢰'],
                  ['core_professionalism','전문성'],
                  ['core_sense','감각'],
                ].map(([name,label]) => (
                  <label key={name} className="text-xs font-semibold">{label}<ScoreSelect name={name} defaultValue={self?.core_value_scores?.[label]} /></label>
                ))}
              </div>
            </div>
            {locked ? (
              <div className="flex items-center justify-between rounded-lg bg-slate-50 p-4 text-sm text-slate-500"><span>제출 완료되어 수정할 수 없습니다.</span>{canReopen&&<button formAction={reopenSelfEvaluation.bind(null,assignment.id)} className="rounded-lg border bg-white px-3 py-1.5 text-xs font-semibold">관리자 재오픈</button>}</div>
            ) : (
              <div className="flex justify-end gap-2">
                <button name="intent" value="save" className="rounded-lg border px-4 py-2 font-semibold">임시저장</button>
                <button name="intent" value="submit" className="rounded-lg bg-navy-900 px-4 py-2 font-semibold text-white">제출</button>
              </div>
            )}
          </form>
        </Card>
      )}
    </PageShell>
  );
}
