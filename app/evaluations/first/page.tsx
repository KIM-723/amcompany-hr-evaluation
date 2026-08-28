import Link from 'next/link';
import { PageShell } from '@/components/ui/PageShell';
import { Card } from '@/components/ui/Card';
import { Notice } from '@/components/hr/Notice';
import { ResignedBadge } from '@/components/hr/ResignedBadge';
import { getEvaluationAccess } from '@/lib/evaluation/access';
import { stringParam } from '@/lib/hr/utils';
import { startFirstEvaluation } from './actions';

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function FirstEvaluations({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const { supabase } = await getEvaluationAccess();

  const { data: assignments, error } = await supabase
    .from('evaluation_assignments')
    .select('id,period_id,employee_id,status,first_evaluator_id,subject_is_resigned,subject_resignation_date')
    .order('assigned_at', { ascending:false });

  const ids = [...new Set((assignments ?? []).flatMap(a => [a.employee_id,a.first_evaluator_id].filter(Boolean)))];
  const periodIds = [...new Set((assignments ?? []).map(a=>a.period_id))];

  const [{data: employees},{data: periods},{data: evals}] = await Promise.all([
    ids.length
      ? supabase.from('employees').select('id,name,employee_no,employment_status,resignation_date').in('id',ids)
      : Promise.resolve({data:[] as any[]}),
    periodIds.length
      ? supabase.from('evaluation_periods').select('id,name').in('id',periodIds)
      : Promise.resolve({data:[] as any[]}),
    supabase.from('evaluations').select('assignment_id,id,status,total_score').eq('stage','first'),
  ]);

  const em = new Map((employees??[]).map(x=>[x.id,x]));
  const pm = new Map((periods??[]).map(x=>[x.id,x.name]));
  const evm = new Map((evals??[]).map(x=>[x.assignment_id,x]));

  return (
    <PageShell title="1차 평가" description="퇴사자의 기존 평가데이터는 유지하되 별도 퇴사자 표시로 구분합니다.">
      <Notice success={stringParam(sp.success)} error={stringParam(sp.error)||error?.message}/>
      <div className="grid gap-3">
        {(assignments??[]).map(a=>{
          const ev=evm.get(a.id);
          const employee=em.get(a.employee_id);
          return (
            <Card key={a.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <b>{employee?.employee_no} · {employee?.name}</b>
                    <ResignedBadge
                      status={a.subject_is_resigned ? 'resigned' : employee?.employment_status}
                      resignationDate={a.subject_resignation_date ?? employee?.resignation_date}
                    />
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {pm.get(a.period_id)} · 1차 평가자 {em.get(a.first_evaluator_id)?.name ?? '미지정'} · {ev?.status ?? a.status}
                  </div>
                </div>
                {ev ? (
                  <Link href={`/evaluations/first/${a.id}`} className="rounded-lg bg-navy-900 px-4 py-2 text-sm font-semibold text-white">평가 열기</Link>
                ) : (
                  <form action={startFirstEvaluation.bind(null,a.id)}>
                    <button className="rounded-lg bg-navy-900 px-4 py-2 text-sm font-semibold text-white">평가 시작</button>
                  </form>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </PageShell>
  );
}
