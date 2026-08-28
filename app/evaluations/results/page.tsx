import Link from 'next/link';
import { PageShell } from '@/components/ui/PageShell';
import { Card } from '@/components/ui/Card';
import { Notice } from '@/components/hr/Notice';
import { ResignedBadge } from '@/components/hr/ResignedBadge';
import { getEvaluationAccess } from '@/lib/evaluation/access';
import { stringParam } from '@/lib/hr/utils';
import { finalizeResult,releaseResult } from './actions';

type SP=Promise<Record<string,string|string[]|undefined>>;

export default async function Results({searchParams}:{searchParams:SP}){
  const sp=await searchParams;
  const {supabase,user}=await getEvaluationAccess();
  const canManage=user.roles.some(r=>['hr_admin','super_admin'].includes(r));

  const [{data:assignments},{data:results}]=await Promise.all([
    supabase.from('evaluation_assignments').select('id,employee_id,period_id,status,subject_is_resigned,subject_resignation_date').order('assigned_at',{ascending:false}),
    supabase.from('evaluation_results').select('*'),
  ]);

  const empIds=[...new Set((assignments??[]).map(a=>a.employee_id))];
  const periodIds=[...new Set((assignments??[]).map(a=>a.period_id))];

  const [{data:employees},{data:periods}]=await Promise.all([
    empIds.length
      ? supabase.from('employees').select('id,name,employee_no,employment_status,resignation_date').in('id',empIds)
      : Promise.resolve({data:[] as any[]}),
    periodIds.length
      ? supabase.from('evaluation_periods').select('id,name').in('id',periodIds)
      : Promise.resolve({data:[] as any[]}),
  ]);

  const em=new Map((employees??[]).map(e=>[e.id,e]));
  const pm=new Map((periods??[]).map(p=>[p.id,p.name]));
  const rm=new Map((results??[]).map(r=>[r.assignment_id,r]));

  return (
    <PageShell title="평가결과" description="퇴사자의 과거 평가결과는 보존하고 퇴사자 상태를 별도로 표시합니다.">
      <Notice success={stringParam(sp.success)} error={stringParam(sp.error)}/>
      <div className="grid gap-3">
        {(assignments??[]).map(a=>{
          const r=rm.get(a.id);
          const e=em.get(a.employee_id);

          return (
            <Card key={a.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <b>{e?.employee_no} · {e?.name}</b>
                    <ResignedBadge
                      status={a.subject_is_resigned ? 'resigned' : e?.employment_status}
                      resignationDate={a.subject_resignation_date ?? e?.resignation_date}
                    />
                  </div>
                  <div className="mt-1 text-xs text-slate-500">{pm.get(a.period_id)} · {a.status}</div>
                </div>

                <div className="flex items-center gap-3">
                  {r&&<div className="text-right"><div className="text-2xl font-black">{r.total_score??'-'}</div><div className="text-xs">{r.is_released?'공개됨':'비공개'}</div></div>}
                  {canManage&&<form action={finalizeResult.bind(null,a.id)}><button className="rounded-lg border px-3 py-2 text-sm font-semibold">{r?'재계산':'결과 생성'}</button></form>}
                  {r&&<Link href={`/evaluations/results/${r.id}`} className="rounded-lg bg-navy-900 px-3 py-2 text-sm font-semibold text-white">상세</Link>}
                  {canManage&&r&&!r.is_released&&<form action={releaseResult.bind(null,r.id)}><button className="rounded-lg border border-emerald-200 px-3 py-2 text-sm font-semibold text-emerald-700">공개</button></form>}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </PageShell>
  );
}
