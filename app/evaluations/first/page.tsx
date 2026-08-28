import Link from 'next/link';
import { PageShell } from '@/components/ui/PageShell';
import { Card } from '@/components/ui/Card';
import { Notice } from '@/components/hr/Notice';
import { getEvaluationAccess } from '@/lib/evaluation/access';
import { stringParam } from '@/lib/hr/utils';
import { startFirstEvaluation } from './actions';

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function FirstEvaluations({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const { supabase } = await getEvaluationAccess();
  const { data: assignments, error } = await supabase.from('evaluation_assignments').select('id,period_id,employee_id,status,first_evaluator_id').order('assigned_at', { ascending:false });
  const ids = [...new Set((assignments ?? []).flatMap(a => [a.employee_id,a.first_evaluator_id].filter(Boolean)))];
  const periodIds = [...new Set((assignments ?? []).map(a=>a.period_id))];
  const [{data: employees},{data: periods},{data: evals}] = await Promise.all([
    ids.length ? supabase.from('employees').select('id,name,employee_no').in('id',ids) : Promise.resolve({data:[] as any[]}),
    periodIds.length ? supabase.from('evaluation_periods').select('id,name').in('id',periodIds) : Promise.resolve({data:[] as any[]}),
    supabase.from('evaluations').select('assignment_id,id,status,total_score').eq('stage','first'),
  ]);
  const em=new Map<string, any>((employees??[]).map((x:any)=>[x.id,x]));
  const pm=new Map<string, string>((periods??[]).map((x:any)=>[x.id,x.name]));
  const evm=new Map<string, any>((evals??[]).map((x:any)=>[x.assignment_id,x]));

  return <PageShell title="1차 평가" description="성과 → 역량 → 태도&습관 → 핵심가치 → 종합의견 순으로 근거기반 평가를 진행합니다.">
    <Notice success={stringParam(sp.success)} error={stringParam(sp.error)||error?.message}/>
    <div className="grid gap-3">
      {(assignments??[]).map(a=>{
        const ev=evm.get(a.id);
        return <Card key={a.id}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><b>{em.get(a.employee_id)?.employee_no} · {em.get(a.employee_id)?.name}</b><div className="mt-1 text-xs text-slate-500">{pm.get(a.period_id)} · 1차 평가자 {em.get(a.first_evaluator_id)?.name ?? '미지정'} · {ev?.status ?? a.status}</div></div>
            {ev ? <Link href={`/evaluations/first/${a.id}`} className="rounded-lg bg-navy-900 px-4 py-2 text-sm font-semibold text-white">평가 열기</Link>
              : <form action={startFirstEvaluation.bind(null,a.id)}><button className="rounded-lg bg-navy-900 px-4 py-2 text-sm font-semibold text-white">평가 시작</button></form>}
          </div>
        </Card>
      })}
    </div>
  </PageShell>
}
