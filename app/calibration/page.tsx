import { PageShell } from '@/components/ui/PageShell';
import { Card } from '@/components/ui/Card';
import { Notice } from '@/components/hr/Notice';
import { getEvaluationAccess } from '@/lib/evaluation/access';
import { stringParam } from '@/lib/hr/utils';
import { applyCalibration } from './actions';

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function CalibrationPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const { supabase } = await getEvaluationAccess();

  const periodId = stringParam(sp.period);
  const [{ data: periods }, { data: anomalies }, { data: evaluatorStats }, { data: logs }] = await Promise.all([
    supabase.from('evaluation_periods').select('id,name,status,calibration_round').order('start_date', { ascending: false }),
    supabase.from('calibration_anomalies_v').select('*').limit(200),
    supabase.from('evaluator_score_stats_v').select('*').limit(100),
    supabase.from('calibration_logs').select('*').order('created_at', { ascending: false }).limit(50),
  ]);

  const filtered = periodId ? (anomalies ?? []).filter((x: any) => x.period_id === periodId) : (anomalies ?? []);

  return (
    <PageShell title="Calibration" description="평가자·부서·직급별 분포와 이상 가능성을 확인하고, 자동 변경 없이 근거를 남겨 조정합니다.">
      <Notice success={stringParam(sp.success)} error={stringParam(sp.error)} />

      <Card>
        <form className="flex flex-wrap items-end gap-3">
          <label className="text-sm font-semibold">
            평가기간
            <select name="period" defaultValue={periodId} className="ml-3 rounded-lg border px-3 py-2">
              <option value="">전체</option>
              {(periods ?? []).map((p: any) => <option key={p.id} value={p.id}>{p.name}{p.calibration_round ? ` · ${p.calibration_round}차` : ''}</option>)}
            </select>
          </label>
          <button className="rounded-lg border px-4 py-2 font-semibold">조회</button>
        </form>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><div className="text-xs text-slate-500">이상 후보</div><div className="mt-2 text-2xl font-black">{filtered.length}</div></Card>
        <Card><div className="text-xs text-slate-500">근거 없는 극단점수</div><div className="mt-2 text-2xl font-black">{filtered.filter((x:any)=>x.rule_code==='EXTREME_NO_EVIDENCE').length}</div></Card>
        <Card><div className="text-xs text-slate-500">평가자 평균 편차</div><div className="mt-2 text-2xl font-black">{(evaluatorStats ?? []).filter((x:any)=>Math.abs(Number(x.delta_from_global ?? 0))>=0.5).length}</div></Card>
        <Card><div className="text-xs text-slate-500">최근 변경이력</div><div className="mt-2 text-2xl font-black">{(logs ?? []).length}</div></Card>
      </div>

      <Card>
        <h2 className="font-bold">평가자별 평균 / 편차</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-slate-500"><th className="py-2">평가자</th><th>평균</th><th>전체 평균 대비</th><th>1점%</th><th>5점%</th><th>응답수</th></tr></thead>
            <tbody>{(evaluatorStats ?? []).map((x:any)=><tr key={x.evaluator_id} className="border-t"><td className="py-2">{x.evaluator_name}</td><td>{Number(x.avg_score).toFixed(2)}</td><td>{Number(x.delta_from_global).toFixed(2)}</td><td>{x.one_ratio}%</td><td>{x.five_ratio}%</td><td>{x.response_count}</td></tr>)}</tbody>
          </table>
        </div>
      </Card>

      <div className="space-y-3">
        {filtered.map((x:any)=>(
          <Card key={`${x.response_id}-${x.rule_code}`}>
            <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
              <div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-amber-50 px-2 py-1 font-semibold text-amber-800">{x.rule_label}</span>
                  <span>{x.period_name}</span><span>{x.employee_name}</span><span>{x.evaluator_name}</span>
                </div>
                <div className="mt-3"><b>{x.question_title}</b></div>
                <div className="mt-1 text-sm">현재점수 <b className="text-xl">{x.score}</b></div>
                <div className="mt-2 text-xs text-slate-500">평가근거: {x.evidence_note || x.comment || '없음'}</div>
              </div>
              <form action={applyCalibration.bind(null,x.response_id)} className="grid gap-2 md:grid-cols-[120px_1fr_auto]">
                <input name="new_score" type="number" min="1" max="5" step="0.5" defaultValue={x.score} className="rounded-lg border px-3 py-2"/>
                <input name="reason" required placeholder="변경사유" className="rounded-lg border px-3 py-2"/>
                <button className="rounded-lg bg-navy-900 px-4 py-2 text-sm font-semibold text-white">변경</button>
              </form>
            </div>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}
