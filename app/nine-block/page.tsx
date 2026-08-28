import { PageShell } from '@/components/ui/PageShell';
import { Card } from '@/components/ui/Card';
import { Notice } from '@/components/hr/Notice';
import { getEvaluationAccess } from '@/lib/evaluation/access';
import { stringParam } from '@/lib/hr/utils';
import { saveNineBlockSettings } from './actions';

type SP = Promise<Record<string, string | string[] | undefined>>;
const LABELS: Record<string,string> = {
  'high-high':'성과 높음 / 역량 높음',
  'middle-high':'성과 중간 / 역량 높음',
  'low-high':'성과 낮음 / 역량 높음',
  'high-middle':'성과 높음 / 역량 중간',
  'middle-middle':'성과 중간 / 역량 중간',
  'low-middle':'성과 낮음 / 역량 중간',
  'high-low':'성과 높음 / 역량 낮음',
  'middle-low':'성과 중간 / 역량 낮음',
  'low-low':'성과 낮음 / 역량 낮음',
};
const GUIDE: Record<string,string> = {
  'high-high':'상위 역할 또는 높은 난도 업무 검토',
  'middle-high':'역량 활용 범위 확대 및 성과기회 설계',
  'low-high':'성과조건·역할정합성 점검',
  'high-middle':'강점 재현과 핵심역량 보완',
  'middle-middle':'구체적 성장과제 설정',
  'low-middle':'업무기준·지원·역할범위 점검',
  'high-low':'성과 재현가능성과 기본역량 보완',
  'middle-low':'핵심역량 학습계획 강화',
  'low-low':'역할 적합성·기본역량·지원계획 종합 점검',
};

export default async function NineBlock({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const { supabase } = await getEvaluationAccess();
  const periodId = stringParam(sp.period);
  const departmentId = stringParam(sp.department);
  const jobLevelId = stringParam(sp.job_level);

  const [{data:periods},{data:departments},{data:jobLevels}] = await Promise.all([
    supabase.from('evaluation_periods').select('id,name').order('start_date',{ascending:false}),
    supabase.from('departments').select('id,name').eq('is_active',true).order('sort_order'),
    supabase.from('job_levels').select('id,name').eq('is_active',true).order('level_order'),
  ]);
  const selectedPeriod = periodId || periods?.[0]?.id || '';
  const { data: settingsRows } = selectedPeriod
    ? await supabase.from('nine_block_settings').select('*').eq('period_id', selectedPeriod).eq('is_active',true).order('created_at',{ascending:false}).limit(1)
    : { data: [] as any[] };
  const settings = settingsRows?.[0] ?? {performance_low_max:2.7,performance_middle_max:3.7,competency_low_max:2.7,competency_middle_max:3.7};

  const { data: rows } = await supabase.rpc('get_nine_block_rows', {
    p_period_id: selectedPeriod || null,
    p_department_id: departmentId || null,
    p_job_level_id: jobLevelId || null,
  });

  const groups = new Map<string, any[]>();
  for (const row of rows ?? []) {
    const key = `${row.performance_band}-${row.competency_band}`;
    groups.set(key,[...(groups.get(key)??[]),row]);
  }

  const grid = [
    ['high-high','middle-high','low-high'],
    ['high-middle','middle-middle','low-middle'],
    ['high-low','middle-low','low-low'],
  ];

  return <PageShell title="9-Block" description="성과 × 역량을 Low/Middle/High로 구분하되 낙인성 명칭 없이 육성 방향을 제시합니다.">
    <Notice success={stringParam(sp.success)} error={stringParam(sp.error)}/>
    <Card><form className="grid gap-3 md:grid-cols-4"><select name="period" defaultValue={selectedPeriod} className="rounded-lg border px-3 py-2">{(periods??[]).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select><select name="department" defaultValue={departmentId} className="rounded-lg border px-3 py-2"><option value="">전체 부서</option>{(departments??[]).map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select><select name="job_level" defaultValue={jobLevelId} className="rounded-lg border px-3 py-2"><option value="">전체 직급</option>{(jobLevels??[]).map(j=><option key={j.id} value={j.id}>{j.name}</option>)}</select><button className="rounded-lg border px-4 py-2 font-semibold">조회</button></form></Card>
    <Card><form action={saveNineBlockSettings} className="grid gap-3 md:grid-cols-5"><input type="hidden" name="period_id" value={selectedPeriod}/><label className="text-xs">성과 Low 상한<input name="performance_low_max" type="number" step="0.1" defaultValue={settings.performance_low_max} className="mt-1 w-full rounded-lg border px-2 py-2"/></label><label className="text-xs">성과 Middle 상한<input name="performance_middle_max" type="number" step="0.1" defaultValue={settings.performance_middle_max} className="mt-1 w-full rounded-lg border px-2 py-2"/></label><label className="text-xs">역량 Low 상한<input name="competency_low_max" type="number" step="0.1" defaultValue={settings.competency_low_max} className="mt-1 w-full rounded-lg border px-2 py-2"/></label><label className="text-xs">역량 Middle 상한<input name="competency_middle_max" type="number" step="0.1" defaultValue={settings.competency_middle_max} className="mt-1 w-full rounded-lg border px-2 py-2"/></label><button className="self-end rounded-lg bg-navy-900 px-4 py-2 font-semibold text-white">기준 저장</button></form></Card>
    <div className="space-y-3">{grid.map((line,i)=><div key={i} className="grid gap-3 md:grid-cols-3">{line.map(key=><Card key={key} className="min-h-48"><div className="text-sm font-bold">{LABELS[key]}</div><div className="mt-1 text-xs text-slate-500">{GUIDE[key]}</div><div className="mt-4 flex flex-wrap gap-2">{(groups.get(key)??[]).map((p:any)=><span key={p.employee_id} title={`성과 ${p.performance_score} / 역량 ${p.competency_score}`} className="rounded-full bg-slate-100 px-2 py-1 text-xs">{p.employee_name}</span>)}</div></Card>)}</div>)}</div>
  </PageShell>
}
