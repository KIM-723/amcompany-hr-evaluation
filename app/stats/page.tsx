import { PageShell } from '@/components/ui/PageShell';
import { Card } from '@/components/ui/Card';
import { getEvaluationAccess } from '@/lib/evaluation/access';

export default async function StatsPage() {
  const { supabase } = await getEvaluationAccess();
  const [{data:results},{data:assignments},{data:departments},{data:employees},{data:jobLevels}] = await Promise.all([
    supabase.from('evaluation_results').select('assignment_id,performance_score,competency_score,attitude_score,total_score'),
    supabase.from('evaluation_assignments').select('id,employee_id,period_id'),
    supabase.from('departments').select('id,name'),
    supabase.from('employees').select('id,department_id,job_level_id'),
    supabase.from('job_levels').select('id,name'),
  ]);
  const am=new Map<string, any>((assignments??[]).map((a:any)=>[a.id,a]));const em=new Map<string, any>((employees??[]).map((e:any)=>[e.id,e]));const dm=new Map<string, string>((departments??[]).map((d:any)=>[d.id,d.name]));const jm=new Map<string, string>((jobLevels??[]).map((j:any)=>[j.id,j.name]));
  const deptAgg=new Map<string,number[]>();const levelAgg=new Map<string,number[]>();
  for(const r of results??[]){const a=am.get(r.assignment_id);const e=a?em.get(a.employee_id):null;if(!e||r.total_score==null)continue;const dn=dm.get(e.department_id)??'미지정';const jn=jm.get(e.job_level_id)??'미지정';deptAgg.set(dn,[...(deptAgg.get(dn)??[]),Number(r.total_score)]);levelAgg.set(jn,[...(levelAgg.get(jn)??[]),Number(r.total_score)])}
  const rows=(m:Map<string,number[]>)=>[...m.entries()].map(([name,v])=>({name,avg:v.reduce((a,b)=>a+b,0)/v.length,count:v.length})).sort((a,b)=>b.avg-a.avg);
  return <PageShell title="통계" description="부서·직급별 평가 평균과 분포를 실제 확정결과 기준으로 확인합니다.">
    <div className="grid gap-5 lg:grid-cols-2"><Card><h2 className="font-bold">부서별 종합평균</h2><div className="mt-4 space-y-3">{rows(deptAgg).map(x=><div key={x.name}><div className="flex justify-between text-sm"><span>{x.name} ({x.count}명)</span><b>{x.avg.toFixed(2)}</b></div><div className="mt-1 h-2 rounded bg-slate-100"><div className="h-2 rounded bg-blue-600" style={{width:`${Math.min(100,x.avg*20)}%`}}/></div></div>)}</div></Card>
    <Card><h2 className="font-bold">직급별 종합평균</h2><div className="mt-4 space-y-3">{rows(levelAgg).map(x=><div key={x.name}><div className="flex justify-between text-sm"><span>{x.name} ({x.count}명)</span><b>{x.avg.toFixed(2)}</b></div><div className="mt-1 h-2 rounded bg-slate-100"><div className="h-2 rounded bg-navy-800" style={{width:`${Math.min(100,x.avg*20)}%`}}/></div></div>)}</div></Card></div>
  </PageShell>
}
