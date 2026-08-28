import Link from 'next/link';
import {Card} from '@/components/ui/Card';
import {getEvaluationAccess} from '@/lib/evaluation/access';

export default async function Dashboard(){
 const {supabase}=await getEvaluationAccess();
 const {data:periods}=await supabase.from('evaluation_periods').select('*').order('start_date',{ascending:false}).limit(1);
 const period=periods?.[0]??null;
 const periodId=period?.id;
 const {data:assignments}=periodId?await supabase.from('evaluation_assignments').select('id,employee_id,status').eq('period_id',periodId):{data:[] as any[]};
 const assignmentIds=(assignments??[]).map(a=>a.id);
 const [{data:selfs},{data:firstEvals},{data:results},{data:employees},{data:anomalies}]=await Promise.all([
  assignmentIds.length?supabase.from('self_evaluations').select('assignment_id,status').in('assignment_id',assignmentIds):Promise.resolve({data:[] as any[]}),
  assignmentIds.length?supabase.from('evaluations').select('assignment_id,status').in('assignment_id',assignmentIds).eq('stage','first'):Promise.resolve({data:[] as any[]}),
  assignmentIds.length?supabase.from('evaluation_results').select('assignment_id,performance_score,competency_score,core_value_scores').in('assignment_id',assignmentIds):Promise.resolve({data:[] as any[]}),
  supabase.from('employees').select('id,department_id'),
  periodId?supabase.from('calibration_anomalies_v').select('response_id').eq('period_id',periodId):Promise.resolve({data:[] as any[]}),
 ]);
 const total=(assignments??[]).length;const selfDone=(selfs??[]).filter(x=>x.status==='submitted').length;const firstDone=(firstEvals??[]).filter(x=>['submitted','approved','finalized'].includes(x.status)).length;const finalDone=(results??[]).length;
 const pct=(n:number)=>total?Math.round(n/total*1000)/10:0;
 const coreNames=['성장','신뢰','전문성','감각']; const coreAvg=Object.fromEntries(coreNames.map(n=>[n,0])); for(const n of coreNames){const vals=(results??[]).map((r:any)=>Number(r.core_value_scores?.[n]??0)).filter(v=>v>0);coreAvg[n]=vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:0}
 return <div className="space-y-6"><div className="flex flex-wrap justify-between gap-3"><div><h1 className="text-2xl font-bold">Dashboard</h1><p className="mt-1 text-sm text-slate-500">{period?.name??'활성 평가기간 없음'} 진행현황과 조직 진단상태를 확인합니다.</p></div><Link href="/api/export/evaluations" className="rounded-lg border bg-white px-4 py-2 text-sm font-semibold">Excel 다운로드</Link></div>
 <div className="grid gap-4 md:grid-cols-5">{[['전체 평가대상자',total,100],['자기평가 완료',selfDone,pct(selfDone)],['1차 평가 완료',firstDone,pct(firstDone)],['최종 확정',finalDone,pct(finalDone)],['Calibration 이상후보',(anomalies??[]).length,total?Math.round((anomalies??[]).length/total*1000)/10:0]].map(([a,b,c])=><Card key={String(a)}><div className="text-sm text-slate-500">{a}</div><div className="mt-3 text-2xl font-black">{b}</div><div className="mt-1 text-xs font-semibold text-blue-600">{c}%</div></Card>)}</div>
 <div className="grid gap-6 lg:grid-cols-2"><Card><h2 className="font-bold">핵심가치 평균</h2>{coreNames.map(n=><div key={n} className="mt-5"><div className="flex justify-between text-sm"><span>{n}</span><b>{Number(coreAvg[n]).toFixed(2)}</b></div><div className="mt-2 h-2 rounded bg-slate-100"><div className="h-2 rounded bg-navy-800" style={{width:`${Math.min(100,Number(coreAvg[n])*20)}%`}}/></div></div>)}</Card><Card><h2 className="font-bold">이번 평가 운영 일정</h2>{period?<div className="mt-4 space-y-3 text-sm"><div>자기평가 <b className="float-right">{period.self_start_date??'-'} ~ {period.self_end_date??'-'}</b></div><div>1차 평가 <b className="float-right">{period.first_start_date??'-'} ~ {period.first_end_date??'-'}</b></div><div>2차 검토 <b className="float-right">{period.second_start_date??'-'} ~ {period.second_end_date??'-'}</b></div><div>Calibration <b className="float-right">{period.calibration_start_date??'-'} ~ {period.calibration_end_date??'-'}</b></div></div>:<p className="mt-4 text-sm text-slate-500">평가기간을 생성해주세요.</p>}</Card></div>
 </div>
}
