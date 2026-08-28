import Link from 'next/link';
import { PageShell } from '@/components/ui/PageShell';
import { Card } from '@/components/ui/Card';
import { ResignedBadge } from '@/components/hr/ResignedBadge';
import { getEvaluationAccess } from '@/lib/evaluation/access';

export default async function SecondReview(){
  const {supabase}=await getEvaluationAccess();

  const {data:evals}=await supabase
    .from('evaluations')
    .select('id,assignment_id,status,total_score,subject_is_resigned,subject_resignation_date')
    .eq('stage','first')
    .in('status',['submitted','approved','revision_requested','calibration_required'])
    .order('submitted_at',{ascending:false});

  const assignmentIds=[...new Set((evals??[]).map(e=>e.assignment_id))];
  const {data:assignments}=assignmentIds.length
    ? await supabase.from('evaluation_assignments').select('id,employee_id,period_id').in('id',assignmentIds)
    : {data:[] as any[]};

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

  const am=new Map((assignments??[]).map(a=>[a.id,a]));
  const em=new Map((employees??[]).map(e=>[e.id,e]));
  const pm=new Map((periods??[]).map(p=>[p.id,p.name]));

  return (
    <PageShell title="2차 평가 Review" description="퇴사자는 기존 Review 데이터를 유지하면서 퇴사자 상태를 별도로 표시합니다.">
      <div className="grid gap-3">
        {(evals??[]).map(ev=>{
          const a=am.get(ev.assignment_id);
          const e=a?em.get(a.employee_id):null;
          return (
            <Card key={ev.id}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <b>{e?.employee_no} · {e?.name}</b>
                    <ResignedBadge
                      status={ev.subject_is_resigned ? 'resigned' : e?.employment_status}
                      resignationDate={ev.subject_resignation_date ?? e?.resignation_date}
                    />
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {a?pm.get(a.period_id):'-'} · 1차점수 {ev.total_score??'-'} · {ev.status}
                  </div>
                </div>
                <Link href={`/evaluations/second/${ev.assignment_id}`} className="rounded-lg bg-navy-900 px-4 py-2 text-sm font-semibold text-white">Review</Link>
              </div>
            </Card>
          );
        })}
      </div>
    </PageShell>
  );
}
